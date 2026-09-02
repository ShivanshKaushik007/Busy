import { createClient } from '@/utils/supabase/server'
import ProjectsClient from './ProjectsClient'
import { verifyManagerRole } from '@/app/actions/projectActions'

export default async function ProjectsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { isManager } = await verifyManagerRole()

  let projectsQuery = supabase
    .from('projects')
    .select(`
      *,
      project_members ( user_id ),
      tasks ( id )
    `)
    .order('created_at', { ascending: false })

  // If regular member, only fetch projects they belong to AND are not archived
  if (!isManager && user) {
    const { data: userMemberships } = await supabase
      .from('project_members')
      .select('project_id')
      .eq('user_id', user.id)

    const allowedIds = (userMemberships || []).map(m => m.project_id)
    projectsQuery = projectsQuery
      .in('id', allowedIds.length > 0 ? allowedIds : ['00000000-0000-0000-0000-000000000000'])
      .eq('is_archived', false)
  }

  const { data: projects } = await projectsQuery

  // If manager, fetch all profiles for project team assignment
  let allProfiles: any[] = []
  if (isManager) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, email, role')
      .order('full_name')
    allProfiles = profiles || []
  }

  return (
    <ProjectsClient 
      initialProjects={projects || []} 
      isManager={isManager} 
      allProfiles={allProfiles} 
    />
  )
}
