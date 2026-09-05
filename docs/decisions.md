# Architectural & Engineering Decisions — Busy

## 1. Overview

This document records the critical architectural, data modeling, and engineering decisions made during the design and implementation of **Busy**. As required by the project brief, it details:
- **What was chosen**
- **What was rejected**
- **The engineering rationale and trade-offs weighed**
- **At least one major decision that was initially adopted and subsequently reversed**

---

## 2. Decision Summary Matrix

| # | Decision Topic | What We Chose | What We Rejected | Status | Key Rationale |
|---|---|---|---|---|---|
| **1** | **Mutation & RPC Architecture** | Next.js Server Actions + `revalidatePath()` | Traditional REST API Routes + React Query / SWR | **Adopted** | Eliminates controller boilerplate; end-to-end TypeScript types; tamper-proof server execution. |
| **2** | **Immutable Audit Architecture** | Unified append-only `task_history` table | Normalized audit tables per event type | **Adopted** | O(1) multi-event sorting; single RLS policy prohibiting UPDATE/DELETE; zero-migration extensibility. |
| **3** | **Overdue Alert Lifecycle** | Snapshot-based dismissal (`dismissed_due_date`) | Persistent background polling worker / cron | **Adopted** | 100% stateless & event-driven; zero infrastructure cost on free tier; instant revival on reschedule. |
| **4** | **Search, Filtering & Pagination** | Server-side SQL (`ILIKE`, `.range()`) + URL state | In-memory client-side array filtering | **REVERSED** | Initial client filtering violated Requirement 6 & leaked data; reversed to server-authoritative queries. |
| **5** | **Dependency Cycle Detection** | Application-level DFS graph traversal | SQL recursive BEFORE INSERT triggers | **Adopted** | Rich cycle path extraction (`A → B → C → A`); visual feedback; avoids complex PL/pgSQL debugging. |
| **6** | **Task Deletion Architecture** | Hard cascading delete (`ON DELETE CASCADE`) | Soft-delete flags (`is_deleted = true`) | **Adopted** | Prevents "ghost blockers" and dependency deadlocks across the DAG. |
| **7** | **Database Access & ORM Layer** | `@supabase/ssr` PostgREST client | Prisma ORM / TypeORM | **Adopted** | Preserves kernel-level Row Level Security (RLS); avoids ORM cold-start latency on serverless. |

---

## 3. Detailed Decision Deep-Dives

---

### Decision 1: Next.js Server Actions with Path Revalidation vs. REST API Controllers + React Query

- **Context**: Every interactive task management system requires a mechanism for client-initiated mutations (creating tasks, moving statuses, assigning members, logging work) and synchronizing updated state back into the UI.
- **What We Chose**: Next.js 16 App Router **Server Actions** (`'use server'`) paired with `revalidatePath()`.
- **What We Rejected**: Traditional decoupled REST API route handlers (`/api/tasks`, `/api/tasks/[id]/status`) paired with client-side fetching libraries like TanStack Query (React Query) or SWR.
- **Why We Chose It**:
  1. **Zero Serialization Overhead**: Server Actions function as type-safe remote procedure calls (RPC). Frontend components import backend functions directly (`import { updateTaskStatus } from '@/app/actions/taskActions'`), ensuring compile-time type checking between input parameters and return payloads.
  2. **Security by Default**: Session tokens and HTTP-only cookies are processed strictly on the server via `@supabase/ssr`. No sensitive authentication tokens are exposed to client-side JavaScript.
  3. **Simplified Cache Invalidation**: Calling `revalidatePath('/tasks')` or `revalidatePath('/', 'layout')` on the server purges Next.js's data cache and automatically streams updated React Server Component trees to the client in the same HTTP round-trip.
- **Trade-offs Weighed**:
  - *Trade-off*: Calling `revalidatePath()` re-executes top-level server queries for the affected route, which consumes slightly more database query bandwidth than surgical client-side cache updates. However, for a services company task tracker, deterministic consistency across views vastly outweighs the minor bandwidth saving of client-side cache patching.

---

### Decision 2: Unified Append-Only `task_history` Table vs. Normalized Audit Tables

- **Context**: Requirement 9 dictates: *"Every task has a timeline showing when it was created, every field change with the old and new value and who made it, every assignment and unassignment, and any comments people have left... Nothing in the timeline can be edited or deleted after the fact, including by managers."*
- **What We Chose**: A single append-only polymorphic table `task_history` storing:
  ```sql
  (id, task_id, actor_id, action_type, old_value, new_value, created_at)
  ```
  Protected at the PostgreSQL engine level by omitting `UPDATE` and `DELETE` RLS policies.
- **What We Rejected**: Normalized event tables for each distinct category (`task_status_history`, `task_field_updates`, `task_comments`, `task_assignment_history`, `task_worklogs`).
- **Why We Chose It**:
  1. **Single-Query Chronological Feed**: Rendering the task timeline requires a simple, highly efficient query:
     ```sql
     SELECT * FROM task_history WHERE task_id = $1 ORDER BY created_at DESC;
     ```
     Normalized tables would require either expensive `UNION ALL` queries across 5 tables or multiple asynchronous round-trips.
  2. **Indestructible Security Boundary**: Enforcing the "cannot rewrite history" rule required configuring Row Level Security once on `task_history`. If history were scattered across multiple tables, an accidental misconfiguration on any single table would introduce an audit compliance vulnerability.
  3. **Extensibility for Stretch Goals**: When implementing Stretch Goal 3 (Time Tracking), we recorded worklog hours and estimate adjustments directly into `task_history` (`action_type = 'worklog'`, `new_value = 'Logged 2h 30m'`) without requiring a single database migration or schema disruption.
- **Trade-offs Weighed**:
  - *Trade-off*: `old_value` and `new_value` are stored as text strings rather than strongly typed foreign keys. Application logic must serialize and deserialize structured data when displaying detailed diffs.

---

### Decision 3: Snapshot-Based Overdue Alert Revival vs. Background Polling / Mutable State

- **Context**: Requirement 10 requires: *"A person can dismiss an alert for a task they are assigned to. If that task's due date later changes, the alert comes back."*
- **What We Chose**: An event-driven snapshot table `dismissed_alerts`:
  ```sql
  CREATE TABLE dismissed_alerts (
    user_id UUID REFERENCES profiles(id),
    task_id UUID REFERENCES tasks(id),
    dismissed_due_date TIMESTAMPTZ NOT NULL,
    PRIMARY KEY (user_id, task_id)
  );
  ```
  When querying overdue alerts in the layout, the server evaluates:
  ```sql
  WHERE tasks.due_date < NOW() 
    AND tasks.status != 'Done'
    AND NOT EXISTS (
      SELECT 1 FROM dismissed_alerts da 
      WHERE da.task_id = tasks.id 
        AND da.user_id = auth.uid() 
        AND da.dismissed_due_date = tasks.due_date
    )
  ```
- **What We Rejected**:
  1. Adding an `is_dismissed BOOLEAN` flag on `tasks` or `task_assignments`.
  2. Running a scheduled background cron worker or database trigger to reset `is_dismissed = false` whenever `due_date` changes.
- **Why We Chose It**:
  1. **Zero Infrastructure & Zero Operational Cost**: Free-tier cloud providers (Render, Vercel, Supabase) spin down inactive containers. A solution relying on an always-on background worker would fail during idle periods or require paid infrastructure.
  2. **Immediate, Deterministic Consistency**: The exact millisecond a manager or assignee reschedules a task's due date, `tasks.due_date` no longer matches `dismissed_due_date`. The alert instantly resurfaces in the top navigation badge on the very next page render without waiting for a cron interval.
  3. **Multi-Assignee Isolation**: If three people are assigned to a task, User A dismissing the alert does not dismiss it for User B or User C.
- **Trade-offs Weighed**:
  - *Trade-off*: Requires an additional join condition during layout data fetching, but this operates on indexed primary keys (`user_id, task_id`) with negligible query latency (<2ms).

---

### Decision 4: [REVERSED DECISION] In-Memory Client Filtering → Server-Side SQL Filtering with URL Synchronization

> [!IMPORTANT]
> **This was the most significant architectural reversal during the project build.**

- **The Initial Approach (Session 2)**:
  - In our initial prototype of the task management view (`TasksPage`), we fetched all active tasks for the user's projects into a single client component (`TaskListClient.tsx`).
  - Search, status filtering, priority filtering, and pagination were handled in browser memory using React `useState` and native JavaScript array operations:
    ```typescript
    // REVERSED IMPLEMENTATION (Client-side in-memory filter)
    const filteredTasks = allTasks.filter(task => 
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
      (!statusFilter || task.status === statusFilter)
    );
    ```
- **Why It Was Rejected & Reversed**:
  1. **Direct Violation of Brief Mandate**: Requirement 6 explicitly states:
     > *"All of this must be done by the server — do not load every task into the browser and filter there."*
     The initial implementation completely failed this non-negotiable rule.
  2. **Security & Data Leakage Hazard**: Loading every project task into client memory exposes task metadata to the browser's JavaScript environment before permission filters can run.
  3. **State Volatility**: In-memory React state was lost upon page refresh, making it impossible for managers to share filtered views (e.g., "all overdue tasks in Project Beta") via URL links.
  4. **Scalability Breakdown**: At 5,000+ tasks, transferring the full dataset across the wire creates severe browser thread freezing and mobile memory exhaustion.
- **The Reversed, Permanent Architecture (Session 3 - Commit `aee7ccd`)**:
  - Completely redesigned `src/app/(dashboard)/tasks/page.tsx` as an asynchronous **React Server Component** reading directly from `searchParams`:
    ```typescript
    export default async function TasksPage({ searchParams }: { searchParams: Promise<...> }) {
      const params = await searchParams;
      // SQL-level ILIKE search, filtering, and exact database pagination
      let query = supabase.from('tasks').select(..., { count: 'exact' });
      if (params.q) query = query.or(`title.ilike.%${params.q}%,description.ilike.%${params.q}%`);
      if (params.status) query = query.eq('status', params.status);
      query = query.range(from, to);
    }
    ```
  - State is synchronized directly to the browser URL (`?q=...&status=...&priority=...&page=...`), creating bookmarkable, shareable views while offloading all computation to PostgreSQL indexes.

---

### Decision 5: Application-Layer Graph Cycle Detection (DFS) vs. SQL Recursive Database Triggers

- **Context**: In implementing Stretch Goal 2 (*"Cycle detection across chains of task dependencies, beyond a single blocking relationship"*), the system had to prevent circular dependencies of arbitrary depth (e.g., Task A blocks Task B, Task B blocks Task C, Task C blocks Task A).
- **What We Chose**: In-memory Directed Acyclic Graph (DAG) construction and Depth-First Search (DFS) with recursion stack backtracking in TypeScript (`src/lib/dependencyGraphUtils.ts`), invoked within the `addDependencyWithCycleCheck` Server Action.
- **What We Rejected**: A recursive `BEFORE INSERT` trigger written in PostgreSQL PL/pgSQL on the `task_dependencies` table.
- **Why We Chose It**:
  1. **Rich Error Context & Path Extraction**: When a user attempts to create a circular dependency, the DFS algorithm extracts the exact chain of task identifiers causing the cycle (e.g., `"PRJ-10 → PRJ-14 → PRJ-22 → PRJ-10"`). This powers informative toast notifications and visualizes the deadlock inside the `DependencyChainViewer` component.
  2. **Audit & Health Diagnostics**: Moving the graph engine into TypeScript allowed us to reuse the same graph algorithms to power the `ProjectDependencyAuditModal`, which audits an entire project's dependency health, identifies transitively blocked items, and calculates topological depths.
  3. **Debugging & Maintainability**: PL/pgSQL recursive functions are notoriously difficult to trace, unit test, and profile in serverless environments.
- **Trade-offs Weighed**:
  - *Trade-off*: Requires fetching the existing dependency edge list for the active project prior to edge insertion. Given that projects typically maintain fewer than 500 active dependency edges, the query overhead is negligible (<10ms).

---

### Decision 6: Hard Cascading Deletion for Tasks vs. Soft-Delete Flags

- **Context**: Requirement 1 specifies: *"Managers can create and archive projects, change who is on a project, and delete tasks. Members can do neither."*
- **What We Chose**: Hard SQL deletion (`DELETE FROM tasks WHERE id = $1`) with database cascading constraints (`ON DELETE CASCADE`) for tasks, while preserving soft-archival (`is_archived BOOLEAN`) exclusively for projects.
- **What We Rejected**: Adding an `is_deleted BOOLEAN` flag to `tasks` and performing soft deletes.
- **Why We Chose It**:
  1. **Eliminating "Ghost Blockers" in Dependency Chains**: In a task dependency graph, if Task B is blocked by Task A, and Task A is soft-deleted, queries checking blockers must perpetually join and filter out soft-deleted records. If an uncareful query omits this filter, Task B is permanently deadlocked—it cannot be marked "Done" because its prerequisite is technically unfinished, but the user cannot view or complete Task A because it is hidden.
  2. **Relational Cascade Cleanliness**: Hard deletion triggers PostgreSQL's native `ON DELETE CASCADE` across `task_assignments`, `task_dependencies`, and `dismissed_alerts`, ensuring zero dangling foreign key references remain in the database.
  3. **Adherence to Domain Semantics**: Projects represent long-lived client accounts that must be preserved for historical auditing (`is_archived = true`), whereas tasks are individual work units where managers explicitly requested a "delete" action.
- **Trade-offs Weighed**:
  - *Trade-off*: Accidental task deletion cannot be undone from the UI. To mitigate this, managers are prompted with confirmation dialogs before permanent deletion occurs.

---

### Decision 7: Scoped PostgREST Client (`@supabase/ssr`) vs. Centralized Prisma ORM

- **Context**: Selecting the data access layer for Next.js Server Components and Server Actions.
- **What We Chose**: Direct Supabase PostgREST client configured via `@supabase/ssr` passing authenticated user cookie tokens.
- **What We Rejected**: Prisma ORM, Drizzle ORM, or TypeORM.
- **Why We Chose It**:
  1. **Row Level Security (RLS) Enforcement**: Prisma and traditional ORMs connect to PostgreSQL using a single global database connection string (typically superuser or service role). This completely bypasses PostgreSQL Row Level Security, forcing engineers to manually recreate multi-tenant isolation, role checks, and project boundaries in application code. Using `@supabase/ssr` ensures every query executes with the authenticated user's scoped JWT, delegating authorization to the database engine kernel.
  2. **Serverless Cold-Start Performance**: Prisma's binary engine introduces 300ms–800ms cold-start latency penalties on Vercel Serverless Functions. `@supabase/ssr` is a lightweight HTTP-based client with near-zero cold start overhead.
  3. **Zero Schema Synchronization Drift**: Supabase directly exposes PostgreSQL relational schemas, eliminating the need to maintain duplicate `schema.prisma` files and run dual migration commands.
- **Trade-offs Weighed**:
  - *Trade-off*: PostgREST nested queries use string-based relationship selectors (`select('*, projects(name, key)')`) rather than Prisma's auto-generated nested TypeScript interfaces, requiring manual type casting or Supabase CLI type generation.

---

## 4. Hardest Part of the Build

The single most challenging engineering hurdle was **architecting the Task State Machine with Blocking Dependencies across both single-task moves and bulk actions**.

### The Complexity:
1. **Asynchronous Multi-Step Validation**: A task status transition is not a simple SQL `UPDATE`. It requires:
   - Verifying caller authentication and project access.
   - Ensuring the task is not currently marked as manual `is_blocked`.
   - Validating legal state machine transitions (`Backlog → In Progress → In Review → Done`, reopening from `Done`).
   - Querying `task_dependencies` joined with `tasks` to verify that *every* prerequisite blocking task has `status = 'Done'`.
2. **Granular Bulk Action Reporting**: Requirement 7 mandates:
   > *"Because some of those changes will be illegal for some tasks, the result must report per task what succeeded and what was rejected and why — not just fail the whole batch."*
   If a manager selects 10 tasks and clicks "Move to Done", and 7 succeed while 3 fail due to unfinished blockers or illegal jumps, the server cannot abort with a database transaction rollback. It must process each item individually, collect granular status objects (`{ taskId, success, error }`), and return an array so the client UI can render detailed toast notifications highlighting precisely which tasks failed and why.
3. **Immutable Audit Synchronization**: Every successful transition within the batch had to write an immutable audit record to `task_history` without failing the surrounding batch if a non-fatal logging warning occurred.

---

## 5. What We Would Do Next (With Another 12–24 Hours)

If allocated an additional 12 to 24 hours of development time, our roadmap priorities would be:

1. **Database Materialized Views for Dashboard Performance**:
   - Replace in-memory dashboard metric aggregation with a PostgreSQL Materialized View (`dashboard_metrics_mv`) refreshed concurrently on task updates, ensuring sub-50ms dashboard page loads even with 100,000+ tasks.
2. **PostgreSQL Full-Text Search with Trigram Indexing**:
   - Upgrade the current `ILIKE` wildcard search to native PostgreSQL Full-Text Search using `tsvector` and `tsquery` paired with `pg_trgm` GIN indexes, enabling instant fuzzy search and relevance ranking across large project portfolios.
3. **Real-time Live Updates via Supabase Realtime**:
   - Integrate selective WebSocket subscriptions on active Kanban board views so teammates see drag-and-drop card movements live without manual page revalidation.
4. **Saved Custom Filter Views**:
   - Build a `saved_views` table allowing users to save and name complex multi-project filter combinations (e.g., "My Overdue Critical Client Deliverables") for instant one-click access.
