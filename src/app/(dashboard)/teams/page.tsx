import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import TeamsClient from '@/app/(dashboard)/teams/TeamsClient'
import { verifyManagerRole } from '@/app/actions/projectActions'

export default async function TeamsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { isManager } = await verifyManagerRole()

  // Fetch projects with members, owner, and task assignments
  let projectsQuery = supabase
    .from('projects')
    .select(`
      id,
      key,
      name,
      description,
      owner_id,
      is_archived,
      created_at,
      profiles!projects_owner_id_fkey ( id, full_name, email, role ),
      project_members (
        user_id,
        created_at,
        profiles ( id, full_name, email, role )
      ),
      tasks (
        id,
        title,
        status,
        task_assignments ( user_id )
      )
    `)
    .order('name')

  // If regular member, only fetch projects they belong to that are active
  if (!isManager) {
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

  // If manager, fetch all system profiles for team assignment management
  let allProfiles: any[] = []
  if (isManager) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, email, role')
      .order('full_name')
    allProfiles = profiles || []
  }

  return (
    <TeamsClient
      initialProjects={projects || []}
      isManager={isManager}
      allProfiles={allProfiles}
      currentUserId={user.id}
    />
  )
}
