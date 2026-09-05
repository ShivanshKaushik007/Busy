# AI Prompts & Iteration Log — Busy

This document records the prompts used during the development of **Busy**, organized chronologically by what was being built. It shows how the project took shape through iterative prompting, along with what the AI generated, what went wrong, and how it was fixed.

---

## 1. Project Setup & Database Schema

### Prompt 1.1: Initial schema design
> *"I need to design the PostgreSQL schema for Busy in Supabase. We need profiles mapped to auth.users with manager and member roles, projects with unique keys, project_members, tasks with status and priority enums, task_assignments, task_dependencies for blockers, and an immutable task_history table. Can you write the `schema.sql` with proper foreign keys and a trigger for new signups?"*

- **What the AI gave**: A solid initial `schema.sql` script creating the ENUMs, 8 tables, and the `handle_new_user()` trigger on `auth.users`.
- **What I adjusted**: Cleaned up the cascading rules. I made sure `ON DELETE CASCADE` was explicitly added on `task_assignments` and `task_dependencies` so deleting a task or project wouldn't leave orphan references behind.

---

### Prompt 1.2: Row Level Security (RLS) policies
> *"Now write the RLS policies for Supabase. Managers need full access to create/archive projects and delete tasks. Members should only see active projects they belong to, and cannot delete tasks. Also, task_history should be insert-only—no updates or deletes allowed so history cannot be rewritten."*

- **What went wrong**: When I ran the generated SQL in Supabase, queries on `project_members` crashed with an infinite recursion error (`PostgreSQL 54001: active RLS recursion limit exceeded`). The AI had written a policy that queried `project_members` from inside `project_members`.
- **How I fixed it**: I prompted back:
  > *"The policy on `project_members` is causing an infinite recursion loop in Supabase because it's querying itself in a subquery. How do we rewrite this so it doesn't loop?"*
  The AI simplified the `project_members` policy to allow authenticated reads, while keeping the strict tenant isolation on the `projects` and `tasks` policies where it actually mattered.

---

## 2. Core Business Logic & Task Lifecycle

### Prompt 2.1: Task status transitions & blocker checks
> *"Let's write `updateTaskStatus` in `taskActions.ts` as a Next.js server action. The task must follow Backlog -> In Progress -> In Review -> Done, and reopening from Done goes to Backlog or In Progress. Also check if the task is blocked—if it has any blocking tasks in `task_dependencies` that are not 'Done', reject the move to Done and return the blocker titles."*

- **What the AI gave**: The server action with status check logic, dependency check queries, and logging into `task_history`.
- **What I adjusted**: The AI initially allowed jumping from Backlog straight to Done if there were no blockers. I added an explicit `checkLegalTransition` helper function to reject any invalid jump (like `Backlog -> Done`) with a clear error message explaining allowed moves.

---

### Prompt 2.2: Bulk updates with per-task error reporting
> *"I need to implement bulk actions in `bulkActions.ts` for updating status, assignees, or due dates on multiple tasks. Requirement 7 says if some tasks in the batch have illegal moves or unresolved blockers, it shouldn't fail the whole batch—it needs to report per task what succeeded and what was rejected. How should we build this?"*

- **What the AI gave**: A loop iterating through the selected task IDs, running each through the individual validation logic, and collecting `{ taskId, success, error }` results into an array.
- **What I adjusted**: Added `revalidatePath('/tasks')` at the end of the batch run so the UI updates in a single refresh instead of revalidating after every single task in the loop.

---

## 3. Search, Server-Side Filtering & The Major Reversal

### Prompt 3.1: Building the task list (Initial flawed attempt)
> *"Create a task table component with search, project filter, status filter, priority filter, and pagination."*

- **What went wrong (Major Flaw)**: The AI generated a client component (`TaskListClient.tsx`) that fetched all tasks once and used JavaScript `.filter()` in the browser to do search, filtering, and page slicing.
- **Why it was rejected**: Requirement 6 explicitly states: *"All of this must be done by the server — do not load every task into the browser and filter there."* Client-side filtering violated this rule, leaked tasks into browser memory, and would lag with lots of data.

---

### Prompt 3.2: Reversing to 100% server-side filtering
> *"Wait, your implementation filters everything in the browser. The guidelines strictly say in Requirement 6: 'All of this must be done by the server — do not load every task into the browser and filter there.' Let's rewrite `tasks/page.tsx` as a server component that reads `searchParams` and runs `ILIKE` search, filters, and `.range()` pagination directly in Supabase. Then update the URL when the user changes filters."*

- **What the AI gave**: Refactored `TasksPage` to read `searchParams`, construct the Supabase query with `.ilike()`, `.eq()`, `.order()`, and `.range(from, to)`, and pass only the 10 filtered items plus total count to the client.
- **What I adjusted**: Added a small debounce to the search input so it doesn't push a new URL on every single keystroke.

---

## 4. UI Overhaul & Kanban Board

### Prompt 4.1: Jira-style theme and components
> *"I want the UI to feel like Atlassian Jira instead of a basic admin template. Can we restyle the app with Jira colors (deep blue nav #0747A6, light gray background #FAFBFC), compact status lozenges (blue for in progress, yellow for in review, green for done, red for blocked), and clean cards?"*

- **What the AI gave**: Updated `globals.css` with Jira tokens, created `BusyTopNav`, `BusySidebar`, `BusyLozenge`, and `BusyAvatar`.
- **What I adjusted**: Fixed contrast on the lozenges so the text is easily readable on both light and dark backgrounds.

---

### Prompt 4.2: Drag-and-drop Kanban board
> *"Let's build a drag-and-drop board view at `/board` like Jira. Columns should be Backlog, In Progress, In Review, and Done. When a user drags a card to another column, it should call `updateTaskStatus`. If the move is illegal or has an unfinished blocker, snap the card back and show a toast error."*

- **What the AI gave**: An interactive board using HTML5 drag-and-drop and Framer Motion with optimistic card movement and error rollback.
- **What I adjusted**: Added blocker badges and priority icons on the cards so users can see why a task is blocked before trying to move it.

---

## 5. Overdue Alerts & Stretch Features

### Prompt 5.1: Overdue alerts without background workers
> *"How should we build the overdue task alerts? Requirement 10 says assignees can dismiss an alert, but if the task's due date is changed later, the alert must come back. Can we do this without a background cron job?"*

- **What the AI gave**: A clever snapshot approach using a `dismissed_alerts` table storing `(user_id, task_id, dismissed_due_date)`. When fetching alerts, the query checks if the task's current `due_date` matches `dismissed_due_date`. If someone edits the due date later, they don't match anymore, so the alert automatically resurfaces.
- **What I adjusted**: Wired the alert count badge directly into the top navigation bell icon so it stays updated across all pages.

---

### Prompt 5.2: Dependency cycle detection (DFS)
> *"For stretch goal 2, how can we detect cycles across task dependency chains beyond just 1-to-1? For example, if A blocks B, B blocks C, and someone tries to make C block A, it should be rejected. Let's write a cycle detection utility in `dependencyGraphUtils.ts` that uses DFS and returns the exact cycle path like 'A -> B -> C -> A'."*

- **What the AI gave**: A graph utility with `wouldCreateCycle` that builds an adjacency list and runs Depth-First Search with a recursion stack.
- **What I adjusted**: Added a check to immediately reject self-blocking (`taskId === blockerTaskId`) before running the graph traversal, saving an unnecessary query.

---

### Prompt 5.3: Time tracking with immutable history
> *"I want to implement time tracking (stretch goal 3) where users can log time like '2h 30m' or '45m' and see a progress bar. But requirement 9 says history cannot be rewritten. Can we store the worklogs directly in `task_history` with an action_type of 'worklog' so we don't need a separate mutable table?"*

- **What the AI gave**: Created `timeTrackingUtils.ts` to parse natural language strings, `logTaskWork` server action appending entries to `task_history`, and `TimeTrackingProgress.tsx` to render the progress meter.
- **What I adjusted**: Added an auto-decrement option so logging work automatically reduces the remaining estimate unless the user explicitly chooses to leave it unchanged.

---

### Prompt 5.4: Keyboard shortcuts
> *"Let's add Jira keyboard shortcuts: g+d for dashboard, g+t for tasks, g+b for board, c for create task dialog, and ? for a shortcuts help modal. Make sure typing inside inputs or textareas doesn't accidentally trigger the shortcuts."*

- **What the AI gave**: `KeyboardShortcutsProvider.tsx` with a global keydown listener and floating sequence indicator.
- **What I adjusted**: The AI forgot to ignore `contenteditable` divs and `<select>` elements initially, so pressing `c` while selecting an option triggered the modal. I added checks for `tagName === 'SELECT'` and `isContentEditable`.

---

## 6. Summary of Corrections

| Area | What the AI initially suggested | Why it was wrong | What I told it to do instead |
|---|---|---|---|
| **RLS Policies** | Self-referencing subquery on `project_members`. | Caused infinite recursion error in PostgreSQL. | Rewrote policy to avoid subquery loop on the same table. |
| **Task Filtering** | Filtered array in client memory with `.filter()`. | Violated Requirement 6 and leaked data. | Completely reversed to server-side SQL with `ILIKE` and `searchParams`. |
| **Overdue Alerts** | Suggested running a background cron worker. | Free-tier hosts sleep and miss cron intervals. | Switched to snapshotting `dismissed_due_date` in a database table. |
| **Keyboard Shortcuts** | Listened to all keydowns without input guards. | Typing in form fields triggered navigation. | Added target element tag guards to ignore inputs and textareas. |
| **Bulk Actions** | Wrapped batch in single database transaction. | One illegal task failed the entire batch. | Processed items individually and returned per-task success/error array. |
