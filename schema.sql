-- Enable the UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enum for User Roles
CREATE TYPE user_role AS ENUM ('manager', 'member');

-- Enum for Task Status
CREATE TYPE task_status AS ENUM ('Backlog', 'In Progress', 'In Review', 'Done');

-- Enum for Task Priority
CREATE TYPE task_priority AS ENUM ('Low', 'Medium', 'High', 'Urgent');

-- USERS TABLE
-- Maps to Supabase auth.users, holds extra profile info and role
CREATE TABLE profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    role user_role DEFAULT 'member' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- PROJECTS TABLE
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR(10) UNIQUE NOT NULL, -- e.g., 'PRJ-1'
    name TEXT NOT NULL,
    description TEXT,
    owner_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    is_archived BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- PROJECT MEMBERS TABLE
-- Many-to-many relationship mapping users to projects they belong to
CREATE TABLE project_members (
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (project_id, user_id)
);

-- TASKS TABLE
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    status task_status DEFAULT 'Backlog' NOT NULL,
    priority task_priority DEFAULT 'Medium' NOT NULL,
    due_date TIMESTAMP WITH TIME ZONE,
    is_blocked BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- TASK ASSIGNMENTS TABLE
-- Maps tasks to assigned users (who must be in the project)
CREATE TABLE task_assignments (
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (task_id, user_id)
);

-- TASK DEPENDENCIES (BLOCKING TASKS) TABLE
-- A task can block multiple tasks, and a task can be blocked by multiple tasks.
CREATE TABLE task_dependencies (
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,           -- The task that is blocked
    blocks_task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,    -- The task that it is blocking
    PRIMARY KEY (task_id, blocks_task_id)
);

-- TASK HISTORY (TIMELINE) TABLE
-- Immutable log of changes and comments
CREATE TABLE task_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
    actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL, -- The user who made the change
    action_type TEXT NOT NULL, -- e.g., 'status_change', 'assignment', 'comment', 'field_update'
    old_value TEXT, -- JSON or string of old state
    new_value TEXT, -- JSON or string of new state / comment text
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS (Row Level Security) and triggers to enforce rules are needed next.

-- TRIGGER FOR NEW USERS
-- This automatically creates a profile row whenever a user signs up via Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  assigned_role public.user_role;
  user_full_name text;
BEGIN
  -- Determine role safely
  IF (new.raw_user_meta_data->>'role') = 'manager' THEN
    assigned_role := 'manager'::public.user_role;
  ELSE
    assigned_role := 'member'::public.user_role;
  END IF;

  -- Determine full name safely
  user_full_name := COALESCE(
    new.raw_user_meta_data->>'full_name', 
    split_part(new.email, '@', 1)
  );

  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (new.id, new.email, user_full_name, assigned_role)
  ON CONFLICT (id) DO UPDATE SET
    role = EXCLUDED.role,
    full_name = EXCLUDED.full_name;

  RETURN new;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error in handle_new_user trigger: %', SQLERRM;
    RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- DISMISSED ALERTS TABLE
-- Tracks which overdue task alerts a user has dismissed.
-- By storing the dismissed_due_date, the alert automatically comes back if the due date changes!
CREATE TABLE dismissed_alerts (
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    dismissed_due_date TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (user_id, task_id)
);

-- ==========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Enforces Requirement 1 on the database server:
-- "Managers can create and archive projects, change who is on a project, and delete tasks.
--  Members can do neither, and only see projects they belong to.
--  The difference must be enforced on the server, not just hidden in the interface."
-- ==========================================

-- Helper function to check if current authenticated user is a manager
CREATE OR REPLACE FUNCTION public.is_manager()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'manager'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE dismissed_alerts ENABLE ROW LEVEL SECURITY;

-- 1. Profiles Policies
CREATE POLICY "Profiles are viewable by authenticated users" 
  ON profiles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can update their own profile" 
  ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- 2. Projects Policies
-- Managers can view all projects. Members only view active projects they belong to.
CREATE POLICY "Projects viewable by managers or assigned members"
  ON projects FOR SELECT TO authenticated
  USING (
    public.is_manager() 
    OR (
      is_archived = false 
      AND id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid())
    )
  );

-- Only managers can create projects
CREATE POLICY "Managers can insert projects"
  ON projects FOR INSERT TO authenticated
  WITH CHECK (public.is_manager());

-- Only managers can update projects (including archive/restore)
CREATE POLICY "Managers can update projects"
  ON projects FOR UPDATE TO authenticated
  USING (public.is_manager());

-- 3. Project Members Policies
-- Must NOT query project_members inside project_members policy to avoid infinite recursion!
CREATE POLICY "Project members viewable by authenticated"
  ON project_members FOR SELECT TO authenticated
  USING (true);

-- Only managers can add or remove project members
CREATE POLICY "Managers can insert project members"
  ON project_members FOR INSERT TO authenticated
  WITH CHECK (public.is_manager());

CREATE POLICY "Managers can delete project members"
  ON project_members FOR DELETE TO authenticated
  USING (public.is_manager());

-- 4. Tasks Policies
-- Tasks are only viewable if user has access to the project
CREATE POLICY "Tasks viewable by project access"
  ON tasks FOR SELECT TO authenticated
  USING (
    public.is_manager()
    OR project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Tasks insertable by project members or managers"
  ON tasks FOR INSERT TO authenticated
  WITH CHECK (
    public.is_manager()
    OR project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Tasks updatable by project members or managers"
  ON tasks FOR UPDATE TO authenticated
  USING (
    public.is_manager()
    OR project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid())
  );

-- STRICT RULE: Only managers can delete tasks!
CREATE POLICY "Only managers can delete tasks"
  ON tasks FOR DELETE TO authenticated
  USING (public.is_manager());

-- 5. Task History Policies (Requirement 9: Immutable timeline)
CREATE POLICY "Task history viewable by project access"
  ON task_history FOR SELECT TO authenticated
  USING (
    public.is_manager()
    OR task_id IN (
      SELECT t.id FROM tasks t 
      JOIN project_members pm ON t.project_id = pm.project_id 
      WHERE pm.user_id = auth.uid()
    )
  );

CREATE POLICY "Task history insertable by authenticated users"
  ON task_history FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = actor_id);

-- Explicitly NO UPDATE OR DELETE policies for task_history, ensuring it cannot be rewritten!

-- 6. Task Assignments & Dependencies Policies
CREATE POLICY "Task assignments viewable by authenticated"
  ON task_assignments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Task assignments manageable by authenticated"
  ON task_assignments FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Task dependencies viewable by authenticated"
  ON task_dependencies FOR SELECT TO authenticated USING (true);
CREATE POLICY "Task dependencies manageable by authenticated"
  ON task_dependencies FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 7. Dismissed Alerts Policies
CREATE POLICY "Users can manage their own dismissed alerts"
  ON dismissed_alerts FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);



