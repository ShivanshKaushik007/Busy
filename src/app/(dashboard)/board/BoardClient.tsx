'use client'

import React, { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  Search, 
  Plus, 
  Calendar, 
  AlertCircle, 
  ArrowRight, 
  Check, 
  MoreHorizontal,
  Clock,
  Filter,
  X
} from 'lucide-react'
import TaskDetailModal from '@/components/TaskDetailModal'
import CreateTaskDialog from '@/components/CreateTaskDialog'
import BusyLozenge from '@/components/busy/BusyLozenge'
import BusyPriorityIcon from '@/components/busy/BusyPriorityIcon'
import BusyIssueTypeIcon from '@/components/busy/BusyIssueTypeIcon'
import BusyAvatar from '@/components/busy/BusyAvatar'
import { updateTaskStatus } from '@/app/actions/taskActions'
import { TaskStatus } from '@/lib/types'
import { formatShortDate } from '@/lib/dateUtils'

interface BoardColumn {
  id: TaskStatus
  label: string
  statusGroup: string
}

const COLUMNS: BoardColumn[] = [
  { id: 'Backlog', label: 'TO DO', statusGroup: 'to-do' },
  { id: 'In Progress', label: 'IN PROGRESS', statusGroup: 'in-progress' },
  { id: 'In Review', label: 'IN REVIEW', statusGroup: 'in-review' },
  { id: 'Done', label: 'DONE', statusGroup: 'done' }
]

const NEXT_MOVES: Record<TaskStatus, TaskStatus[]> = {
  'Backlog': ['In Progress'],
  'In Progress': ['In Review', 'Backlog'],
  'In Review': ['Done', 'In Progress'],
  'Done': ['Backlog', 'In Progress']
}

export default function BoardClient({ 
  initialTasks, 
  projects,
  defaultProject = '',
  currentUserId
}: { 
  initialTasks: any[]
  projects: any[]
  defaultProject?: string
  currentUserId?: string
}) {
  const router = useRouter()
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedProject, setSelectedProject] = useState<string>(defaultProject)
  const [selectedAssignee, setSelectedAssignee] = useState<string | null>(null)
  const [onlyMyIssues, setOnlyMyIssues] = useState(false)
  const [recentOnly, setRecentOnly] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [createColumnStatus, setCreateColumnStatus] = useState<TaskStatus | null>(null)

  // Extract distinct assignees across initial tasks for the Jira quick-avatar filters
  const assignees = useMemo(() => {
    const map = new Map<string, { id: string; name: string; email: string }>()
    for (const t of initialTasks) {
      for (const a of t.task_assignments || []) {
        if (a.profiles && !map.has(a.profiles.id)) {
          map.set(a.profiles.id, {
            id: a.profiles.id,
            name: a.profiles.full_name,
            email: a.profiles.email
          })
        }
      }
    }
    return Array.from(map.values())
  }, [initialTasks])

  const handleQuickMove = async (e: React.MouseEvent, taskId: string, newStatus: TaskStatus) => {
    e.stopPropagation()
    setError(null)
    const res = await updateTaskStatus(taskId, newStatus)
    if (res.error) {
      setError(res.error)
      setTimeout(() => setError(null), 6000)
    } else {
      router.refresh()
    }
  }

  // Filter tasks based on Jira quick filters
  const filteredTasks = useMemo(() => {
    const now = new Date().getTime()
    const oneDayAgo = now - 24 * 60 * 60 * 1000

    return initialTasks.filter(t => {
      // Search
      const matchesSearch = !searchQuery || 
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
        t.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.projects?.key && `${t.projects.key}-${t.id.slice(0, 4)}`.toLowerCase().includes(searchQuery.toLowerCase()))

      // Project filter
      const matchesProject = !selectedProject || t.project_id === selectedProject

      // Assignee filter
      let matchesAssignee = true
      if (onlyMyIssues && currentUserId) {
        matchesAssignee = (t.task_assignments || []).some((a: any) => a.user_id === currentUserId)
      } else if (selectedAssignee) {
        matchesAssignee = (t.task_assignments || []).some((a: any) => a.user_id === selectedAssignee)
      }

      // Recent only
      let matchesRecent = true
      if (recentOnly && t.updated_at) {
        matchesRecent = new Date(t.updated_at).getTime() > oneDayAgo
      }

      return matchesSearch && matchesProject && matchesAssignee && matchesRecent
    })
  }, [initialTasks, searchQuery, selectedProject, selectedAssignee, onlyMyIssues, recentOnly, currentUserId])

  const activeProjectData = projects.find(p => p.id === selectedProject)
  const isAnyFilterActive = searchQuery || selectedProject || selectedAssignee || onlyMyIssues || recentOnly

  const clearAllFilters = () => {
    setSearchQuery('')
    setSelectedProject('')
    setSelectedAssignee(null)
    setOnlyMyIssues(false)
    setRecentOnly(false)
  }

  return (
    <div className="space-y-4 flex flex-col h-full select-none">
      {/* 1. Jira Breadcrumb & Header */}
      <div>
        <nav className="text-xs text-[#5E6C84] mb-1 flex items-center gap-1.5 font-medium">
          <Link href="/projects" className="hover:text-[#0052CC] transition-colors">Projects</Link>
          <span>/</span>
          <span>{activeProjectData ? activeProjectData.name : 'Company Portfolio'}</span>
          <span>/</span>
          <span className="text-[#172B4D] font-semibold">Kanban board</span>
        </nav>
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-[#172B4D] tracking-tight">
              {activeProjectData ? `[${activeProjectData.key}] Board` : 'Active Sprint Board'}
            </h1>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-[3px] bg-[#EBECF0] text-[#42526E]">
              {filteredTasks.length} {filteredTasks.length === 1 ? 'issue' : 'issues'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <CreateTaskDialog 
              defaultProjectId={selectedProject || undefined}
              trigger={
                <button className="bg-[#0052CC] hover:bg-[#0747A6] active:bg-[#0047B3] text-white font-medium text-xs px-3 py-1.5 rounded-[3px] shadow-2xs transition-colors flex items-center gap-1 cursor-pointer">
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Create issue</span>
                </button>
              }
            />
          </div>
        </div>
      </div>

      {/* 2. Jira Quick Filter Bar */}
      <div className="flex flex-wrap items-center gap-2.5 py-1">
        {/* Search */}
        <div className="relative w-48 sm:w-60">
          <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-[#5E6C84]" />
          <input 
            type="text"
            placeholder="Search board..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-8 pl-8 pr-3 bg-[#FAFBFC] hover:bg-[#EBECF0] focus:bg-white border border-[#DFE1E6] focus:border-[#0052CC] focus:ring-1 focus:ring-[#0052CC] rounded-[3px] text-xs text-[#172B4D] placeholder:text-[#5E6C84] transition-all outline-none"
          />
        </div>

        {/* Project Selector Dropdown */}
        <select
          value={selectedProject}
          onChange={(e) => setSelectedProject(e.target.value)}
          className="h-8 rounded-[3px] border border-[#DFE1E6] bg-[#FAFBFC] hover:bg-[#EBECF0] px-2.5 text-xs text-[#172B4D] font-medium outline-none cursor-pointer transition-colors"
        >
          <option value="">All Projects</option>
          {projects.map(p => (
            <option key={p.id} value={p.id}>[{p.key}] {p.name}</option>
          ))}
        </select>

        {/* Assignee Avatar Pills (Jira ADS Feature) */}
        {assignees.length > 0 && (
          <div className="flex items-center -space-x-1 pl-1">
            {assignees.slice(0, 5).map(member => {
              const isSelected = selectedAssignee === member.id
              return (
                <button
                  key={member.id}
                  onClick={() => {
                    setOnlyMyIssues(false)
                    setSelectedAssignee(isSelected ? null : member.id)
                  }}
                  className={`relative rounded-full transition-transform hover:scale-110 hover:z-10 cursor-pointer ${
                    isSelected ? 'ring-2 ring-[#0052CC] scale-105 z-10' : ''
                  }`}
                  title={`Filter by: ${member.name || member.email}`}
                >
                  <BusyAvatar name={member.name} email={member.email} size="sm" />
                </button>
              )
            })}
          </div>
        )}

        {/* Quick Filter: "Only my issues" */}
        {currentUserId && (
          <button
            onClick={() => {
              setSelectedAssignee(null)
              setOnlyMyIssues(!onlyMyIssues)
            }}
            className={`h-8 px-2.5 text-xs font-medium rounded-[3px] border transition-colors cursor-pointer ${
              onlyMyIssues 
                ? 'bg-[#DEEBFF] text-[#0052CC] border-[#B3D4FF] font-semibold' 
                : 'bg-[#FAFBFC] text-[#42526E] border-[#DFE1E6] hover:bg-[#EBECF0] hover:text-[#172B4D]'
            }`}
          >
            Only my issues
          </button>
        )}

        {/* Quick Filter: "Recently updated" */}
        <button
          onClick={() => setRecentOnly(!recentOnly)}
          className={`h-8 px-2.5 text-xs font-medium rounded-[3px] border transition-colors cursor-pointer ${
            recentOnly 
              ? 'bg-[#DEEBFF] text-[#0052CC] border-[#B3D4FF] font-semibold' 
              : 'bg-[#FAFBFC] text-[#42526E] border-[#DFE1E6] hover:bg-[#EBECF0] hover:text-[#172B4D]'
          }`}
        >
          Recently updated
        </button>

        {/* Clear All Filters Button */}
        {isAnyFilterActive && (
          <button
            onClick={clearAllFilters}
            className="text-xs font-medium text-[#0052CC] hover:underline flex items-center gap-1 ml-1 cursor-pointer"
          >
            <X className="w-3 h-3" /> Clear filters
          </button>
        )}
      </div>

      {/* Error Alert Banner */}
      {error && (
        <div className="p-3 text-xs text-[#DE350B] bg-[#FFEBE6] border border-[#FFBDAD] rounded-[3px] flex items-center gap-2 animate-in fade-in">
          <AlertCircle className="w-4 h-4 shrink-0 text-[#DE350B]" />
          <span className="font-medium">{error}</span>
        </div>
      )}

      {/* 3. Jira Kanban 4-Column Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 flex-1 items-start min-h-[580px]">
        {COLUMNS.map(col => {
          const colTasks = filteredTasks.filter(t => t.status === col.id)

          return (
            <div 
              key={col.id} 
              className="bg-[#F4F5F7] border border-[#DFE1E6] rounded-[4px] p-2 flex flex-col min-h-[560px]"
            >
              {/* Column Header */}
              <div className="flex items-center justify-between px-1.5 py-1 mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[11px] uppercase tracking-wider text-[#5E6C84]">
                    {col.label}
                  </span>
                  <span className="text-[11px] font-semibold px-1.5 py-0.2 rounded-full bg-[#DFE1E6] text-[#42526E]">
                    {colTasks.length}
                  </span>
                </div>
                <button 
                  className="p-1 text-[#5E6C84] hover:text-[#172B4D] hover:bg-[#EBECF0] rounded-[3px] transition-colors cursor-pointer"
                  title="Column options"
                >
                  <MoreHorizontal className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Column Task Cards */}
              <div className="space-y-2 flex-1">
                {colTasks.length === 0 ? (
                  <div className="h-28 border border-dashed border-[#DFE1E6] rounded-[3px] flex flex-col items-center justify-center text-xs text-[#5E6C84] bg-white/50">
                    <span>No issues</span>
                  </div>
                ) : (
                  colTasks.map(task => {
                    const issueKey = `${task.projects?.key || 'TASK'}-${task.id.slice(0, 4).toUpperCase()}`
                    const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'Done'
                    const assignments = task.task_assignments || []

                    return (
                      <div 
                        key={task.id}
                        onClick={() => setActiveTaskId(task.id)}
                        className="bg-white rounded-[3px] border border-[#DFE1E6] p-3 shadow-2xs hover:shadow-xs hover:border-[#4C9AFF] transition-all cursor-pointer group space-y-2"
                      >
                        {/* Title / Summary */}
                        <div className="text-[13px] font-medium text-[#172B4D] group-hover:text-[#0052CC] leading-snug line-clamp-3 transition-colors">
                          {task.title}
                        </div>

                        {/* Status Badges / Blocked */}
                        {task.is_blocked && (
                          <div>
                            <BusyLozenge status="Blocked" isBlocked={true} size="sm" />
                          </div>
                        )}

                        {/* Metadata Footer: Key, Type, Priority, Due Date, Assignee */}
                        <div className="flex items-center justify-between gap-1 pt-1 text-xs">
                          {/* Left Meta: Type Icon + Issue Key + Priority */}
                          <div className="flex items-center gap-1.5">
                            <BusyIssueTypeIcon type="task" size={13} />
                            <span className="font-mono text-[11px] font-semibold text-[#5E6C84] group-hover:text-[#0052CC] transition-colors">
                              {issueKey}
                            </span>
                            <BusyPriorityIcon priority={task.priority} size={12} />
                          </div>

                          {/* Right Meta: Due Date & Assignee */}
                          <div className="flex items-center gap-2">
                            {task.due_date && (
                              <span 
                                suppressHydrationWarning
                                className={`inline-flex items-center gap-0.5 text-[10px] font-semibold px-1 py-0.2 rounded-[2px] ${
                                  isOverdue 
                                    ? 'bg-[#FFEBE6] text-[#DE350B] border border-[#FFBDAD]/60' 
                                    : 'text-[#5E6C84]'
                                }`}
                                title={isOverdue ? 'Overdue deadline' : 'Due date'}
                              >
                                <Calendar className="w-2.5 h-2.5 shrink-0" />
                                {formatShortDate(task.due_date)}
                              </span>
                            )}

                            {/* Assignee Avatar */}
                            {assignments.length > 0 ? (
                              <div className="flex -space-x-1">
                                {assignments.slice(0, 2).map((a: any, idx: number) => (
                                  <BusyAvatar 
                                    key={idx} 
                                    name={a.profiles?.full_name} 
                                    email={a.profiles?.email} 
                                    size="xs" 
                                  />
                                ))}
                              </div>
                            ) : (
                              <div className="w-4 h-4 rounded-full border border-dashed border-[#DFE1E6] flex items-center justify-center text-[9px] text-[#5E6C84]">
                                -
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Quick Legal Move Buttons (Hover action) */}
                        <div className="pt-2 border-t border-[#F4F5F7] flex items-center justify-between text-[10px] opacity-80 group-hover:opacity-100 transition-opacity">
                          <span className="text-[#5E6C84]">Move:</span>
                          <div className="flex items-center gap-1">
                            {NEXT_MOVES[task.status as TaskStatus]?.map(nextStatus => (
                              <button
                                key={nextStatus}
                                type="button"
                                onClick={(e) => handleQuickMove(e, task.id, nextStatus)}
                                className="font-semibold px-1.5 py-0.5 rounded-[2px] bg-[#EBECF0] hover:bg-[#0052CC] hover:text-white text-[#42526E] transition-colors flex items-center gap-0.5 cursor-pointer"
                                title={`Transition to ${nextStatus}`}
                              >
                                <span>{nextStatus}</span>
                                <ArrowRight className="w-2.5 h-2.5" />
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>

              {/* Bottom "+ Create issue" button like real Jira */}
              <div className="pt-2 mt-auto">
                <CreateTaskDialog
                  defaultProjectId={selectedProject || undefined}
                  trigger={
                    <button className="w-full py-1.5 px-2 text-xs font-medium text-[#42526E] hover:bg-[#EBECF0] hover:text-[#172B4D] rounded-[3px] transition-colors flex items-center gap-1.5 cursor-pointer">
                      <Plus className="w-3.5 h-3.5" />
                      <span>Create issue</span>
                    </button>
                  }
                />
              </div>
            </div>
          )
        })}
      </div>

      {/* Task Detail Modal */}
      <TaskDetailModal 
        taskId={activeTaskId} 
        onClose={() => setActiveTaskId(null)} 
        onTaskUpdated={() => router.refresh()} 
      />
    </div>
  )
}
