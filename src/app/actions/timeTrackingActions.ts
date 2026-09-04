'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { verifyManagerRole } from './projectActions'
import { 
  parseTimeToSeconds, 
  formatSecondsToTime, 
  getTimeTrackingSummary 
} from '@/lib/timeTrackingUtils'

export interface LogWorkOptions {
  taskId: string
  timeSpentStr: string
  startedAt?: string
  description?: string
  remainingType?: 'auto' | 'leave' | 'set'
  customRemainingStr?: string
}

/**
 * Log work hours/minutes spent on an issue.
 * Stored as an immutable audit record in task_history.
 */
export async function logTaskWork(options: LogWorkOptions) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'Not authenticated' }

  const timeSpentSeconds = parseTimeToSeconds(options.timeSpentStr)
  if (timeSpentSeconds === null || timeSpentSeconds <= 0) {
    return { error: 'Invalid time spent format. Try "2h 30m", "1d 4h", or "45m"' }
  }

  // 1. Fetch current task history to calculate current remaining estimate
  const { data: currentHistory } = await supabase
    .from('task_history')
    .select('*')
    .eq('task_id', options.taskId)

  const currentSummary = getTimeTrackingSummary(currentHistory || [])

  // 2. Determine new remaining estimate based on user choice
  let newRemainingSeconds: number | null = null
  const remainingType = options.remainingType || 'auto'

  if (remainingType === 'auto') {
    newRemainingSeconds = Math.max(0, currentSummary.remainingSeconds - timeSpentSeconds)
  } else if (remainingType === 'leave') {
    newRemainingSeconds = currentSummary.remainingSeconds
  } else if (remainingType === 'set') {
    const custom = parseTimeToSeconds(options.customRemainingStr || '')
    newRemainingSeconds = custom !== null ? Math.max(0, custom) : currentSummary.remainingSeconds
  }

  const timeSpentFormatted = formatSecondsToTime(timeSpentSeconds)
  const remainingFormatted = newRemainingSeconds !== null ? formatSecondsToTime(newRemainingSeconds) : undefined

  // 3. Insert worklog entry into task_history
  const { error } = await supabase.from('task_history').insert({
    task_id: options.taskId,
    actor_id: user.id,
    action_type: 'worklog',
    old_value: null,
    new_value: JSON.stringify({
      timeSpentSeconds,
      timeSpentFormatted,
      startedAt: options.startedAt || new Date().toISOString(),
      description: options.description?.trim() || '',
      remainingSeconds: newRemainingSeconds,
      remainingFormatted
    })
  })

  if (error) {
    return { error: error.message || 'Failed to log work' }
  }

  revalidatePath('/', 'layout')
  revalidatePath('/board')
  revalidatePath('/tasks')
  revalidatePath('/activity')

  return { success: true, timeSpentFormatted, remainingFormatted }
}

/**
 * Set or update the original time estimate on an issue.
 */
export async function setTaskEstimate(taskId: string, estimateStr: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'Not authenticated' }

  let estimateSeconds = 0
  if (estimateStr.trim()) {
    const parsed = parseTimeToSeconds(estimateStr)
    if (parsed === null || parsed < 0) {
      return { error: 'Invalid estimate format. Try "1w 2d", "16h", "2d", or "4h 30m"' }
    }
    estimateSeconds = parsed
  }

  const estimateFormatted = formatSecondsToTime(estimateSeconds)

  const { error } = await supabase.from('task_history').insert({
    task_id: taskId,
    actor_id: user.id,
    action_type: 'estimate_updated',
    old_value: null,
    new_value: JSON.stringify({
      estimateSeconds,
      estimateFormatted
    })
  })

  if (error) {
    return { error: error.message || 'Failed to update estimate' }
  }

  revalidatePath('/', 'layout')
  revalidatePath('/board')
  revalidatePath('/tasks')
  revalidatePath('/activity')

  return { success: true, estimateFormatted, estimateSeconds }
}

/**
 * Delete a worklog entry from task_history.
 * Permitted for the worklog author or a workspace manager.
 */
export async function deleteTaskWorklog(taskId: string, historyId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'Not authenticated' }

  const { isManager } = await verifyManagerRole()

  // Fetch the worklog to verify ownership
  const { data: record } = await supabase
    .from('task_history')
    .select('actor_id, action_type')
    .eq('id', historyId)
    .single()

  if (!record || record.action_type !== 'worklog') {
    return { error: 'Worklog record not found' }
  }

  if (!isManager && record.actor_id !== user.id) {
    return { error: 'You can only delete your own logged work entries' }
  }

  const { error } = await supabase
    .from('task_history')
    .delete()
    .eq('id', historyId)
    .eq('task_id', taskId)

  if (error) {
    return { error: error.message || 'Failed to delete worklog' }
  }

  revalidatePath('/', 'layout')
  revalidatePath('/board')
  revalidatePath('/tasks')
  revalidatePath('/activity')

  return { success: true }
}
