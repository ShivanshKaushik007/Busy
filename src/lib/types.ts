// Enums that match our database schema
export type UserRole = 'manager' | 'member';
export type TaskStatus = 'Backlog' | 'In Progress' | 'In Review' | 'Done';
export type TaskPriority = 'Low' | 'Medium' | 'High' | 'Urgent';

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  created_at: string;
}

export interface Project {
  id: string;
  key: string;
  name: string;
  description: string | null;
  owner_id: string | null;
  is_archived: boolean;
  created_at: string;
}

export interface Task {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  is_blocked: boolean;
  created_at: string;
  updated_at: string;
}

export interface TaskHistory {
  id: string;
  task_id: string;
  actor_id: string | null;
  action_type: string;
  old_value: string | null;
  new_value: string | null;
  created_at: string;
}
