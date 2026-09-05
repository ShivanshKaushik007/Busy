import { formatShortDate, formatDateTime } from './dateUtils'

export interface DigestOptions {
  scope?: 'personal' | 'portfolio'
  excludeDismissed?: boolean
  targetUserId?: string
}

export interface BlockingTaskInfo {
  id: string
  title: string
  status: string
}

export interface AssigneeInfo {
  id: string
  fullName: string
  email: string
}

export interface OverdueTaskItem {
  id: string
  title: string
  priority: 'Low' | 'Medium' | 'High'
  status: string
  dueDate: string
  formattedDueDate: string
  daysOverdue: number
  urgencyBucket: 'critical' | 'moderate' | 'recent'
  isBlocked: boolean
  blockingTasks: BlockingTaskInfo[]
  assignees: AssigneeInfo[]
  projectId: string
  projectKey: string
  projectName: string
}

export interface OverdueProjectGroup {
  projectId: string
  projectKey: string
  projectName: string
  tasks: OverdueTaskItem[]
  overdueCount: number
  criticalCount: number
}

export interface AssigneeSummary {
  userId: string
  fullName: string
  email: string
  overdueCount: number
}

export interface OverdueDigestData {
  recipient: {
    id: string
    fullName: string
    email: string
    role: string
  }
  scope: 'personal' | 'portfolio'
  generatedAt: string
  formattedGeneratedAt: string
  metrics: {
    totalOverdue: number
    criticalCount: number
    blockedCount: number
    longestOverdueDays: number
    projectsCount: number
  }
  projectGroups: OverdueProjectGroup[]
  allTasks: OverdueTaskItem[]
  assigneeSummaries?: AssigneeSummary[]
}

/**
 * Fetch and assemble all overdue digest data for a user or portfolio
 */
export async function fetchOverdueDigestData(
  supabase: any,
  currentUserId: string,
  userRole: string = 'member',
  options: DigestOptions = {}
): Promise<OverdueDigestData> {
  const targetUserId = options.targetUserId || currentUserId
  const isManager = userRole === 'manager'
  const scope = (isManager && options.scope === 'portfolio') ? 'portfolio' : 'personal'
  const excludeDismissed = options.excludeDismissed ?? true

  // 1. Fetch recipient profile
  const { data: recipientProfile } = await supabase
    .from('profiles')
    .select('id, full_name, email, role')
    .eq('id', targetUserId)
    .single()

  const recipient = {
    id: targetUserId,
    fullName: recipientProfile?.full_name || 'Team Member',
    email: recipientProfile?.email || 'user@example.com',
    role: recipientProfile?.role || userRole
  }

  const now = new Date()
  const nowIso = now.toISOString()

  let rawTasks: any[] = []

  if (scope === 'portfolio') {
    // Managers can see all overdue tasks across all active projects
    const { data: portfolioTasks } = await supabase
      .from('tasks')
      .select(`
        id,
        title,
        status,
        priority,
        due_date,
        is_blocked,
        project_id,
        projects!inner(id, key, name, is_archived),
        task_assignments(user_id, profiles(id, full_name, email)),
        task_dependencies!task_dependencies_task_id_fkey(
          blocks_task:tasks!task_dependencies_blocks_task_id_fkey(id, title, status)
        )
      `)
      .neq('status', 'Done')
      .lt('due_date', nowIso)
      .eq('projects.is_archived', false)
      .order('due_date', { ascending: true })

    rawTasks = portfolioTasks || []
  } else {
    // Individual member digest: overdue tasks assigned to this user
    const { data: assignedRows } = await supabase
      .from('task_assignments')
      .select(`
        task_id,
        tasks!inner(
          id,
          title,
          status,
          priority,
          due_date,
          is_blocked,
          project_id,
          projects!inner(id, key, name, is_archived),
          task_assignments(user_id, profiles(id, full_name, email)),
          task_dependencies!task_dependencies_task_id_fkey(
            blocks_task:tasks!task_dependencies_blocks_task_id_fkey(id, title, status)
          )
        )
      `)
      .eq('user_id', targetUserId)
      .neq('tasks.status', 'Done')
      .lt('tasks.due_date', nowIso)
      .eq('tasks.projects.is_archived', false)

    rawTasks = (assignedRows || []).map((row: any) => row.tasks)

    // Optional dismissal check
    if (excludeDismissed && rawTasks.length > 0) {
      const { data: dismissedRows } = await supabase
        .from('dismissed_alerts')
        .select('task_id, dismissed_due_date')
        .eq('user_id', targetUserId)

      if (dismissedRows && dismissedRows.length > 0) {
        rawTasks = rawTasks.filter((task: any) => {
          const isDismissed = dismissedRows.some((d: any) =>
            d.task_id === task.id &&
            task.due_date &&
            new Date(d.dismissed_due_date).getTime() === new Date(task.due_date).getTime()
          )
          return !isDismissed
        })
      }
    }
  }

  // 2. Transform into clean OverdueTaskItem objects
  let longestOverdueDays = 0
  let criticalCount = 0
  let blockedCount = 0

  const allTasks: OverdueTaskItem[] = rawTasks.map((t: any) => {
    const dueDateObj = new Date(t.due_date)
    const diffMs = now.getTime() - dueDateObj.getTime()
    const daysOverdue = Math.max(1, Math.floor(diffMs / (1000 * 60 * 60 * 24)))

    if (daysOverdue > longestOverdueDays) {
      longestOverdueDays = daysOverdue
    }

    let urgencyBucket: 'critical' | 'moderate' | 'recent' = 'recent'
    if (daysOverdue > 7 || t.priority === 'High') {
      urgencyBucket = 'critical'
      criticalCount++
    } else if (daysOverdue >= 2) {
      urgencyBucket = 'moderate'
    }

    if (t.is_blocked) {
      blockedCount++
    }

    // Extract assignees
    const assignees: AssigneeInfo[] = (t.task_assignments || [])
      .map((ta: any) => ta.profiles)
      .filter(Boolean)
      .map((p: any) => ({
        id: p.id,
        fullName: p.full_name || 'Anonymous',
        email: p.email || ''
      }))

    // Extract blocking tasks
    const blockingTasks: BlockingTaskInfo[] = (t.task_dependencies || [])
      .map((td: any) => td.blocks_task)
      .filter(Boolean)
      .map((bt: any) => ({
        id: bt.id,
        title: bt.title,
        status: bt.status
      }))

    return {
      id: t.id,
      title: t.title,
      priority: t.priority as 'Low' | 'Medium' | 'High',
      status: t.status,
      dueDate: t.due_date,
      formattedDueDate: formatShortDate(t.due_date),
      daysOverdue,
      urgencyBucket,
      isBlocked: !!t.is_blocked,
      blockingTasks,
      assignees,
      projectId: t.projects?.id || t.project_id,
      projectKey: t.projects?.key || 'TASK',
      projectName: t.projects?.name || 'Project'
    }
  })

  // Sort by days overdue descending (most urgent first)
  allTasks.sort((a, b) => b.daysOverdue - a.daysOverdue)

  // 3. Group by Project
  const projectMap = new Map<string, OverdueProjectGroup>()
  for (const task of allTasks) {
    let group = projectMap.get(task.projectId)
    if (!group) {
      group = {
        projectId: task.projectId,
        projectKey: task.projectKey,
        projectName: task.projectName,
        tasks: [],
        overdueCount: 0,
        criticalCount: 0
      }
      projectMap.set(task.projectId, group)
    }
    group.tasks.push(task)
    group.overdueCount++
    if (task.urgencyBucket === 'critical') {
      group.criticalCount++
    }
  }

  const projectGroups = Array.from(projectMap.values())

  // 4. If portfolio scope, compute assignee breakdown
  let assigneeSummaries: AssigneeSummary[] | undefined
  if (scope === 'portfolio') {
    const assigneeMap = new Map<string, AssigneeSummary>()
    for (const task of allTasks) {
      if (task.assignees.length === 0) {
        let unassigned = assigneeMap.get('unassigned')
        if (!unassigned) {
          unassigned = {
            userId: 'unassigned',
            fullName: 'Unassigned',
            email: 'none',
            overdueCount: 0
          }
          assigneeMap.set('unassigned', unassigned)
        }
        unassigned.overdueCount++
      } else {
        for (const assignee of task.assignees) {
          let summary = assigneeMap.get(assignee.id)
          if (!summary) {
            summary = {
              userId: assignee.id,
              fullName: assignee.fullName,
              email: assignee.email,
              overdueCount: 0
            }
            assigneeMap.set(assignee.id, summary)
          }
          summary.overdueCount++
        }
      }
    }
    assigneeSummaries = Array.from(assigneeMap.values()).sort(
      (a, b) => b.overdueCount - a.overdueCount
    )
  }

  return {
    recipient,
    scope,
    generatedAt: nowIso,
    formattedGeneratedAt: formatDateTime(nowIso),
    metrics: {
      totalOverdue: allTasks.length,
      criticalCount,
      blockedCount,
      longestOverdueDays,
      projectsCount: projectGroups.length
    },
    projectGroups,
    allTasks,
    assigneeSummaries
  }
}
