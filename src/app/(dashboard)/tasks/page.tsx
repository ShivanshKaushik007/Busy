import { createClient } from '@/utils/supabase/server'
import TaskListClient from './TaskListClient'
import { Task, TaskPriority, TaskStatus } from '@/lib/types'
import { verifyManagerRole } from '@/app/actions/projectActions'
import { getUserProjects } from '@/app/actions/taskActions'

export default async function TasksPage({ 
  searchParams 
}: { 
  searchParams: Promise<{ [key: string]: string | string[] | undefined }> 
}) {
  const supabase = await createClient()
  const params = await searchParams
  const { isManager, user } = await verifyManagerRole()

  // Parse search params
  const query = typeof params.q === 'string' ? params.q : ''
  const status = typeof params.status === 'string' ? params.status : ''
  const priority = typeof params.priority === 'string' ? params.priority : ''
  const projectParam = typeof params.project === 'string' ? params.project : ''
  const assigneeParam = typeof params.assignee === 'string' ? params.assignee : ''
  const assignedToMe = params.assignedToMe === 'true' || assigneeParam === 'me'
  const filterAssigneeId = assignedToMe ? user?.id : (assigneeParam || null)
  const overdue = params.overdue === 'true'
  const sort = typeof params.sort === 'string' ? params.sort : 'updated_at' // default sort
  
  // Available projects for the viewer
  const availableProjects = await getUserProjects()
  const allowedProjectIds = availableProjects.map(p => p.id)

  // Fetch team members across allowed projects for the Assignee filter dropdown
  const { data: memberProfiles } = await supabase
    .from('project_members')
    .select('user_id, profiles!inner(id, full_name, email)')
    .in('project_id', allowedProjectIds.length > 0 ? allowedProjectIds : ['00000000-0000-0000-0000-000000000000'])

  const teamMembersMap = new Map<string, { id: string; name: string }>()
  for (const m of memberProfiles || []) {
    const prof = (m as any).profiles
    if (prof && !teamMembersMap.has(prof.id)) {
      teamMembersMap.set(prof.id, { id: prof.id, name: prof.full_name || prof.email })
    }
  }
  const teamMembers = Array.from(teamMembersMap.values())

  // Pagination
  const page = typeof params.page === 'string' ? parseInt(params.page) : 1
  const limit = 10
  const from = (page - 1) * limit
  const to = from + limit - 1

  // Start building the query with server-side filtering
  const selectClause = `
    *,
    projects ( id, name, key ),
    task_assignments${filterAssigneeId ? '!inner' : ''} ( 
      user_id,
      profiles ( id, full_name, email )
    )
  `
  let supabaseQuery = supabase
    .from('tasks')
    .select(selectClause, { count: 'exact' }) // Request total count for pagination!

  // SERVER-SIDE ROLE ISOLATION (Requirement 1 & 6)
  if (!isManager) {
    supabaseQuery = supabaseQuery.in(
      'project_id', 
      allowedProjectIds.length > 0 ? allowedProjectIds : ['00000000-0000-0000-0000-000000000000']
    )
  }

  // Filter by Assignee (Requirement 5 & 6)
  if (filterAssigneeId) {
    supabaseQuery = supabaseQuery.eq('task_assignments.user_id', filterAssigneeId)
  }

  // Filter by specific project if selected
  if (projectParam) {
    supabaseQuery = supabaseQuery.eq('project_id', projectParam)
  }

  // Apply Text Search (Titles and Descriptions)
  if (query) {
    supabaseQuery = supabaseQuery.or(`title.ilike.%${query}%,description.ilike.%${query}%`)
  }

  // Apply Status Filter
  if (status) {
    supabaseQuery = supabaseQuery.eq('status', status)
  }

  // Apply Priority Filter
  if (priority) {
    supabaseQuery = supabaseQuery.eq('priority', priority)
  }

  // Apply Overdue Filter (Not done AND past due date)
  if (overdue) {
    supabaseQuery = supabaseQuery.neq('status', 'Done').lt('due_date', new Date().toISOString())
  }

  // Apply Sorting
  if (sort === 'due_date') {
    supabaseQuery = supabaseQuery.order('due_date', { ascending: true })
  } else if (sort === 'priority') {
    // Note: Priority sorting might require custom logic in Postgres depending on Enum setup, 
    // but we will use standard sorting for now.
    supabaseQuery = supabaseQuery.order('priority', { ascending: false })
  } else {
    // Default: last update
    supabaseQuery = supabaseQuery.order('updated_at', { ascending: false })
  }

  // Apply Pagination
  supabaseQuery = supabaseQuery.range(from, to)

  // Execute Query
  const { data: tasks, count, error } = await supabaseQuery

  const activeProject = availableProjects.find(p => p.id === projectParam)

  return (
    <TaskListClient 
      initialTasks={tasks || []} 
      totalCount={count || 0}
      currentPage={page}
      currentSort={sort}
      projects={availableProjects}
      teamMembers={teamMembers}
      currentUserId={user?.id}
      activeProject={activeProject}
    />
  )
}
