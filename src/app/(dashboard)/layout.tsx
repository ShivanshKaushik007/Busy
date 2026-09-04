import { ReactNode } from 'react'
import { createClient } from '@/utils/supabase/server'
import { OverdueAlert } from '@/components/OverdueAlerts'
import BusyTopNav from '@/components/busy/BusyTopNav'
import BusySidebar from '@/components/busy/BusySidebar'
import { getUserProjects } from '@/app/actions/taskActions'
import KeyboardShortcutsProvider from '@/components/keyboard/KeyboardShortcutsProvider'

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  let alerts: OverdueAlert[] = []
  let userProfile: any = null
  let defaultProjectName = 'Company Portfolio'
  let defaultProjectKey = 'CP'

  if (user) {
    // 1. Fetch user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, full_name, email, role')
      .eq('id', user.id)
      .single()
    userProfile = profile

    // 2. Fetch projects to show active project name if available
    const projects = await getUserProjects()
    if (projects && projects.length > 0) {
      defaultProjectName = projects[0].name
      defaultProjectKey = projects[0].key
    }

    // 3. Fetch overdue tasks assigned to this user (Requirement 10)
    const { data: assignedTasks } = await supabase
      .from('task_assignments')
      .select('task_id, tasks!inner(id, title, due_date, status)')
      .eq('user_id', user.id)
      .neq('tasks.status', 'Done')
      .lt('tasks.due_date', new Date().toISOString())

    // 4. Fetch the user's dismissed alerts to filter them out
    const { data: dismissed } = await supabase
      .from('dismissed_alerts')
      .select('task_id, dismissed_due_date')
      .eq('user_id', user.id)

    // 5. Filter out tasks where the current due_date matches the dismissed_due_date
    if (assignedTasks) {
      alerts = assignedTasks
        .map((a: any) => a.tasks)
        .filter((task: any) => {
          const isDismissed = dismissed?.some(d => 
            d.task_id === task.id && 
            new Date(d.dismissed_due_date).getTime() === new Date(task.due_date).getTime()
          )
          return !isDismissed
        })
    }
  }

  return (
    <KeyboardShortcutsProvider>
      <div className="flex flex-col h-screen bg-[#FAFBFC] font-sans antialiased text-[#172B4D]">
        {/* 1. Global Busy Top Navigation Bar */}
        <BusyTopNav 
          alerts={alerts} 
          userEmail={user?.email || userProfile?.email} 
          userFullName={userProfile?.full_name} 
          userRole={userProfile?.role}
        />

        <div className="flex flex-1 overflow-hidden">
          {/* 2. Collapsible Busy Project Sidebar */}
          <BusySidebar 
            userRole={userProfile?.role}
            projectName={defaultProjectName}
            projectKey={defaultProjectKey}
          />

          {/* 3. Main Busy Canvas Area */}
          <main className="flex-1 flex flex-col overflow-hidden bg-white">
            <div className="flex-1 overflow-y-auto p-6 lg:p-8">
              {children}
            </div>
          </main>
        </div>
      </div>
    </KeyboardShortcutsProvider>
  )
}
