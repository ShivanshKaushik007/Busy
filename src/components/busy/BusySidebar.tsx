'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  Columns3, 
  ListTodo, 
  LayoutDashboard, 
  Users, 
  FolderKanban,
  ChevronLeft, 
  ChevronRight,
  Info,
  Activity
} from 'lucide-react'

interface BusySidebarProps {
  userRole?: string
  projectName?: string
  projectKey?: string
}

export default function BusySidebar({
  userRole = 'member',
  projectName = 'Company Portfolio',
  projectKey = 'CP'
}: BusySidebarProps) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  const isLinkActive = (path: string, exact: boolean = false) => {
    if (exact) return pathname === path
    return pathname.startsWith(path)
  }

  return (
    <aside
      className={`relative bg-[#F4F5F7] border-r border-[#DFE1E6] transition-all duration-200 flex flex-col shrink-0 select-none ${
        collapsed ? 'w-16' : 'w-60'
      }`}
    >
      {/* 1. Project Context Header */}
      <div className="p-3.5 border-b border-[#DFE1E6] flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="w-8 h-8 rounded-[4px] bg-gradient-to-br from-[#0052CC] to-[#2684FF] text-white flex items-center justify-center font-bold text-xs shadow-2xs shrink-0 tracking-wider">
            {projectKey.slice(0, 2).toUpperCase()}
          </div>
          {!collapsed && (
            <div className="overflow-hidden leading-tight">
              <h2 className="text-[13px] font-bold text-[#172B4D] truncate" title={projectName}>
                {projectName}
              </h2>
              <p className="text-[11px] text-[#5E6C84] truncate">Software project</p>
            </div>
          )}
        </div>

        {/* Collapse toggle button */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-5 h-5 rounded-full border border-[#DFE1E6] bg-white text-[#5E6C84] hover:text-[#172B4D] hover:bg-[#EBECF0] flex items-center justify-center shadow-2xs transition-colors shrink-0 cursor-pointer"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
        </button>
      </div>

      {/* 2. Navigation Items */}
      <nav className="flex-1 py-3 px-2 space-y-4 overflow-y-auto">
        {/* PLANNING SECTION */}
        <div>
          {!collapsed && (
            <div className="px-2.5 mb-1 text-[11px] font-bold text-[#5E6C84] uppercase tracking-wider">
              Planning
            </div>
          )}
          <div className="space-y-0.5">
            <Link
              href="/board"
              className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-[3px] text-[13px] font-medium transition-colors ${
                isLinkActive('/board')
                  ? 'bg-[#DEEBFF] text-[#0052CC] font-semibold border-l-3 border-[#0052CC] pl-2'
                  : 'text-[#42526E] hover:bg-[#EBECF0] hover:text-[#172B4D]'
              }`}
              title="Kanban Board"
            >
              <Columns3 className="w-4 h-4 shrink-0 text-inherit" />
              {!collapsed && <span>Kanban Board</span>}
            </Link>

            <Link
              href="/tasks"
              className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-[3px] text-[13px] font-medium transition-colors ${
                isLinkActive('/tasks')
                  ? 'bg-[#DEEBFF] text-[#0052CC] font-semibold border-l-3 border-[#0052CC] pl-2'
                  : 'text-[#42526E] hover:bg-[#EBECF0] hover:text-[#172B4D]'
              }`}
              title="Issues"
            >
              <ListTodo className="w-4 h-4 shrink-0 text-inherit" />
              {!collapsed && <span>Issues</span>}
            </Link>

            <Link
              href="/activity"
              className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-[3px] text-[13px] font-medium transition-colors ${
                isLinkActive('/activity')
                  ? 'bg-[#DEEBFF] text-[#0052CC] font-semibold border-l-3 border-[#0052CC] pl-2'
                  : 'text-[#42526E] hover:bg-[#EBECF0] hover:text-[#172B4D]'
              }`}
              title="Activity Feed"
            >
              <Activity className="w-4 h-4 shrink-0 text-inherit" />
              {!collapsed && <span>Activity Feed</span>}
            </Link>
          </div>
        </div>

        {/* REPORTS SECTION */}
        <div>
          {!collapsed && (
            <div className="px-2.5 mb-1 text-[11px] font-bold text-[#5E6C84] uppercase tracking-wider">
              Analytics
            </div>
          )}
          <div className="space-y-0.5">
            <Link
              href="/"
              className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-[3px] text-[13px] font-medium transition-colors ${
                isLinkActive('/', true)
                  ? 'bg-[#DEEBFF] text-[#0052CC] font-semibold border-l-3 border-[#0052CC] pl-2'
                  : 'text-[#42526E] hover:bg-[#EBECF0] hover:text-[#172B4D]'
              }`}
              title="Project Dashboard"
            >
              <LayoutDashboard className="w-4 h-4 shrink-0 text-inherit" />
              {!collapsed && <span>Dashboard</span>}
            </Link>
          </div>
        </div>

        {/* MANAGEMENT SECTION */}
        <div>
          {!collapsed && (
            <div className="px-2.5 mb-1 text-[11px] font-bold text-[#5E6C84] uppercase tracking-wider">
              Project Settings
            </div>
          )}
          <div className="space-y-0.5">
            <Link
              href="/teams"
              className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-[3px] text-[13px] font-medium transition-colors ${
                isLinkActive('/teams')
                  ? 'bg-[#DEEBFF] text-[#0052CC] font-semibold border-l-3 border-[#0052CC] pl-2'
                  : 'text-[#42526E] hover:bg-[#EBECF0] hover:text-[#172B4D]'
              }`}
              title="Project Teams"
            >
              <Users className="w-4 h-4 shrink-0 text-inherit" />
              {!collapsed && <span>Teams</span>}
            </Link>

            <Link
              href="/projects"
              className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-[3px] text-[13px] font-medium transition-colors ${
                isLinkActive('/projects')
                  ? 'bg-[#DEEBFF] text-[#0052CC] font-semibold border-l-3 border-[#0052CC] pl-2'
                  : 'text-[#42526E] hover:bg-[#EBECF0] hover:text-[#172B4D]'
              }`}
              title="Projects & Access"
            >
              <FolderKanban className="w-4 h-4 shrink-0 text-inherit" />
              {!collapsed && <span>Projects & Access</span>}
            </Link>
          </div>
        </div>
      </nav>

      {/* 3. Bottom Footer Note */}
      {!collapsed && (
        <div className="p-3 border-t border-[#DFE1E6] bg-[#EBECF0]/60">
          <div className="flex items-center gap-2 text-[11px] text-[#5E6C84]">
            <Info className="w-3.5 h-3.5 shrink-0 text-[#0052CC]" />
            <span className="truncate">Company-managed project</span>
          </div>
        </div>
      )}
    </aside>
  )
}
