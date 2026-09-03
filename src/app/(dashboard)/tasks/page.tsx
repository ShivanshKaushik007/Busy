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
  const overdue = params.overdue === 'true'
  const sort = typeof params.sort === 'string' ? params.sort : 'updated_at' // default sort
  
  // Available projects for the viewer
  const availableProjects = await getUserProjects()
  const allowedProjectIds = availableProjects.map(p => p.id)

  // Pagination
  const page = typeof params.page === 'string' ? parseInt(params.page) : 1
  const limit = 10
  const from = (page - 1) * limit
  const to = from + limit - 1

  // Start building the query
  let supabaseQuery = supabase
    .from('tasks')
    .select(`
      *,
      projects ( id, name, key ),
      task_assignments ( user_id )
    `, { count: 'exact' }) // Request total count for pagination!

  // SERVER-SIDE ROLE ISOLATION (Requirement 1 & 6)
  // "Members can do neither, and only see projects they belong to."
  if (!isManager) {
    supabaseQuery = supabaseQuery.in(
      'project_id', 
      allowedProjectIds.length > 0 ? allowedProjectIds : ['00000000-0000-0000-0000-000000000000']
    )
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
    <div className="space-y-6">
      <div className="space-y-1">
        <nav className="text-sm text-gray-500 mb-2">
          Projects / {activeProject ? `${activeProject.name}` : 'Company Portfolio'} / <span className="text-gray-900 font-medium">Issues</span>
        </nav>
        <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
          {activeProject ? `[${activeProject.key}] ${activeProject.name}` : 'All Tasks'}
        </h2>
      </div>

      {/* 
        We pass the STRICTLY server-filtered data to the client component,
        which handles the interactive table checkboxes and dropdowns!
      */}
      <TaskListClient 
        initialTasks={tasks || []} 
        totalCount={count || 0}
        currentPage={page}
        currentSort={sort}
        projects={availableProjects}
      />
    </div>
  )
}
