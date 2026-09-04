'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { TaskPriority, TaskStatus } from '@/lib/types'
import { verifyManagerRole } from './projectActions'

// 0. Fetch projects available to the current user
// "Archiving hides a project from the default views without destroying its data or its tasks."
export async function getUserProjects(includeArchived: boolean = false) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { isManager } = await verifyManagerRole()

  if (isManager) {
    let query = supabase
      .from('projects')
      .select('id, name, key, is_archived, owner_id')
      .order('name')
    
    if (!includeArchived) {
      query = query.eq('is_archived', false)
    }

    const { data: projects } = await query
    return projects || []
  }

  // Members only see active projects they belong to
  let query = supabase
    .from('project_members')
    .select('projects!inner(id, name, key, is_archived, owner_id)')
    .eq('user_id', user.id)

  if (!includeArchived) {
    query = query.eq('projects.is_archived', false)
  }

  const { data: memberships } = await query
  return (memberships || []).map((m: any) => m.projects)
}

// Fetch complete task details including history, blockers, assignees, and project context
export async function getTaskDetail(taskId: string) {
  const supabase = await createClient()

  // 1. Task details
  const { data: task, error } = await supabase
    .from('tasks')
    .select(`
      *,
      projects ( id, name, key ),
      task_assignments ( user_id, profiles ( id, full_name, email ) )
    `)
    .eq('id', taskId)
    .single()

  if (error || !task) {
    console.error('getTaskDetail error:', error)
    return null
  }

  // 1b. Fetch dependencies safely
  const { data: dependencies } = await supabase
    .from('task_dependencies')
    .select('blocks_task_id')
    .eq('task_id', taskId)

  let taskDependencies: any[] = []
  if (dependencies && dependencies.length > 0) {
    const blockerIds = dependencies.map(d => d.blocks_task_id)
    const { data: blockerTasks } = await supabase
      .from('tasks')
      .select('id, title, status')
      .in('id', blockerIds)

    taskDependencies = dependencies.map(d => ({
      blocks_task_id: d.blocks_task_id,
      tasks: blockerTasks?.find(bt => bt.id === d.blocks_task_id)
    }))
  }
  ;(task as any).task_dependencies = taskDependencies

  // 2. Timeline history
  const { data: history } = await supabase
    .from('task_history')
    .select(`
      *,
      profiles ( full_name, email )
    `)
    .eq('task_id', taskId)
    .order('created_at', { ascending: false })

  // 3. User role check for delete permission
  const { isManager } = await verifyManagerRole()

  // 4. Project context for editing assignees and blockers
  const { data: projectMembers } = await supabase
    .from('project_members')
    .select('user_id, profiles!inner(id, full_name, email)')
    .eq('project_id', task.project_id)

  const { data: projectTasks } = await supabase
    .from('tasks')
    .select('id, title, status')
    .eq('project_id', task.project_id)
    .neq('id', taskId)

  return {
    task,
    history: history || [],
    isManager,
    projectMembers: (projectMembers || []).map((m: any) => m.profiles),
    availableBlockers: projectTasks || []
  }
}

// Fetch members and tasks for a selected project
export async function getProjectMembersAndTasks(projectId: string) {
  const supabase = await createClient()
  
  // Members
  const { data: members } = await supabase
    .from('project_members')
    .select('user_id, profiles!inner(id, full_name, email)')
    .eq('project_id', projectId)

  // Tasks in this project (to be chosen as blockers)
  const { data: tasks } = await supabase
    .from('tasks')
    .select('id, title, status')
    .eq('project_id', projectId)
    .neq('status', 'Done')

  return {
    members: (members || []).map((m: any) => m.profiles),
    tasks: tasks || []
  }
}

// Helper function to check if a status transition is legal
export async function checkLegalTransition(currentStatus: TaskStatus, newStatus: TaskStatus): Promise<{ valid: boolean; reason?: string }> {
  if (currentStatus === newStatus) return { valid: true }

  const validTransitions: Record<TaskStatus, TaskStatus[]> = {
    'Backlog': ['In Progress'],
    'In Progress': ['In Review', 'Backlog'],
    'In Review': ['Done', 'In Progress'],
    'Done': ['Backlog', 'In Progress'] // A finished task can be reopened
  }

  if (validTransitions[currentStatus]?.includes(newStatus)) {
    return { valid: true }
  }

  return { 
    valid: false, 
    reason: `Illegal transition: Cannot move task from ${currentStatus} directly to ${newStatus}. Permitted moves: ${validTransitions[currentStatus]?.join(', ') || 'None'}.` 
  }
}

// 1. Create a Task
export async function createTask(data: {
  projectId: string
  title: string
  description?: string
  priority?: TaskPriority
  dueDate?: string | null
  assignedUserIds?: string[]
  blockingTaskIds?: string[]
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'You must be signed in to create a task.' }
  }

  if (!data.title?.trim()) {
    return { error: 'Task title is required.' }
  }

  if (!data.projectId) {
    return { error: 'Project is required.' }
  }

  // Verify that the user is a member or manager of this project
  const { data: membership } = await supabase
    .from('project_members')
    .select('user_id')
    .eq('project_id', data.projectId)
    .eq('user_id', user.id)
    .single()

  const { isManager } = await verifyManagerRole()

  if (!membership && !isManager) {
    return { error: 'You are not a member of this project.' }
  }

  // 1. Insert the task
  const { data: task, error: insertError } = await supabase
    .from('tasks')
    .insert({
      project_id: data.projectId,
      title: data.title.trim(),
      description: data.description?.trim() || null,
      priority: data.priority || 'Medium',
      due_date: data.dueDate ? new Date(data.dueDate).toISOString() : null,
      status: 'Backlog',
      is_blocked: false,
    })
    .select()
    .single()

  if (insertError || !task) {
    return { error: insertError?.message || 'Failed to create task.' }
  }

  // 2. Insert assignments (verifying assignees are project members)
  if (data.assignedUserIds && data.assignedUserIds.length > 0) {
    const { data: validMembers } = await supabase
      .from('project_members')
      .select('user_id')
      .eq('project_id', data.projectId)
      .in('user_id', data.assignedUserIds)

    const validMemberIds = (validMembers || []).map(m => m.user_id)
    if (validMemberIds.length > 0) {
      await supabase.from('task_assignments').insert(
        validMemberIds.map(uid => ({ task_id: task.id, user_id: uid }))
      )
    }
  }

  // 3. Insert blocking dependencies (must be in the same project)
  if (data.blockingTaskIds && data.blockingTaskIds.length > 0) {
    const { data: validTasks } = await supabase
      .from('tasks')
      .select('id')
      .eq('project_id', data.projectId)
      .in('id', data.blockingTaskIds)

    const validTaskIds = (validTasks || []).map(t => t.id)
    if (validTaskIds.length > 0) {
      await supabase.from('task_dependencies').insert(
        validTaskIds.map(blockerId => ({ task_id: task.id, blocks_task_id: blockerId }))
      )
    }
  }

  // 4. Log creation in task_history (timeline you cannot rewrite)
  await supabase.from('task_history').insert({
    task_id: task.id,
    actor_id: user.id,
    action_type: 'created',
    old_value: null,
    new_value: `Created task "${task.title}" with priority ${task.priority}`
  })

  revalidatePath('/', 'layout')
  revalidatePath('/tasks')
  revalidatePath('/board')
  return { success: true, task }
}

// 2. Delete Task (Manager only requirement)
// "Managers can create and archive projects, change who is on a project, and delete tasks. Members can do neither."
export async function deleteTask(taskId: string) {
  const supabase = await createClient()
  const { isManager, error: roleError } = await verifyManagerRole()

  if (!isManager) {
    return { error: roleError || 'Unauthorized: Only managers can delete tasks.' }
  }

  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', taskId)

  if (error) {
    return { error: error.message || 'Failed to delete task.' }
  }

  revalidatePath('/', 'layout')
  revalidatePath('/tasks')
  return { success: true }
}

// 3. Update Task Details (title, description, priority, due date)
export async function updateTaskDetails(taskId: string, updates: {
  title?: string
  description?: string
  priority?: TaskPriority
  dueDate?: string | null
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'Not authenticated' }

  // Fetch current task
  const { data: currentTask } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', taskId)
    .single()

  if (!currentTask) return { error: 'Task not found' }

  const changes: Array<{ field: string; oldVal: string | null; newVal: string | null }> = []

  if (updates.title && updates.title !== currentTask.title) {
    changes.push({ field: 'title', oldVal: currentTask.title, newVal: updates.title })
  }
  if (updates.description !== undefined && updates.description !== currentTask.description) {
    changes.push({ field: 'description', oldVal: currentTask.description, newVal: updates.description })
  }
  if (updates.priority && updates.priority !== currentTask.priority) {
    changes.push({ field: 'priority', oldVal: currentTask.priority, newVal: updates.priority })
  }
  if (updates.dueDate !== undefined) {
    const oldDue = currentTask.due_date ? new Date(currentTask.due_date).toISOString() : null
    const newDue = updates.dueDate ? new Date(updates.dueDate).toISOString() : null
    if (oldDue !== newDue) {
      changes.push({ field: 'due_date', oldVal: oldDue, newVal: newDue })
    }
  }

  const { error } = await supabase
    .from('tasks')
    .update({
      ...(updates.title ? { title: updates.title.trim() } : {}),
      ...(updates.description !== undefined ? { description: updates.description?.trim() || null } : {}),
      ...(updates.priority ? { priority: updates.priority } : {}),
      ...(updates.dueDate !== undefined ? { due_date: updates.dueDate ? new Date(updates.dueDate).toISOString() : null } : {}),
      updated_at: new Date().toISOString()
    })
    .eq('id', taskId)

  if (error) return { error: error.message || 'Failed to update task' }

  // Log all changes to task_history
  for (const c of changes) {
    await supabase.from('task_history').insert({
      task_id: taskId,
      actor_id: user.id,
      action_type: `updated_${c.field}`,
      old_value: c.oldVal,
      new_value: c.newVal
    })
  }

  revalidatePath('/', 'layout')
  revalidatePath('/tasks')
  return { success: true }
}

// 4. Update Task Status (Strict State Machine + Blockers)
export async function updateTaskStatus(taskId: string, newStatus: TaskStatus) {
  const supabase = await createClient()

  // 1. Fetch current task to validate transition
  const { data: task, error: fetchError } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', taskId)
    .single()

  if (fetchError || !task) {
    return { error: 'Task not found' }
  }

  // 2. Enforce Lifecycle Rules
  if (task.is_blocked && newStatus !== task.status) {
    return { error: 'Cannot move task: Task is currently marked as Blocked. You must unblock it before changing its status.' }
  }

  const transition = await checkLegalTransition(task.status, newStatus)
  if (!transition.valid) {
    return { error: transition.reason }
  }

  // 3. Enforce Blocking Rules
  if (newStatus === 'Done') {
    // Check if there are any unfinished blocking tasks
    const { data: dependencies, error: depError } = await supabase
      .from('task_dependencies')
      .select('blocks_task_id, tasks!task_dependencies_blocks_task_id_fkey(status, title)')
      .eq('task_id', taskId)

    if (!depError && dependencies) {
      const unfinished = dependencies.filter(
        (dep: any) => dep.tasks && dep.tasks.status !== 'Done'
      )
      
      if (unfinished.length > 0) {
        const titles = unfinished.map((u: any) => `"${u.tasks.title}"`).join(', ')
        return { error: `Cannot mark as Done: Waiting on unfinished blocking task(s): ${titles}.` }
      }
    }
  }

  // 4. Update the task
  const { error: updateError } = await supabase
    .from('tasks')
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq('id', taskId)

  if (updateError) {
    return { error: 'Failed to update task status' }
  }

  // 5. Log history (immutable)
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    await supabase.from('task_history').insert({
      task_id: taskId,
      actor_id: user.id,
      action_type: 'status_change',
      old_value: task.status,
      new_value: newStatus
    })
  }

  revalidatePath('/', 'layout')
  revalidatePath('/tasks')
  return { success: true }
}

// 5. Toggle Task Blocked State
export async function toggleTaskBlocked(taskId: string, isBlocked: boolean) {
  const supabase = await createClient()

  const { data: task } = await supabase
    .from('tasks')
    .select('status, is_blocked')
    .eq('id', taskId)
    .single()

  if (!task) return { error: 'Task not found' }

  // A task can only be marked blocked from In Progress or In Review
  if (isBlocked && task.status !== 'In Progress' && task.status !== 'In Review') {
    return { error: `Cannot mark as blocked from ${task.status}. Must be In Progress or In Review.` }
  }

  const { error: updateError } = await supabase
    .from('tasks')
    .update({ is_blocked: isBlocked, updated_at: new Date().toISOString() })
    .eq('id', taskId)

  if (updateError) {
    return { error: 'Failed to update blocked state' }
  }

  // Log history
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    await supabase.from('task_history').insert({
      task_id: taskId,
      actor_id: user.id,
      action_type: 'blocked_change',
      old_value: (!isBlocked).toString(),
      new_value: isBlocked.toString()
    })
  }

  revalidatePath('/', 'layout')
  revalidatePath('/tasks')
  return { success: true }
}

// 6. Add a Comment to a Task
// "any comments people have left. Comments are part of this timeline. Nothing in the timeline can be edited or deleted"
export async function addTaskComment(taskId: string, commentText: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'Not authenticated' }
  if (!commentText?.trim()) return { error: 'Comment cannot be empty' }

  const { error } = await supabase.from('task_history').insert({
    task_id: taskId,
    actor_id: user.id,
    action_type: 'comment',
    old_value: null,
    new_value: commentText.trim()
  })

  if (error) return { error: error.message || 'Failed to add comment' }

  revalidatePath('/', 'layout')
  revalidatePath('/tasks')
  return { success: true }
}

// 8. Assign / Unassign user to task
// "Only members of a task's project may be assigned to it"
export async function toggleTaskAssignment(taskId: string, userId: string, assign: boolean) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // 1. Check task exists and get project_id
  const { data: task } = await supabase.from('tasks').select('project_id, title').eq('id', taskId).single()
  if (!task) return { error: 'Task not found' }

  // 2. Enforce: "Only members of a task's project may be assigned to it"
  if (assign) {
    const { data: membership } = await supabase
      .from('project_members')
      .select('user_id')
      .eq('project_id', task.project_id)
      .eq('user_id', userId)
      .single()

    if (!membership) {
      return { error: 'User is not a member of this project and cannot be assigned to this task.' }
    }

    const { error: insErr } = await supabase.from('task_assignments').upsert({ task_id: taskId, user_id: userId })
    if (insErr) return { error: insErr.message }

    // Log history
    await supabase.from('task_history').insert({
      task_id: taskId,
      actor_id: user.id,
      action_type: 'assignment',
      old_value: null,
      new_value: `Assigned user to task`
    })
  } else {
    const { error: delErr } = await supabase
      .from('task_assignments')
      .delete()
      .eq('task_id', taskId)
      .eq('user_id', userId)

    if (delErr) return { error: delErr.message }

    // Log history
    await supabase.from('task_history').insert({
      task_id: taskId,
      actor_id: user.id,
      action_type: 'unassignment',
      old_value: userId,
      new_value: null
    })
  }

  revalidatePath('/', 'layout')
  revalidatePath('/tasks')
  return { success: true }
}

// 7. Add & Remove Dependencies
export async function addTaskDependency(taskId: string, blockerTaskId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (taskId === blockerTaskId) {
    return { error: 'A task cannot block itself.' }
  }

  // Check both tasks exist and are in the same project
  const { data: t1 } = await supabase.from('tasks').select('project_id, title').eq('id', taskId).single()
  const { data: t2 } = await supabase.from('tasks').select('project_id, title').eq('id', blockerTaskId).single()

  if (!t1 || !t2) return { error: 'Task not found' }
  if (t1.project_id !== t2.project_id) {
    return { error: 'Tasks must be in the same project to create a blocking relationship.' }
  }

  const { error } = await supabase.from('task_dependencies').upsert({
    task_id: taskId,
    blocks_task_id: blockerTaskId
  })

  if (error) return { error: error.message }

  if (user) {
    await supabase.from('task_history').insert({
      task_id: taskId,
      actor_id: user.id,
      action_type: 'dependency_added',
      old_value: null,
      new_value: `Added blocker: "${t2.title}"`
    })
  }

  revalidatePath('/', 'layout')
  revalidatePath('/tasks')
  return { success: true }
}

export async function removeTaskDependency(taskId: string, blockerTaskId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { error } = await supabase
    .from('task_dependencies')
    .delete()
    .eq('task_id', taskId)
    .eq('blocks_task_id', blockerTaskId)

  if (error) return { error: error.message }

  if (user) {
    await supabase.from('task_history').insert({
      task_id: taskId,
      actor_id: user.id,
      action_type: 'dependency_removed',
      old_value: blockerTaskId,
      new_value: null
    })
  }

  revalidatePath('/', 'layout')
  revalidatePath('/tasks')
  return { success: true }
}
