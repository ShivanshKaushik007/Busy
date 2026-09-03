import { createClient } from '@/utils/supabase/server'
import BoardClient from './BoardClient'
import { getUserProjects } from '@/app/actions/taskActions'

export default async function BoardPage({
  searchParams
}: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const supabase = await createClient()
  const params = searchParams ? await searchParams : {}
  const defaultProject = typeof params.project === 'string' ? params.project : ''

  // Fetch available projects
  const projects = await getUserProjects()
  const projectIds = projects.map(p => p.id)

  // Fetch tasks for these projects
  const { data: tasks } = await supabase
    .from('tasks')
    .select(`
      *,
      projects ( id, name, key ),
      task_assignments ( user_id )
    `)
    .in('project_id', projectIds.length > 0 ? projectIds : ['00000000-0000-0000-0000-000000000000'])
    .order('updated_at', { ascending: false })

  return (
    <BoardClient 
      initialTasks={tasks || []} 
      projects={projects} 
      defaultProject={defaultProject}
    />
  )
}
