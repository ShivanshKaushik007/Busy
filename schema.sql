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

-- Note: RLS (Row Level Security) and triggers to enforce rules are needed next.
