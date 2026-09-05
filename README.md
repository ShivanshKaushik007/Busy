<div align="center">

#  Busy — Project & Task Management Platform

**An enterprise-grade, server-authoritative task tracking platform built for fast-moving services companies.**

[![Live Demo](https://img.shields.io/badge/Live%20Demo-busy--one.vercel.app-0052CC?style=for-the-badge&logo=vercel&logoColor=white)](https://busy-one.vercel.app)
[![Next.js](https://img.shields.io/badge/Next.js-16.3-black?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-v4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL%2015-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)

[**Explore Live Application**](https://busy-one.vercel.app) • [**Architecture Guide**](docs/architecture.md) • [**Database Schema**](docs/schema.md) • [**Engineering Decisions**](docs/decisions.md)

</div>

---

##  Table of Contents

- [The Scenario & Core Problem](#-the-scenario--core-problem)
- [Live Demo & Demo Credentials](#-live-demo--demo-credentials)
- [Core Architecture & Philosophy](#-core-architecture--philosophy)
- [Key Features (10 Core Requirements)](#-key-features-10-core-requirements)
- [Stretch Goals Implemented (7 Features)](#-stretch-goals-implemented-7-features)
- [Technology Stack](#-technology-stack)
- [Project Directory Structure](#-project-directory-structure)
- [Local Development & Setup](#-local-development--setup)
- [Database Setup & Security (RLS)](#-database-setup--security-rls)
- [Documentation Index](#-documentation-index)

---

##  The Scenario & Core Problem

Services companies often juggle dozens of client deliverables across multi-disciplinary teams. In conventional workflows:
- Tasks are scattered across forgotten spreadsheets.
- Status updates get buried in ephemeral chat channels.
- Deadlines exist only in people's heads until a client escalates a missed milestone.
- Managers cannot reliably answer: *"What is overdue right now across the portfolio?"* or *"Which team member is overloaded with four active projects while another has nothing this week?"*

**Busy** replaces this fragmentation with a unified, server-authoritative internal platform where managers set up projects, allocate team members, track blocker dependencies, and maintain an immutable, tamper-proof audit trail of every change.

---

##  Live Demo & Demo Credentials

- **Live Application URL**: [https://busy-one.vercel.app](https://busy-one.vercel.app)
- **Public GitHub Repository**: [https://github.com/ShivanshKaushik007/Busy.git](https://github.com/ShivanshKaushik007/Busy.git)

### Pre-Seeded Accounts

| Role | Email | Password | Permissions |
|---|---|---|---|
| **Manager** | `manager@busy.dev` | `password123` | Universal portfolio oversight, create/archive projects, add/remove project members, delete tasks. |
| **Member** | `member@busy.dev` | `password123` | Scoped project access, view only assigned projects, advance task statuses, log comments and work. |

> **Note**: You can also register a brand new account with either role directly from the [Sign Up Screen](https://busy-one.vercel.app/login) using the built-in role selector dropdown.

---

##  Core Architecture & Philosophy

```
  +-------------------------------------------------------------------------------+
  |                          CLIENT TIER (Web Browser)                            |
  |  - React 19 Client Engine (Jira-Themed Data Grids, Kanban Board, Modals)      |
  |  - Keyboard Shortcut Subsystem & Command Palette (g+d, g+t, g+b, c, ?)        |
  |  - URL SearchParams State Engine (Search, Filter, Sort, Pagination)           |
  +---------------------------------------+---------------------------------------+
                                          |
                        HTTPS / JSON RPC  |  Next.js Server Actions
                                          v
  +-------------------------------------------------------------------------------+
  |                      COMPUTE TIER (Next.js 16 App Router)                     |
  |  - Edge Middleware: Cookie decryption, JWT session validation & refresh       |
  |  - React Server Components (RSC): Zero-JS server-rendered data orchestration  |
  |  - Server Actions ('use server'): RPC endpoints for mutations & validation    |
  |  - DAG Cycle Detection Engine: Depth-First Search for dependency deadlocks    |
  +---------------------------------------+---------------------------------------+
                                          |
              PostgREST / Postgres Wire   |  @supabase/ssr (Scoped Session Token)
                                          v
  +-------------------------------------------------------------------------------+
  |                    DATA TIER (Supabase Managed PostgreSQL 15)                 |
  |  - 8 Relational Tables with Foreign Key Cascades & Custom PostgreSQL ENUMs    |
  |  - Database Kernel Row Level Security (RLS) enforcing multi-tenant isolation  |
  |  - Append-only immutable task_history ledger without UPDATE/DELETE policies   |
  |  - Automated auth triggers (handle_new_user) on user signup                   |
  +-------------------------------------------------------------------------------+
```

1. **Server-Authoritative Business Logic**: Client-side validations exist strictly for optimistic UI feedback. State machine moves, dependency blocker checks, and permission boundaries are enforced on the Node server and PostgreSQL database kernel.
2. **PostgreSQL Kernel-Level Security (RLS)**: Access control is not hidden behind UI flags; Row Level Security policies guarantee that regular members cannot read or query projects they do not belong to, and cannot delete tasks even via direct API tampering.
3. **Directed Acyclic Graph (DAG) Integrity**: Task blocking relationships form a directed graph within each project. A Depth-First Search (DFS) algorithm prevents cyclic deadlocks across dependency chains of arbitrary depth (`A → B → C → A`).
4. **Immutable Audit Ledger**: Every status transition, field edit, assignment, worklog, and comment is appended to `task_history` where `UPDATE` and `DELETE` SQL operations are completely omitted at the database engine level.

---

##  Key Features (10 Core Requirements)

### 1. Accounts & Role-Based Access Control (RBAC)
- Authenticated via Supabase Auth with secure HTTP-only session cookies.
- Two distinct roles: **Manager** and **Member**.
- Managers can create and soft-archive projects, modify team memberships, and permanently delete tasks.
- Members can only view projects they belong to, cannot archive projects, and cannot delete tasks.
- Enforced at the database kernel via PostgreSQL Row Level Security (`public.is_manager()`).

### 2. Multi-Project Management
- Projects carry a short unique identifier key (e.g., `PRJ-1`, `BUSY`), human-readable name, description, and designated owner.
- Managers can soft-archive projects (`is_archived = true`), immediately hiding them from default views without destroying tasks, history, or dependencies.
- Archived projects can be restored at any time.

### 3. Comprehensive Task Hierarchy
- Every task belongs to exactly one project and carries a title, description, priority (`Low`, `Medium`, `High`, `Urgent`), optional due date, and blocking dependencies.
- Tasks support full creation, editing, and manager-restricted deletion with cascading clean-up of assignments and dependencies.

### 4. Strict Lifecycle State Machine & Blocker Rules
- Tasks follow an enforced progression:
  $$\text{Backlog} \longrightarrow \text{In Progress} \longrightarrow \text{In Review} \longrightarrow \text{Done}$$
- Tasks can be toggled as **Blocked** from either `In Progress` or `In Review`. Unblocking restores the task directly to the state it was blocked from.
- Finished tasks can be reopened to `Backlog` or `In Progress`.
- **Prerequisite Rule**: A task with unfinished blocking dependencies (`status != 'Done'`) cannot move to `Done`. The server immediately rejects the attempt and returns the titles of the unresolved blocking tasks.
- Illegal jumps (e.g., `Backlog → Done`) are rejected by the server with explanatory error messages.

### 5. Multi-Assignee Management & Boundary Enforcement
- Tasks support multiple simultaneous assignees.
- **Project Boundary Rule**: Only users who are active members of a task's parent project can be assigned to it.
- Removing a member from a project automatically cascades to unassign them from all tasks within that project.
- A dedicated **"Assigned to Me"** filter allows every user to view all tasks assigned to them across all projects in one view.

### 6. 100% Server-Side Finding Engine (Search, Filter, Sort & Pagination)
- **Zero Client-Side Filtering**: In strict compliance with the brief, all filtering, searching, sorting, and pagination are executed directly on the PostgreSQL database.
- Text search across titles and descriptions using PostgreSQL `ILIKE`.
- Multi-dimensional filters for Project, Status, Priority, Assignee, and Overdue status.
- Sorting by due date, priority, or last updated timestamp.
- Server-side pagination with exact total match counts (`count: 'exact'`, `range(from, to)`).
- Filter state synchronized with `URLSearchParams` (`?q=...&status=...&page=...`) for shareable, bookmarkable views.

### 7. Granular Bulk Actions & Filtered CSV Export
- Multi-select checkbox action bar allowing batch status moves, assignee updates, and due date changes.
- **Granular Per-Task Reporting**: Because some changes may be illegal for certain tasks (e.g., moving to "Done" while a blocker is unfinished), the server evaluates each task individually and returns an array of per-task results (`{ taskId, success, error }`), informing the user exactly which succeeded and which were rejected.
- **CSV Export**: Export the currently filtered and searched task dataset directly to a formatted CSV file with one click.

### 8. Portfolio Analytics Dashboard
- Interactive landing view displaying key portfolio metrics:
  - **Open Tasks** (All active unfinished work).
  - **Overdue Tasks** (Past deadline and unfinished).
  - **Due This Week** (Targeted for current 7-day window).
  - **Completed This Week** (Finished within current week).
- Visual breakdown of tasks by Status lozenge distribution and Assignee workload.
- **8-Week Velocity Line Chart**: Responsive Recharts trend line charting task completions over the preceding 8 weeks.

### 9. History You Cannot Rewrite (Immutable Audit Trail)
- Every task maintains an append-only timeline documenting:
  - Task creation timestamp and creator.
  - Every field edit with the old value, new value, timestamp, and actor.
  - Every assignment and unassignment event.
  - Discussion comments.
  - Worklog hours and estimate adjustments.
- Enforced at the database engine level by omitting `UPDATE` and `DELETE` RLS policies on `task_history`—even managers cannot alter or delete history.

### 10. Event-Driven Overdue Alerts & Snapshot Revival
- Real-time notification badge in the top navigation showing the count of overdue tasks assigned to the current user.
- Users can dismiss alerts for tasks they are assigned to.
- **Snapshot Revival**: Dismissals record `(user_id, task_id, dismissed_due_date)`. If a task's due date is subsequently rescheduled, the timestamps no longer match, and the alert **automatically resurfaces** in the navigation without needing a background polling worker.

---

##  Stretch Goals Implemented (7 Features)

Beyond the 10 core requirements, the following optional capabilities were fully engineered:

1. **Drag-and-Drop Kanban Board (`/board`)**:
   - Visual board mapping columns to `Backlog`, `In Progress`, `In Review`, and `Done`.
   - Supports dragging cards between columns with immediate server-action validation, blocker verification, and state machine enforcement.
2. **Transitive Cycle Detection across Dependency Chains**:
   - Implemented Depth-First Search (DFS) with recursion stack backtracking in `src/lib/dependencyGraphUtils.ts`.
   - Detects and prohibits circular dependency chains of arbitrary depth (`A → B → C → A`), returning the exact cycle path to the user.
   - Includes an interactive **Project Dependency Audit Modal** diagnosing transitively blocked items and chain depths.
3. **Time Tracking & Remaining Estimates**:
   - Parse natural language duration strings (`"2h 30m"`, `"1d 4h"`, `"45m"`).
   - Log work hours with descriptions, adjust remaining estimates automatically or manually, and visualize progress via interactive meters (`TimeTrackingProgress.tsx`).
   - Worklogs are stored as immutable audit records in `task_history`.
4. **@-Mentions in Comments**:
   - Interactive autocomplete dropdown triggered by `@` in comment textareas (`MentionTextarea.tsx`).
   - Renders interactive pill badges with hover cards via `CommentRenderer.tsx`.
5. **Overdue Task Email Digest Engine**:
   - Serverless email digest generator (`/api/digest`, `digestActions.ts`) formatting responsive HTML summaries of overdue tasks grouped by assignee and project.
   - Includes an in-app **Interactive Preview Modal** (`EmailDigestModal.tsx`) allowing managers to preview digests and trigger deliveries.
6. **Cross-Project Activity Feed (`/activity`)**:
   - Chronological audit stream displaying team actions, status moves, and comments across all accessible projects.
7. **Power-User Keyboard Shortcuts**:
   - Global keyboard shortcuts provider supporting two-key sequences:
     - `g + d` → Navigate to Dashboard
     - `g + t` → Navigate to Tasks List
     - `g + b` → Navigate to Kanban Board
     - `c` → Open Create Task Dialog
     - `?` → Open Keyboard Shortcuts Cheatsheet

---

##  Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Framework** | Next.js 16 (App Router) | Full-stack framework leveraging React Server Components (RSC) and Server Actions. |
| **Frontend Library** | React 19 | UI rendering engine with modern hooks (`useTransition`, `useOptimistic`). |
| **Styling** | Tailwind CSS v4 | High-performance CSS utility system implementing Atlassian Jira design tokens. |
| **Component Primitives** | Base UI + shadcn/ui | Accessible, unstyled accessible UI foundations for dialogs, dropdowns, and tooltips. |
| **Icons & Visuals** | Lucide React | Clean, consistent vector iconography. |
| **Charts & Metrics** | Recharts 3.x | Responsive SVG data visualization for velocity trends and status distributions. |
| **Animations** | Framer Motion 13.x | Micro-animations for modal dialogs, cards, and notification lozenges. |
| **Backend & RPC** | Next.js Server Actions | Type-safe remote procedure calls eliminating REST controller boilerplate. |
| **Authentication** | Supabase Auth (`@supabase/ssr`) | Cryptographic JWT session validation managed via HTTP-only cookies. |
| **Database** | Supabase PostgreSQL 15 | Relational data store with Row Level Security (RLS), custom ENUMs, and triggers. |
| **Hosting Platform** | Vercel + Supabase Cloud | Serverless edge compute paired with managed cloud database in AWS us-east-1. |

---

##  Project Directory Structure

```
Busy/
├── public/                     # Static branding assets and application icons
├── src/
│   ├── app/
│   │   ├── (dashboard)/        # Authenticated dashboard layout & views
│   │   │   ├── activity/       # Cross-project activity audit stream
│   │   │   ├── board/          # Drag-and-drop Kanban board view
│   │   │   ├── projects/       # Project management & team assignment view
│   │   │   ├── tasks/          # Server-filtered task data grid & CSV export
│   │   │   ├── teams/          # Team allocation & project roster view
│   │   │   ├── layout.tsx      # Main authenticated shell (TopNav + Sidebar)
│   │   │   └── page.tsx        # Portfolio analytics & 8-week trend dashboard
│   │   ├── actions/            # Type-safe Server Actions (Backend RPC layer)
│   │   │   ├── activityActions.ts     # Activity feed queries
│   │   │   ├── alertActions.ts        # Overdue alert dismissal & revival
│   │   │   ├── bulkActions.ts         # Multi-task batch operations
│   │   │   ├── dependencyActions.ts   # DAG cycle detection & audit
│   │   │   ├── digestActions.ts       # Email digest data compilation
│   │   │   ├── projectActions.ts      # Project CRUD & role verification
│   │   │   ├── taskActions.ts         # Task lifecycle state machine & CRUD
│   │   │   └── timeTrackingActions.ts # Worklogs & remaining estimate logic
│   │   ├── api/
│   │   │   └── digest/         # Endpoint for scheduled email digest triggers
│   │   ├── login/              # Authentication screen (Login / Signup / Roles)
│   │   ├── globals.css         # Jira design system tokens & Tailwind v4 theme
│   │   └── layout.tsx          # Root HTML layout
│   ├── components/
│   │   ├── busy/               # Jira-themed custom UI components
│   │   │   ├── BusyAvatar.tsx           # User avatar with role rings
│   │   │   ├── BusyLozenge.tsx          # High-contrast status badges
│   │   │   ├── BusySidebar.tsx          # Project contextual sidebar
│   │   │   ├── BusyTopNav.tsx           # Navy global navigation bar
│   │   │   ├── CommentRenderer.tsx      # Markdown & @mention parser
│   │   │   ├── DependencyChainViewer.tsx# Visual blocker chain explorer
│   │   │   ├── EmailDigestModal.tsx     # Overdue email digest previewer
│   │   │   ├── MentionTextarea.tsx      # Textarea with @mention popover
│   │   │   └── TimeTrackingProgress.tsx # Visual estimate progress bar
│   │   ├── keyboard/           # Keyboard shortcut provider & command palette
│   │   ├── ui/                 # Accessible UI primitives (dialog, button, dropdown)
│   │   ├── CreateTaskDialog.tsx# Modal for creating tasks with dependencies
│   │   ├── DashboardCharts.tsx # Recharts SVG graphs & velocity trends
│   │   ├── OverdueAlerts.tsx   # Overdue alert notification bell dropdown
│   │   └── TaskDetailModal.tsx # Task detail viewer, comments & timeline
│   ├── lib/
│   │   ├── dateUtils.ts             # Date math & relative time formatting
│   │   ├── dependencyGraphUtils.ts  # Depth-First Search (DFS) cycle detection
│   │   ├── emailDigestUtils.ts      # Digest grouping & threshold evaluation
│   │   ├── emailTemplates.ts        # Styled HTML email templates
│   │   ├── timeTrackingUtils.ts     # Natural language duration string parsing
│   │   └── types.ts                 # Core TypeScript data contracts
│   ├── utils/
│   │   └── supabase/           # Scoped Supabase SSR client factories
│   └── middleware.ts           # Edge authentication & cookie refresh middleware
├── docs/                       # Comprehensive evaluation documentation
│   ├── ai-prompts.md           # Prompt history, AI corrections & quality control
│   ├── architecture.md         # System topology, moving pieces & end-to-end trace
│   ├── decisions.md            # 7 major engineering trade-offs & reversed decisions
│   ├── plan.md                 # 5-session build plan, estimates vs. actuals & cuts
│   └── schema.md               # PostgreSQL schema, ERD, constraints & 100x scaling
├── schema.sql                  # Production PostgreSQL schema, RLS policies & triggers
└── SUBMISSION.md               # Official submission checklist & reviewer notes
```

---

##  Local Development & Setup

### Prerequisites
- **Node.js**: `v20.x` or later
- **Package Manager**: `npm`, `pnpm`, or `yarn`
- **Database**: Free Supabase project (PostgreSQL 15)

### Step 1: Clone Repository & Install Dependencies
```bash
git clone https://github.com/ShivanshKaushik007/Busy.git
cd Busy
npm install
```

### Step 2: Configure Environment Variables
Create a `.env.local` file in the project root:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Step 3: Initialize Database Schema
1. Open your Supabase project dashboard.
2. Navigate to the **SQL Editor**.
3. Copy the contents of `schema.sql` from the repository root and execute the script.
4. This will provision all 8 tables, custom ENUMs, triggers, and Row Level Security policies.

### Step 4: Run the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

##  Database Setup & Security (RLS)

Busy implements **defense-in-depth**: security is enforced at the database kernel level through PostgreSQL Row Level Security (RLS), preventing unauthorized access even if application code is bypassed:

- `profiles`: Viewable by authenticated users; updateable only by the owner.
- `projects`: Managers can insert, update, archive, and delete. Regular members can only query active projects where they exist in `project_members`.
- `tasks`: Deletion is restricted strictly to managers (`WITH CHECK (public.is_manager())`). Project members can insert and advance statuses.
- `task_history`: Insertable by authenticated users; **UPDATE and DELETE policies are omitted entirely**, rendering the audit trail permanently immutable.
- `dismissed_alerts`: Scoped strictly to the authenticated user (`auth.uid() = user_id`).

---

##  Documentation Index

The repository includes extensive engineering documentation under `docs/` detailing the design, trade-offs, and build log:

| Document | Description |
|---|---|
| [**`docs/architecture.md`**](docs/architecture.md) | Technical topology, runtime breakdown, end-to-end request trace of moving a task to Done, and omitted architectural alternatives. |
| [**`docs/schema.md`**](docs/schema.md) | Complete ERD, column specifications, foreign key cascades, database vs. application constraints, denormalization rationale, and 100x scaling failure analysis. |
| [**`docs/plan.md`**](docs/plan.md) | 5-session execution log across 12-16 hours, build order rationale, planned vs. actual time variance table, and deliberate scope cuts. |
| [**`docs/decisions.md`**](docs/decisions.md) | At least five real decisions weighed (what was chosen, what was rejected, and why), including a major reversed decision (client vs. server-side filtering). |
| [**`docs/ai-prompts.md`**](docs/ai-prompts.md) | Chronological AI prompt log, hallucinations caught, RLS recursive policy fixes, and quality control verification. |
| [**`SUBMISSION.md`**](SUBMISSION.md) | Official submission document featuring live deployment link, demo accounts, 10/10 goal checklist, and candid codebase reflections. |

---

<div align="center">
  <sub>Built with precision and care for the Services Coordination Challenge. Designed to reflect real-world engineering judgment.</sub>
</div>
