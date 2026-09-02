'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { TaskStatus } from '@/lib/types'
import { updateTaskStatus } from './taskActions' // We reuse the individual update logic to enforce rules!

export type BulkUpdateResult = {
  taskId: string;
  success: boolean;
  error?: string;
}

export async function bulkUpdateStatus(taskIds: string[], newStatus: TaskStatus): Promise<BulkUpdateResult[]> {
  const results: BulkUpdateResult[] = []

  // We iterate and process each one individually to enforce our strict state machine rules
  for (const taskId of taskIds) {
    const res = await updateTaskStatus(taskId, newStatus)
    results.push({
      taskId,
      success: res.success || false,
      error: res.error
    })
  }

  revalidatePath('/tasks')
  return results
}

export async function bulkUpdateAssignee(taskIds: string[], assigneeId: string | null): Promise<BulkUpdateResult[]> {
  const supabase = await createClient()
  const results: BulkUpdateResult[] = []

  for (const taskId of taskIds) {
    try {
      // If we are unassigning
      if (!assigneeId) {
        await supabase.from('task_assignments').delete().eq('task_id', taskId)
        results.push({ taskId, success: true })
        continue
      }

      // Check if user is a member of the project first
      const { data: task } = await supabase.from('tasks').select('project_id').eq('id', taskId).single()
      
      if (!task) {
        results.push({ taskId, success: false, error: 'Task not found' })
        continue
      }

      const { data: membership } = await supabase
        .from('project_members')
        .select('*')
        .eq('project_id', task.project_id)
        .eq('user_id', assigneeId)
        .single()

      if (!membership) {
        results.push({ taskId, success: false, error: 'Assignee is not a member of this project' })
        continue
      }

      // Upsert the assignment
      const { error } = await supabase
        .from('task_assignments')
        .upsert({ task_id: taskId, user_id: assigneeId })

      if (error) throw error
      
      results.push({ taskId, success: true })
    } catch (e: any) {
      results.push({ taskId, success: false, error: e.message || 'Failed to assign' })
    }
  }

  revalidatePath('/tasks')
  return results
}

export async function bulkUpdateDueDate(taskIds: string[], dueDate: string | null): Promise<BulkUpdateResult[]> {
  const supabase = await createClient()
  const results: BulkUpdateResult[] = []

  for (const taskId of taskIds) {
    const { error } = await supabase
      .from('tasks')
      .update({ due_date: dueDate })
      .eq('id', taskId)

    if (error) {
      results.push({ taskId, success: false, error: 'Failed to update due date' })
    } else {
      results.push({ taskId, success: true })
    }
  }

  revalidatePath('/tasks')
  return results
}
