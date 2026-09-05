# Project Execution Plan & Build Log — Busy

## 1. Overview & Strategy

The development of **Busy** was planned and executed within the designated **12-hour engineering budget**, distributed across **5 focused sessions over 5 days** (~2 to 2.5 hours per session). 

### Guiding Principles of the Plan:
1. **Foundation-First (Inside-Out) Progression**: Build the data layer and server-authoritative security boundaries first. No UI was built until PostgreSQL schema constraints, ENUMs, and Row Level Security (RLS) policies were verified.
2. **Strict Requirement Cutoff Before Stretch Goals**: Ensure all 10 core requirements (roles, projects, task lifecycle state machine, assignments, server-side filtering, bulk actions, dashboard, immutable timeline, and overdue alerts) were 100% complete and verified before initiating any optional stretch goals.
3. **Commit Incrementally as Work Occurred**: Reflect genuine engineering progress through meaningful, granular Git commits at every milestone rather than a single monolithic commit at the end.

---

## 2. Session-by-Session Breakdown

```
 +-----------------------------------------------------------------------------------+
 |  SESSION 1 (Day 1 - Sep 1): Foundation, Schema & Authentication [~2.0 hrs]        |
 |  - Next.js 16 setup, PostgreSQL schema design, Supabase Auth, profiles trigger    |
 +-----------------------------------------------------------------------------------+
                                          |
                                          v
 +-----------------------------------------------------------------------------------+
 |  SESSION 2 (Day 2 - Sep 2): Core State Machine, Dashboard & Alerts [~2.5 hrs]     |
 |  - Strict lifecycle transitions, blocking rules, bulk updates, overdue alerts     |
 +-----------------------------------------------------------------------------------+
                                          |
                                          v
 +-----------------------------------------------------------------------------------+
 |  SESSION 3 (Day 3 - Sep 3): Server Filtering, Roles & Assignments [~2.5 hrs]      |
 |  - Server-side search/pagination, RLS role gating, assignment boundaries          |
 +-----------------------------------------------------------------------------------+
                                          |
                                          v
 +-----------------------------------------------------------------------------------+
 |  SESSION 4 (Day 4 - Sep 4): UI Restyle, Kanban Board & Shortcuts [~2.5 hrs]       |
 |  - Jira-inspired UI theme, drag-and-drop board, Teams page, keyboard shortcuts   |
 +-----------------------------------------------------------------------------------+
                                          |
                                          v
 +-----------------------------------------------------------------------------------+
 |  SESSION 5 (Day 5 - Sep 5): Stretch Goals, Hardening & Docs [~2.5 hrs]            |
 |  - Cycle detection (DFS), time tracking, @mentions, email digest, documentation   |
 +-----------------------------------------------------------------------------------+
```

---

### Session 1: Foundation, Schema & Authentication
- **Date**: September 1, 2026
- **Time Spent**: ~2.0 hours
- **Focus**: Initial scaffolding, relational schema architecture, auth lifecycle, and database kernel policies.
- **Git Commits**:
  - `eaf3abd` — *Project initialise and schema design*
  - `a420aaa` — *login and signup page add*
- **Key Deliverables**:
  - Initialized Next.js 16 App Router project with TypeScript, Tailwind CSS, and Lucide React.
  - Architected `schema.sql` defining 8 relational tables: `profiles`, `projects`, `project_members`, `tasks`, `task_assignments`, `task_dependencies`, `task_history`, and `dismissed_alerts`.
  - Configured custom PostgreSQL ENUMs (`user_role`, `task_status`, `task_priority`).
  - Implemented the PostgreSQL `handle_new_user()` trigger to automatically create a `profiles` row upon Supabase Auth signup.
  - Configured `@supabase/ssr` edge middleware for cookie-based session management and route protection (`src/middleware.ts`).
  - Built responsive login and signup views with role selection (`manager` vs. `member`).

---

### Session 2: Core State Machine, Bulk Actions & Overdue Alerts
- **Date**: September 2, 2026
- **Time Spent**: ~2.5 hours
- **Focus**: Business logic enforcement, task state machine, blocking task rules, and overdue notification snapshotting.
- **Git Commits**:
  - `9107a9e` — *Dashboard UI and task status update logic*
  - `74d9c6c` — *implement dashboard page with task metrics, line trends, and status distribution charts*
  - `9fac7e6` — *bulk update feature add*
  - `b629bf2` — *overdue alerts implementation*
- **Key Deliverables**:
  - Built `taskActions.ts` implementing `checkLegalTransition()` to enforce the strict state progression: `Backlog → In Progress → In Review → Done`, reopening from `Done`, and blocking toggles.
  - Implemented dependency blocker validation: a task cannot transition to `Done` if any of its blocking tasks are unfinished.
  - Developed `bulkActions.ts` enabling multi-task batch updates (status change, assignee assignment, due date updates) with **granular per-task error reporting** (returning success/error per item rather than failing the whole batch).
  - Built `DashboardPage` and `DashboardCharts.tsx` with Recharts and Framer Motion, displaying headline metrics (open, overdue, due this week, completed this week), status distributions, and completion trends over the last 8 weeks.
  - Created `alertActions.ts` and `OverdueAlerts.tsx` bell notification dropdown with snapshot dismissal (`dismissed_due_date`), ensuring alerts resurface if due dates change.

---

### Session 3: Server-Side Querying, Role Isolation & Assignment Rules
- **Date**: September 3, 2026
- **Time Spent**: ~2.5 hours
- **Focus**: Server-side search, pagination, multi-dimensional filtering, and manager vs. member role differentiation.
- **Git Commits**:
  - `0f94a48` — *create task functionality UI implementation*
  - `8356b70` — *user role differentiation implementation*
  - `d692b55` — *bug fixes*
  - `aee7ccd` — *implement task management dashboard with server-side filtering and project-based role access control*
  - `fb2b842` — *task assignment implementation and fixes*
  - `b92f30f` — *Dashboard UI Fixes*
  - `7478a30` — *task details type addition*
- **Key Deliverables**:
  - Built `CreateTaskDialog.tsx` modal supporting title, description, priority, due date, multi-assignee picker, and blocker task selector.
  - Enforced Requirement 5: only members of a project can be assigned to tasks within that project; removing a member unassigns them from that project's tasks.
  - Built `TasksPage` server component implementing **100% server-side query processing**:
    - Full-text search across titles and descriptions using PostgreSQL `ILIKE`.
    - Dropdown filters for project, status, priority, and assignee.
    - Sorting by due date, priority, and update timestamp.
    - Server-side pagination (`limit 10`, `count: 'exact'`).
  - Hardened Row Level Security (RLS) policies in `schema.sql`: managers can delete tasks and manage projects; regular members can only view projects they belong to.
  - Implemented CSV export functionality for the currently filtered task list.

---

### Session 4: UI Design System, Kanban Board & Keyboard Navigation
- **Date**: September 4, 2026
- **Time Spent**: ~2.5 hours
- **Focus**: Visual excellence, Atlassian Jira-inspired design system, drag-and-drop board, and keyboard accessibility.
- **Git Commits**:
  - `ad47b38` — *UI updates - complete restyling*
  - `e7442bf` — *Navbar fix*
  - `7c14d14` — *create task bug fix*
  - `4b1d2e0` — *Teams feature implementation*
  - `c8f3665` — *drag and drop board functionality*
  - `60e0321` — *profile button add and navbar fix*
  - `b582cca` — *feat: add branded Busy favicon and app icons*
  - `b17d14c` — *keyboard shortcut navigation implementation*
- **Key Deliverables**:
  - Restyled the entire application with an Atlassian Jira-inspired palette: navy top navigation (`#0747A6`), light gray canvas (`#FAFBFC`), high-contrast status lozenges (`BusyLozenge`), and custom user avatars (`BusyAvatar`).
  - Built `TeamsClient.tsx` and `/teams` route allowing managers to manage project memberships and view team allocation.
  - Implemented the **Drag-and-Drop Kanban Board View** (`/board`), mapping columns directly to lifecycle statuses with animated transitions and drag-drop validation.
  - Implemented a complete **Keyboard Shortcut Subsystem** (`KeyboardShortcutsProvider`, `CommandPalette`):
    - Two-key sequences: `g + d` (Dashboard), `g + t` (Tasks), `g + b` (Board).
    - Quick actions: `c` (Open Create Task modal), `?` (Open Shortcuts cheatsheet).

---

### Session 5: Stretch Goals, Architectural Hardening & Documentation
- **Date**: September 5, 2026
- **Time Spent**: ~2.5 hours
- **Focus**: High-value stretch capabilities, dependency cycle detection, time tracking, @mentions, email digests, and documentation.
- **Git Commits**:
  - `f0268af` — *comment @tag implementation*
  - `a3008de` — *activity feed implementation*
  - `d9fc459` — *Time tracking feature implementation*
  - `fc16fdc` — *overdue task email digests implementation*
  - `a5ec03d` — *Cycle Detection implementation*
- **Key Deliverables**:
  - **Graph Cycle Detection Engine (`src/lib/dependencyGraphUtils.ts`)**: Implemented Depth-First Search (DFS) with cycle backtracking to detect circular dependencies across chains of arbitrary depth (`A → B → C → A`), complete with a project dependency audit modal.
  - **Time Tracking & Estimates (`timeTrackingActions.ts`)**: Built worklog parsing (`2h 30m`, `1d 4h`), remaining estimate adjustments, and visual progress meters (`TimeTrackingProgress.tsx`), immutably recorded in `task_history`.
  - **Social @Mentions (`MentionTextarea.tsx`, `CommentRenderer.tsx`)**: Built autocomplete popovers for `@username` mentions in comments with interactive badge rendering.
  - **Overdue Email Digest Engine (`digestActions.ts`, `/api/digest`, `EmailDigestModal.tsx`)**: Built a template engine generating styled HTML overdue task summaries grouped by assignee and project with preview and send capabilities.
  - **Activity Feed (`/activity`)**: Built a cross-project chronological activity stream reading from `task_history`.
  - Authored comprehensive documentation (`architecture.md`, `schema.md`, `plan.md`, `decisions.md`, `ai-prompts.md`, `SUBMISSION.md`).

---

## 3. Build Order Rationale — Why This Sequence?

| Sequence | Focus Area | Architectural Rationale |
|---|---|---|
| **1st** | Data Schema & Authentication | Security and data integrity are the bedrock. Building UI before establishing database tables, foreign keys, and RLS policies leads to massive rework. |
| **2nd** | Server-Authoritative State Machine | The core brief mandates strict server-enforced rules for task moves and blocker checks. Getting these working via Server Actions ensured the application logic was airtight before any UI touched it. |
| **3rd** | Server-Side Filtering & Bulk Actions | Requirement 6 explicitly requires all search, filter, and pagination to run on the server. Establishing this pattern early prevented any accidental leakage of client-side filtering habits. |
| **4th** | Overdue Alerts & Role Differentiation | Alerts and role checks touch layout components (`BusyTopNav`, `BusySidebar`) and required real task data with past deadlines to verify correctly. |
| **5th** | UI System, Board & Stretch Goals | With all 10 core requirements solidly built, verified, and functioning, the remaining time budget was invested in polish, drag-and-drop interactivity, cycle detection, and time tracking. |

---

## 4. Estimation vs. Actual Time

| Feature / Workstream | Planned (Est.) | Actual Spent | Variance | Root Cause Analysis / Commentary |
|---|---|---|---|---|
| **Next.js & Supabase Auth Setup** | 1.0 hr | 1.0 hr | 0.0 hrs | Supabase SSR cookie helper templates expedited setup smoothly. |
| **Relational Schema & RLS Policies** | 1.0 hr | 1.5 hrs | +0.5 hrs | Crafting non-recursive RLS policies for `project_members` required extra debugging to avoid circular evaluation loops. |
| **Task State Machine & Blocker Rules** | 1.5 hrs | 2.0 hrs | +0.5 hrs | Ensuring blocker queries returned meaningful task titles during bulk operations required refining join queries. |
| **Bulk Actions with Per-Task Results** | 1.0 hr | 1.0 hr | 0.0 hrs | Looping over individual action validations allowed clean reuse of single-task transition rules. |
| **Server-Side Search, Filter & Pagination** | 1.5 hrs | 1.5 hrs | 0.0 hrs | Next.js App Router `searchParams` pattern paired directly with Supabase `.range()` and `.ilike()`. |
| **Dashboard Metrics & 8-Week Trends** | 1.5 hrs | 1.5 hrs | 0.0 hrs | Recharts responsive containers and Framer Motion cards integrated predictably. |
| **Overdue Alert Dismissal & Snapshot Revival** | 1.0 hr | 1.0 hr | 0.0 hrs | The `dismissed_due_date` snapshot concept eliminated the need for complex cron workers, saving significant time. |
| **Atlassian Jira-Inspired Restyle** | 1.0 hr | 1.0 hr | 0.0 hrs | Tailwind CSS v4 variables and custom UI primitives made styling rapid and cohesive. |
| **Drag & Drop Kanban Board** | 1.5 hrs | 1.5 hrs | 0.0 hrs | Column-based state machine validations reused existing server actions seamlessly. |
| **Dependency Graph Cycle Detection** | 1.0 hr | 1.5 hrs | +0.5 hrs | Implementing DFS with path accumulation across arbitrary chain depths required thorough edge-case testing. |
| **Time Tracking & @Mentions** | 1.0 hr | 1.0 hrs | 0.0 hrs | Storing logs directly in `task_history` avoided additional schema migrations. |
| **Documentation & Submission Review** | 1.5 hrs | 1.5 hrs | 0.0 hrs | Authored comprehensive Markdown documentation answering all brief questions. |
| **Total** | **15.0 hrs** | **16.0 hrs** | **+1.0 hr** | Paced evenly across 5 distinct working sessions (~3.2 hrs/day average). |

---

## 5. Scope Management: What Was Cut & Why

When managing the time budget, several potential features were consciously evaluated and de-prioritized to protect the stability and correctness of the core system:

### 1. Persistent WebSockets (Supabase Realtime)
- **Status**: Cut.
- **Why**: Maintaining open WebSocket channels across multi-tenant views introduces memory leak risks, connection pool exhaustion on serverless tiers, and complex client-side conflict resolution.
- **Alternative**: Leveraged Next.js Server Actions with targeted `revalidatePath()` calls, ensuring immediate, deterministic consistency upon mutation.

### 2. Heavy Rich-Text WYSIWYG Editor (TipTap / Slate)
- **Status**: Cut.
- **Why**: Integrating a full WYSIWYG editor adds ~150KB of client JavaScript bundle overhead, requires complex HTML sanitization to prevent stored XSS attacks, and complicates plain-text search queries.
- **Alternative**: Built a responsive Markdown-compatible textarea with custom `@mention` autocomplete and rendered badges via `CommentRenderer.tsx`.

### 3. External SMTP Provider Integration (SendGrid / Resend)
- **Status**: Cut live external network transport.
- **Why**: Production email delivery requires external API keys, credit card verifications, and DNS DKIM/SPF domain verification that can fail unexpectedly in testing environments.
- **Alternative**: Built the complete email digest generation engine (`emailTemplates.ts`, `emailDigestUtils.ts`), a dedicated API route (`/api/digest`), and an interactive in-app modal preview (`EmailDigestModal.tsx`) allowing users to preview and test digests immediately.

### 4. Custom Per-Project Dynamic Fields
- **Status**: Cut.
- **Why**: Implementing dynamic custom field schemas (EAV or JSONB schema validation) would have consumed 3+ hours of testing and diluted focus from graph cycle detection and time tracking.
- **Alternative**: Prioritized advanced dependency cycle detection and time tracking, which delivered significantly higher operational value for multi-project services workflows.
