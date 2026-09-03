'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function dismissAlert(taskId: string, dueDateString: string) {
  const supabase = await createClient()

  // 1. Get the current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated' }
  }

  // 2. Verify user is assigned to this task (Requirement 10: "A person can dismiss an alert for a task they are assigned to")
  const { data: assignment } = await supabase
    .from('task_assignments')
    .select('task_id')
    .eq('task_id', taskId)
    .eq('user_id', user.id)
    .single()

  if (!assignment) {
    return { error: 'You can only dismiss alerts for tasks you are assigned to' }
  }

  // 3. Insert into dismissed_alerts, capturing the EXACT due date that was dismissed
  // We upsert so if they somehow trigger it twice for the same date it won't crash
  const { error } = await supabase
    .from('dismissed_alerts')
    .upsert({ 
      user_id: user.id, 
      task_id: taskId,
      dismissed_due_date: dueDateString
    })

  if (error) {
    return { error: 'Failed to dismiss alert' }
  }

  // 3. Revalidate the layout so the notification badge in the nav updates!
  revalidatePath('/', 'layout')
  return { success: true }
}
