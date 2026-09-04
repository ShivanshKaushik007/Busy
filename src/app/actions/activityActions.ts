'use server'

import { createClient } from '@/utils/supabase/server'
import { verifyManagerRole } from './projectActions'
import { getUserProjects } from './taskActions'

export type ActivityActionCategory = 
  | 'all' 
  | 'comment' 
  | 'status_change' 
  | 'assignment' 
  | 'blocked' 
  | 'created' 
  | 'details'

export interface ActivityFilterOptions {
  projectId?: string
  actionCategory?: ActivityActionCategory
  actorId?: string
  searchQuery?: string
  limit?: number
  offset?: number
}

export interface ActivityFeedItem {
  id: string
  task_id: string
  actor_id: string
  action_type: string
  old_value: string | null
  new_value: string | null
  created_at: string
  profiles?: {
    id: string
    full_name?: string
    email?: string
    role?: string
  } | null
  tasks?: {
    id: string
    title: string
    status: string
    priority: string
    project_id: string
    is_blocked?: boolean
    projects?: {
      id: string
      name: string
      key: string
    } | null
  } | null
}

export interface ActivityFeedStats {
  totalEvents: number
  commentsCount: number
  statusChangesCount: number
  activeContributors: number
}

export async function getActivityFeed(options: ActivityFilterOptions = {}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { items: [], total: 0, hasMore: false, stats: { totalEvents: 0, commentsCount: 0, statusChangesCount: 0, activeContributors: 0 }, error: 'Not authenticated' }
  }

  const { isManager } = await verifyManagerRole()
  const availableProjects = await getUserProjects()
  const allowedProjectIds = availableProjects.map(p => p.id)

  if (!isManager && allowedProjectIds.length === 0) {
    return { 
      items: [], 
      total: 0, 
      hasMore: false, 
      stats: { totalEvents: 0, commentsCount: 0, statusChangesCount: 0, activeContributors: 0 } 
    }
  }

  const limit = options.limit || 40
  const offset = options.offset || 0

  // Base query on task_history joining tasks and projects
  let query = supabase
    .from('task_history')
    .select(`
      id,
      task_id,
      actor_id,
      action_type,
      old_value,
      new_value,
      created_at,
      profiles ( id, full_name, email, role ),
      tasks!inner (
        id,
        title,
        status,
        priority,
        project_id,
        is_blocked,
        projects!inner ( id, name, key )
      )
    `, { count: 'exact' })

  // 1. Project filtering & role visibility check
  if (options.projectId && options.projectId !== 'all') {
    if (!isManager && !allowedProjectIds.includes(options.projectId)) {
      return { items: [], total: 0, hasMore: false, stats: { totalEvents: 0, commentsCount: 0, statusChangesCount: 0, activeContributors: 0 }, error: 'Unauthorized project' }
    }
    query = query.eq('tasks.project_id', options.projectId)
  } else if (!isManager) {
    query = query.in('tasks.project_id', allowedProjectIds)
  }

  // 2. Action Category filter
  if (options.actionCategory && options.actionCategory !== 'all') {
    if (options.actionCategory === 'comment') {
      query = query.eq('action_type', 'comment')
    } else if (options.actionCategory === 'status_change') {
      query = query.eq('action_type', 'status_change')
    } else if (options.actionCategory === 'assignment') {
      query = query.in('action_type', ['assignment', 'unassignment'])
    } else if (options.actionCategory === 'blocked') {
      query = query.in('action_type', ['blocked_change', 'added_blocker', 'removed_blocker'])
    } else if (options.actionCategory === 'created') {
      query = query.eq('action_type', 'created')
    } else if (options.actionCategory === 'details') {
      query = query.like('action_type', 'updated_%')
    }
  }

  // 3. Actor filter
  if (options.actorId && options.actorId !== 'all') {
    query = query.eq('actor_id', options.actorId)
  }

  // 4. Order and pagination
  query = query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  const { data, count, error } = await query

  if (error) {
    console.error('Error fetching activity feed:', error)
    return { items: [], total: 0, hasMore: false, stats: { totalEvents: 0, commentsCount: 0, statusChangesCount: 0, activeContributors: 0 }, error: error.message }
  }

  let items: ActivityFeedItem[] = (data || []).map((item: any) => ({
    id: item.id,
    task_id: item.task_id,
    actor_id: item.actor_id,
    action_type: item.action_type,
    old_value: item.old_value,
    new_value: item.new_value,
    created_at: item.created_at,
    profiles: Array.isArray(item.profiles) ? item.profiles[0] : item.profiles,
    tasks: Array.isArray(item.tasks) ? item.tasks[0] : item.tasks
  }))

  // 5. Client search query if provided (filtering on title, task key, or comment text)
  if (options.searchQuery && options.searchQuery.trim()) {
    const q = options.searchQuery.toLowerCase().trim()
    items = items.filter(item => {
      const taskTitle = item.tasks?.title?.toLowerCase() || ''
      const projectKey = item.tasks?.projects?.key?.toLowerCase() || ''
      const actorName = item.profiles?.full_name?.toLowerCase() || item.profiles?.email?.toLowerCase() || ''
      const content = (item.new_value || '').toLowerCase()
      const issueKey = item.tasks?.id ? `${projectKey}-${item.tasks.id.slice(0, 4)}`.toLowerCase() : ''
      return taskTitle.includes(q) || projectKey.includes(q) || actorName.includes(q) || content.includes(q) || issueKey.includes(q)
    })
  }

  // 6. Compute workspace activity summary statistics
  const total = count || items.length
  const hasMore = offset + items.length < (count || 0)

  // Calculate quick stats across returned items or sample
  let commentsCount = 0
  let statusChangesCount = 0
  const uniqueContributors = new Set<string>()

  items.forEach(item => {
    if (item.action_type === 'comment') commentsCount++
    if (item.action_type === 'status_change') statusChangesCount++
    if (item.actor_id) uniqueContributors.add(item.actor_id)
  })

  return {
    items,
    total,
    hasMore,
    stats: {
      totalEvents: total,
      commentsCount,
      statusChangesCount,
      activeContributors: uniqueContributors.size
    }
  }
}
