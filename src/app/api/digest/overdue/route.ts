import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { fetchOverdueDigestData } from '@/lib/emailDigestUtils'
import { generateOverdueEmailHtml } from '@/lib/emailTemplates'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user }
    } = await supabase.auth.getUser()

    if (!user) {
      return new NextResponse('Authentication required to view overdue digest', {
        status: 401,
        headers: { 'Content-Type': 'text/plain' }
      })
    }

    const { searchParams } = new URL(request.url)
    const isPreview = searchParams.get('preview') === 'true'
    const scopeParam = searchParams.get('scope') === 'portfolio' ? 'portfolio' : 'personal'
    const excludeDismissed = searchParams.get('excludeDismissed') !== 'false'

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, full_name, email')
      .eq('id', user.id)
      .single()

    const userRole = profile?.role || 'member'
    const digestData = await fetchOverdueDigestData(supabase, user.id, userRole, {
      scope: scopeParam,
      excludeDismissed
    })

    const html = generateOverdueEmailHtml(digestData, request.nextUrl.origin)

    if (isPreview) {
      return new NextResponse(html, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-store, max-age=0'
        }
      })
    }

    return NextResponse.json({
      success: true,
      digestData
    })
  } catch (err: any) {
    console.error('API Error in /api/digest/overdue:', err)
    return NextResponse.json(
      { error: err.message || 'Failed to generate overdue digest' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user }
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const scope = body.scope === 'portfolio' ? 'portfolio' : 'personal'
    const excludeDismissed = body.excludeDismissed ?? true

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, full_name, email')
      .eq('id', user.id)
      .single()

    const userRole = profile?.role || 'member'
    const digestData = await fetchOverdueDigestData(supabase, user.id, userRole, {
      scope,
      excludeDismissed
    })

    const nowIso = new Date().toISOString()
    const subject = `Overdue Work Digest — ${digestData.metrics.totalOverdue} Task(s) Past Due`

    // Log to task_history if tasks exist
    if (digestData.allTasks.length > 0) {
      await supabase.from('task_history').insert({
        task_id: digestData.allTasks[0].id,
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

    return NextResponse.json({
      success: true,
      message: `Digest dispatched to ${digestData.recipient.email}`,
      recipient: digestData.recipient.email,
      totalOverdue: digestData.metrics.totalOverdue,
      timestamp: nowIso
    })
  } catch (err: any) {
    console.error('API Error in POST /api/digest/overdue:', err)
    return NextResponse.json(
      { error: err.message || 'Failed to process digest trigger' },
      { status: 500 }
    )
  }
}
