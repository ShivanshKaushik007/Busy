'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { TaskStatus } from '@/lib/types'

// Helper function to check if a status transition is legal
function isLegalTransition(currentStatus: TaskStatus, newStatus: TaskStatus): { valid: boolean; reason?: string } {
  if (currentStatus === newStatus) return { valid: true };

  const validTransitions: Record<TaskStatus, TaskStatus[]> = {
    'Backlog': ['In Progress'],
    'In Progress': ['In Review', 'Backlog'], // Usually allowed to put back in backlog
    'In Review': ['Done', 'In Progress'],    // Allowed to go back to in progress if review fails
    'Done': ['Backlog', 'In Progress']       // A finished task can be reopened
  }

  if (validTransitions[currentStatus].includes(newStatus)) {
    return { valid: true }
  }

  return { 
    valid: false, 
    reason: `Illegal transition: Cannot move task from ${currentStatus} directly to ${newStatus}.` 
  }
}

// Server action to change a task's status
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
  const transition = isLegalTransition(task.status, newStatus)
  if (!transition.valid) {
    return { error: transition.reason }
  }

  // 3. Enforce Blocking Rules
  if (newStatus === 'Done') {
    // Check if there are any unfinished blocking tasks
    const { data: dependencies, error: depError } = await supabase
      .from('task_dependencies')
      .select('blocks_task_id, tasks!task_dependencies_blocks_task_id_fkey(status)')
      .eq('task_id', taskId)

    if (!depError && dependencies) {
      const hasUnfinishedBlocker = dependencies.some(
        (dep: any) => dep.tasks && dep.tasks.status !== 'Done'
      )
      
      if (hasUnfinishedBlocker) {
        return { error: 'Cannot mark as Done: This task is waiting on unfinished blocking tasks.' }
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

  // 5. Log history (we cannot rewrite this)
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
  return { success: true }
}

// Server action to toggle blocked state
export async function toggleTaskBlocked(taskId: string, isBlocked: boolean) {
  const supabase = await createClient()

  // Fetch current task
  const { data: task } = await supabase
    .from('tasks')
    .select('status')
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
  return { success: true }
}
