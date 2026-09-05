'use server'

import { createClient } from '@/utils/supabase/server'
import {
  fetchOverdueDigestData,
  DigestOptions,
  OverdueDigestData
} from '@/lib/emailDigestUtils'
import { generateOverdueEmailHtml } from '@/lib/emailTemplates'
import { revalidatePath } from 'next/cache'

export interface DispatchLogItem {
  id: string
  recipient: string
  taskCount: number
  scope: string
  subject: string
  status: 'Delivered (Simulated)' | 'Delivered (Sandbox)'
  createdAt: string
}

// In-memory fallback array for real-time demonstration
let memoryDispatchLogs: DispatchLogItem[] = []

/**
 * Fetch live data and compile HTML preview for the email digest modal
 */
export async function getOverdueDigestPreview(options: DigestOptions = {}) {
  try {
    const supabase = await createClient()
    const {
      data: { user }
    } = await supabase.auth.getUser()

    if (!user) {
      return { error: 'Not authenticated' }
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, full_name, email')
      .eq('id', user.id)
      .single()

    const userRole = profile?.role || 'member'
    const digestData = await fetchOverdueDigestData(supabase, user.id, userRole, options)
    const html = generateOverdueEmailHtml(digestData)

    return {
      success: true,
      data: digestData,
      html
    }
  } catch (err: any) {
    console.error('Error fetching overdue digest preview:', err)
    return { error: err.message || 'Failed to generate overdue digest' }
  }
}

/**
 * Dispatch overdue digest (simulated 100% free delivery, audited in task_history and memory logs)
 */
export async function sendOverdueDigest(options: DigestOptions = {}) {
  try {
    const supabase = await createClient()
    const {
      data: { user }
    } = await supabase.auth.getUser()

    if (!user) {
      return { error: 'Not authenticated' }
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, full_name, email')
      .eq('id', user.id)
      .single()

    const userRole = profile?.role || 'member'
    const digestData = await fetchOverdueDigestData(supabase, user.id, userRole, options)
    const subject = `Overdue Work Digest — ${digestData.metrics.totalOverdue} Task(s) Requiring Attention`
    const nowIso = new Date().toISOString()

    const logEntry: DispatchLogItem = {
      id: 'digest-' + Math.random().toString(36).substring(2, 9),
      recipient: digestData.recipient.email,
      taskCount: digestData.metrics.totalOverdue,
      scope: digestData.scope,
      subject,
      status: 'Delivered (Simulated)',
      createdAt: nowIso
    }

    // Prepend to in-memory logs
    memoryDispatchLogs = [logEntry, ...memoryDispatchLogs.slice(0, 19)]

    // If there are tasks, persist an immutable audit trail entry into task_history
    if (digestData.allTasks.length > 0) {
      const firstTask = digestData.allTasks[0]
      await supabase.from('task_history').insert({
        task_id: firstTask.id,
        actor_id: user.id,
        action_type: 'email_digest_sent',
        old_value: null,
        new_value: JSON.stringify({
          recipient: digestData.recipient.email,
          totalOverdue: digestData.metrics.totalOverdue,
          scope: digestData.scope,
          subject,
          dispatchedAt: nowIso
        })
      })
    }

    revalidatePath('/board')
    revalidatePath('/tasks')
    revalidatePath('/')

    return {
      success: true,
      log: logEntry,
      recipient: digestData.recipient.email,
      taskCount: digestData.metrics.totalOverdue
    }
  } catch (err: any) {
    console.error('Error sending overdue digest:', err)
    return { error: err.message || 'Failed to dispatch email digest' }
  }
}

/**
 * Retrieve recent email digest dispatches
 */
export async function getDigestDispatchLogs(): Promise<DispatchLogItem[]> {
  try {
    const supabase = await createClient()
    const { data: auditRecords } = await supabase
      .from('task_history')
      .select('id, actor_id, new_value, created_at')
      .eq('action_type', 'email_digest_sent')
      .order('created_at', { ascending: false })
      .limit(10)

    const dbLogs: DispatchLogItem[] = (auditRecords || [])
      .map((r: any) => {
        try {
          const parsed = JSON.parse(r.new_value || '{}')
          return {
            id: r.id,
            recipient: parsed.recipient || 'Team Member',
            taskCount: parsed.totalOverdue || 0,
            scope: parsed.scope || 'personal',
            subject: parsed.subject || 'Overdue Work Digest',
            status: 'Delivered (Simulated)' as const,
            createdAt: parsed.dispatchedAt || r.created_at
          }
        } catch {
          return null
        }
      })
      .filter(Boolean) as DispatchLogItem[]

    // Combine memory and db logs deduplicated by ID
    const combined = [...memoryDispatchLogs]
    for (const d of dbLogs) {
      if (!combined.some(c => c.id === d.id)) {
        combined.push(d)
      }
    }

    combined.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    return combined.slice(0, 15)
  } catch (err) {
    console.error('Error getting digest logs:', err)
    return memoryDispatchLogs
  }
}
