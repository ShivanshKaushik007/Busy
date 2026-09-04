import { createClient } from '@/utils/supabase/server'
import { getUserProjects } from '@/app/actions/taskActions'
import { getActivityFeed } from '@/app/actions/activityActions'
import ActivityFeedClient from './ActivityFeedClient'

export const dynamic = 'force-dynamic'

export default async function ActivityPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // 1. Fetch available projects for current user
  const projects = await getUserProjects()

  // 2. Fetch all workspace profiles for the contributor filter
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, email, role')
    .order('full_name')

  // 3. Fetch initial feed items across projects
  const feedData = await getActivityFeed({ limit: 40 })

  return (
    <ActivityFeedClient
      initialItems={feedData.items}
      initialStats={feedData.stats}
      initialTotal={feedData.total}
      initialHasMore={feedData.hasMore}
      projects={projects || []}
      members={profiles || []}
      currentUserId={user?.id}
    />
  )
}
