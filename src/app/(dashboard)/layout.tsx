import { ReactNode } from 'react'
import Link from 'next/link'
import { LayoutDashboard, CheckSquare, ListTodo, Users, LogOut, Search, Bell, HelpCircle, Plus, ChevronDown, Settings, KanbanSquare, Clock } from 'lucide-react'
import { logout } from '@/app/login/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-zinc-950 font-sans">
      
      {/* 1. Global Top Navigation (Jira Style) */}
      <header className="h-14 bg-white dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-800 flex items-center justify-between px-4 z-10 shrink-0">
        <div className="flex items-center gap-6 h-full">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 hover:opacity-90">
            <div className="bg-primary text-primary-foreground p-1 rounded">
              <CheckSquare className="h-5 w-5" />
            </div>
            <span className="font-bold text-lg text-primary tracking-tight">Tracker</span>
          </Link>

          {/* Top Nav Links */}
          <nav className="hidden md:flex items-center h-full space-x-1">
            <Button variant="ghost" className="text-gray-600 hover:text-primary font-medium h-9 px-3 flex gap-1">
              Your work <ChevronDown className="h-4 w-4 opacity-50" />
            </Button>
            <Button variant="ghost" className="text-gray-600 hover:text-primary font-medium h-9 px-3 flex gap-1">
              Projects <ChevronDown className="h-4 w-4 opacity-50" />
            </Button>
            <Button variant="ghost" className="text-gray-600 hover:text-primary font-medium h-9 px-3 flex gap-1">
              Dashboards <ChevronDown className="h-4 w-4 opacity-50" />
            </Button>
            <Button className="ml-2 h-8 px-3 bg-primary text-primary-foreground hover:bg-primary/90 font-medium">
              Create
            </Button>
          </nav>
        </div>

        {/* Right side nav items */}
        <div className="flex items-center gap-4">
          <div className="relative hidden md:flex items-center">
            <Search className="absolute left-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              type="search" 
              placeholder="Search" 
              className="w-64 h-8 pl-8 bg-gray-100 border-transparent hover:bg-gray-200 focus:bg-white focus:border-primary focus:ring-1 focus:ring-primary rounded-sm transition-all"
            />
          </div>
          <div className="flex items-center gap-2 text-gray-500">
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-gray-100">
              <Bell className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-gray-100">
              <HelpCircle className="h-5 w-5" />
            </Button>
            
            {/* User Profile / Logout */}
            <form action={logout}>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-blue-100 text-blue-700 hover:bg-blue-200 ml-1 font-semibold text-xs border border-blue-200" title="Sign Out">
                US
              </Button>
            </form>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* 2. Project Sidebar (Jira Style) */}
        <aside className="w-64 bg-gray-50 border-r border-gray-200 dark:bg-zinc-900 dark:border-zinc-800 flex flex-col shrink-0">
          
          {/* Sidebar Context Header */}
          <div className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center text-white font-bold shadow-sm">
              PR
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-900 dark:text-zinc-100">Company Portfolio</h2>
              <p className="text-xs text-gray-500 dark:text-zinc-400">Software project</p>
            </div>
          </div>

          {/* Sidebar Links */}
          <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
            <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
              Planning
            </div>
            <Link href="/" className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded bg-blue-50 text-primary dark:bg-blue-900/20 dark:text-blue-400">
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </Link>
            <Link href="/board" className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded text-gray-700 hover:bg-gray-200/50 dark:text-zinc-300 dark:hover:bg-zinc-800/50 transition-colors">
              <KanbanSquare className="h-4 w-4 text-gray-500" />
              Board
            </Link>
            <Link href="/tasks" className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded text-gray-700 hover:bg-gray-200/50 dark:text-zinc-300 dark:hover:bg-zinc-800/50 transition-colors">
              <ListTodo className="h-4 w-4 text-gray-500" />
              Issues
            </Link>

            <div className="mt-6 mb-1 px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Management
            </div>
            <Link href="/projects" className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded text-gray-700 hover:bg-gray-200/50 dark:text-zinc-300 dark:hover:bg-zinc-800/50 transition-colors">
              <Users className="h-4 w-4 text-gray-500" />
              Team
            </Link>
            <Link href="/settings" className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded text-gray-700 hover:bg-gray-200/50 dark:text-zinc-300 dark:hover:bg-zinc-800/50 transition-colors">
              <Settings className="h-4 w-4 text-gray-500" />
              Project settings
            </Link>
          </nav>
        </aside>

        {/* 3. Main Content Area */}
        <main className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-zinc-950">
          <div className="flex-1 overflow-y-auto p-8 lg:px-12">
            {children}
          </div>
        </main>
      </div>
      
    </div>
  )
}
