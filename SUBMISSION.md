# Submission — Busy (Project & Task Tracking)

Fill this in and commit it. This is the first file we open.

## Links

- **GitHub repository:** https://github.com/ShivanshKaushik007/Busy.git
- **Live application:** https://busy-one.vercel.app

---

## Notes for the reviewer

- **Cloud Hosting & Cold Starts**: The application is deployed on Vercel (Edge middleware, Server Components, and Server Actions) backed by a managed Supabase PostgreSQL 15 database in AWS us-east-1. If accessing after inactivity, free-tier serverless functions may experience a brief initial cold start (<1–2 seconds), after which navigation is instantaneous.
- **Server-Authoritative Validation**: All task state transitions, dependency blocker validations, role permissions, and search/filter operations are strictly evaluated and enforced on the server and at the database kernel level via PostgreSQL Row Level Security (RLS). Client-side validations serve purely for optimistic UI responsiveness.
- **Interactive Modals & Keyboard Navigation**: Press `?` anywhere in the application to open the Keyboard Shortcuts modal, `c` to open the Create Task modal, or use `g + d` (Dashboard), `g + t` (Tasks), `g + b` (Board) for rapid navigation.

---

## Demo credentials

The database is pre-seeded with accounts for testing both roles. Additionally, new accounts with either role can be registered immediately on the signup page via the role selector dropdown.

| Role | Email | Password | Access Privileges |
|------|-------|----------|-------------------|
| **Manager** | `manager@busy.dev` | `password123` | Full portfolio oversight: create/archive projects, manage team memberships, delete tasks. |
| **Member** | `member@busy.dev` | `password123` | Scoped team member: only accesses projects they are assigned to; cannot archive projects or delete tasks. |

*(Note: If creating a new user, select "Manager" or "Regular Member" directly from the role dropdown on `/login` to test role boundaries).*

---

## Stack

| Layer | What you used | Why |
|---|---|---|
| **Frontend** | React 19, Next.js 16 App Router, Tailwind CSS v4, Lucide Icons, Recharts, Framer Motion | Provides an enterprise-grade, Atlassian Jira-inspired interface with responsive data grids, animated charts, and sub-100ms client interactions. |
| **Backend** | Next.js 16 Server Actions (`'use server'`) & Edge Middleware | Type-safe RPC boundary eliminating API controller boilerplate, sharing TypeScript models end-to-end, and verifying session cookies securely on the server. |
| **Database** | Managed PostgreSQL 15 (Supabase) with Row Level Security (RLS) | Relational integrity with foreign key cascades, custom PostgreSQL ENUMs, database triggers, and kernel-level multi-tenant data isolation. |
| **Hosting** | Vercel (Serverless Compute & Edge Network) + Supabase Cloud (AWS us-east-1) | Modern, auto-scaling cloud-native topology complying 100% with free-tier requirements with zero persistent daemon overhead. |

---

## Goal checklist

Mark each honestly. Partial is fine — say what is partial.

| # | Goal | Status | Notes |
|---|---|---|---|
| **1** | **Accounts and roles** | **Done** | Passwords and emails authenticated via Supabase Auth. Managers can create/archive projects, modify project members, and delete tasks. Members can do none of these and only see projects they belong to. Enforced at the database kernel via PostgreSQL Row Level Security (RLS). |
| **2** | **Projects** | **Done** | Projects carry unique keys (`key`), names, descriptions, and owners. Managers can soft-archive and restore projects, hiding them from default views without destroying tasks or history. |
| **3** | **Tasks inside projects** | **Done** | Tasks belong to exactly one project with title, description, priority, due date, and blocking dependencies within the same project. Full creation, editing, status advancement, and manager-restricted deletion. |
| **4** | **A task lifecycle with rules** | **Done** | Strict progression: `Backlog → In Progress → In Review → Done`. Tasks can be marked Blocked from either In Progress or In Review; unblocking restores prior state. Reopening from Done supported. Unfinished blockers reject transitions to Done. All illegal moves rejected by the server with explanatory error messages. |
| **5** | **Assignment** | **Done** | Multi-assignee support. Only members of a task's project may be assigned to it. Removing a member from a project automatically unassigns them from that project's tasks. Includes a dedicated "Assigned to Me" filter. |
| **6** | **Finding things** | **Done** | 100% server-side query processing. Title & description text search (`ILIKE`), filters for project, status, assignee, priority, and overdue. Multi-column sorting and exact total count pagination (`range()`, `count: 'exact'`). Nothing filtered in client memory. |
| **7** | **Acting on many tasks at once** | **Done** | Bulk selection bar supporting batch status transitions, assignee assignments, and due date updates. Evaluates each task individually and returns granular per-task success/error reporting. Includes CSV export of the currently filtered view. |
| **8** | **A dashboard** | **Done** | Summary metrics: open tasks, overdue tasks, due this week, completed this week. Breakdown by status and assignee. Visual line chart tracking weekly completions over the last 8 weeks using Recharts. |
| **9** | **History you cannot rewrite** | **Done** | Immutable `task_history` table recording task creation, field updates (with old and new values and actor), assignments, unassignments, and comments. UPDATE and DELETE policies are deliberately omitted, making the audit trail immutable even to managers. |
| **10** | **Overdue alerts** | **Done** | Navigation bell notification badge showing active overdue tasks assigned to the viewer. Assignees can dismiss alerts. Implemented via snapshot architecture (`dismissed_due_date`): if a task's due date changes later, the alert automatically resurfaces. |

---

## Stretch Goals Implemented (Optional)

Beyond the 10 core requirements, the following stretch capabilities were implemented:

1. **Drag-and-Drop Board View (`/board`)**: An interactive Kanban board mapping columns to lifecycle statuses with animated transitions and state machine validation.
2. **Transitive Cycle Detection across Dependency Chains**: Depth-First Search (DFS) graph algorithm in `src/lib/dependencyGraphUtils.ts` that prevents circular dependencies of arbitrary depth (`A → B → C → A`), returning exact cycle chains and providing a project-wide dependency audit modal.
3. **Time Tracking & Estimates**: Log work hours/minutes (`2h 30m`, `1d 4h`), adjust remaining estimates automatically or manually, and view visual progress meters (`TimeTrackingProgress.tsx`), immutably stored in `task_history`.
4. **@-Mentions in Comments**: Autocomplete popup inside comment textareas for team members with interactive badge pill rendering (`CommentRenderer.tsx`).
5. **Overdue Task Email Digest**: Serverless digest engine (`/api/digest`, `digestActions.ts`) generating styled HTML overdue summaries grouped by assignee with an in-app interactive preview modal (`EmailDigestModal.tsx`).
6. **Activity Feed across All Projects (`/activity`)**: A unified, chronological audit feed displaying team actions, field changes, and comments across all accessible projects.
7. **Keyboard-Driven Navigation**: Jira-style hotkeys (`g + d`, `g + t`, `g + b`, `c` for create task, and `?` for cheatsheet modal).

---

## How much time did you actually spend?

**Total Time Spent**: Approximately **16 hours**, structured into **5 focused working sessions over 5 days** (~3.2 hours per session):
- **Session 1 (~2.0 hrs)**: Next.js setup, Supabase PostgreSQL schema, ENUMs, triggers, and authentication.
- **Session 2 (~2.5 hrs)**: State machine transition rules, blocking task constraints, bulk actions, and overdue alert snapshots.
- **Session 3 (~2.5 hrs)**: Server-side search/pagination (`searchParams`), role differentiation, and assignment integrity.
- **Session 4 (~2.5 hrs)**: Atlassian Jira-inspired UI theme, Teams management, Kanban board, and keyboard shortcuts.
- **Session 5 (~2.5 hrs)**: Cycle detection (DFS), time tracking, @mentions, email digests, activity feed, and documentation.
- **Buffer & Review (~4.0 hrs)**: Edge-case testing, end-to-end verification, and documentation authoring.

---

## What would you do next, with another 12 hours?

If granted an additional 12 hours, we would prioritize:

1. **PostgreSQL Materialized Views for Dashboard Performance**:
   - Replace in-memory dashboard metric aggregation with a PostgreSQL Materialized View (`dashboard_metrics_mv`) refreshed concurrently on task updates, guaranteeing sub-50ms dashboard page loads even with 100,000+ tasks.
2. **PostgreSQL Native Full-Text Search (FTS) with Trigram Indexing**:
   - Upgrade `ILIKE` wildcard search to native PostgreSQL `tsvector` and `tsquery` paired with `pg_trgm` GIN indexes for fuzzy search and relevance ranking across large portfolios.
3. **Selective WebSocket Subscriptions via Supabase Realtime**:
   - Enable live multiplayer synchronization specifically on the Kanban board view so teammates see card status moves in real time without refreshing.
4. **Saved Custom Filter Views**:
   - Build a `saved_views` table allowing managers to save and name complex multi-project filter combinations (e.g., "Critical Client Work Due This Week") for one-click access.

---

## What are you least happy with in this codebase, and why?

1. **In-Memory Metric Aggregation in `DashboardPage`**:
   - In `src/app/(dashboard)/page.tsx`, the server queries all active tasks for the viewer and calculates metrics (`openTasks`, `overdueTasks`, `dueThisWeek`, `completedThisWeek`) using JavaScript `.forEach()`. While this runs in <30ms for hundreds of tasks, at 50,000+ tasks it would consume substantial Node.js heap memory. Writing raw SQL `COUNT(*) FILTER (...)` queries or maintaining a Materialized View would be architecturally superior for long-term hyperscale.
2. **PostgREST String-Based Join Selectors**:
   - In `@supabase/ssr`, nested relational queries use string selectors (e.g., `select('*, projects(name, key), task_assignments(profiles(*))')`). Because TypeScript cannot natively validate PostgREST query strings at compile time, manual interface casting was required in several places. Generating end-to-end database types via the Supabase CLI (`supabase gen types typescript`) would eliminate this casting.
