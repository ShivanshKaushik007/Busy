'use client'

import React, { useState, useMemo, useEffect, useRef } from 'react'
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
  X,
  GripVertical,
  Keyboard,
  GitFork
} from 'lucide-react'
import TaskDetailModal from '@/components/TaskDetailModal'
import CreateTaskDialog from '@/components/CreateTaskDialog'
import ProjectDependencyAuditModal from '@/components/busy/ProjectDependencyAuditModal'
import BusyLozenge from '@/components/busy/BusyLozenge'
import BusyPriorityIcon from '@/components/busy/BusyPriorityIcon'
import BusyIssueTypeIcon from '@/components/busy/BusyIssueTypeIcon'
import BusyAvatar from '@/components/busy/BusyAvatar'
import TimeTrackingProgress from '@/components/busy/TimeTrackingProgress'
import { getTimeTrackingSummary } from '@/lib/timeTrackingUtils'
import { updateTaskStatus } from '@/app/actions/taskActions'
import { useKeyboardShortcuts } from '@/components/keyboard/KeyboardShortcutsProvider'
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
  const [tasks, setTasks] = useState<any[]>(initialTasks)
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedProject, setSelectedProject] = useState<string>(defaultProject)
  const [selectedAssignee, setSelectedAssignee] = useState<string | null>(null)
  const [onlyMyIssues, setOnlyMyIssues] = useState(false)
  const [recentOnly, setRecentOnly] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [createColumnStatus, setCreateColumnStatus] = useState<TaskStatus | null>(null)
  const [dependencyAuditOpen, setDependencyAuditOpen] = useState(false)

  // Drag-and-Drop state
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null)
  const [dragOverColumn, setDragOverColumn] = useState<TaskStatus | null>(null)
  const isDraggingRef = useRef(false)

  // Sync tasks when server initialTasks changes
  useEffect(() => {
    setTasks(initialTasks)
  }, [initialTasks])

  // Current dragged task
  const draggedTask = useMemo(() => {
    if (!draggedTaskId) return null
    return tasks.find(t => t.id === draggedTaskId) || null
  }, [draggedTaskId, tasks])

  // Check if a column is a legal drop destination for currently dragged task
  const isLegalTarget = (colId: TaskStatus) => {
    if (!draggedTask) return false
    if (draggedTask.status === colId) return false
    if (draggedTask.is_blocked) return false
    const allowed = NEXT_MOVES[draggedTask.status as TaskStatus] || []
    return allowed.includes(colId)
  }

  // Drag Event Handlers
  const handleDragStart = (e: React.DragEvent, task: any) => {
    e.dataTransfer.setData('text/plain', task.id)
    e.dataTransfer.effectAllowed = 'move'
    setDraggedTaskId(task.id)
    isDraggingRef.current = true
    setError(null)
  }

  const handleDragEnd = () => {
    setDraggedTaskId(null)
    setDragOverColumn(null)
    setTimeout(() => {
      isDraggingRef.current = false
    }, 150)
  }

  const handleDragOver = (e: React.DragEvent, colId: TaskStatus) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (dragOverColumn !== colId) {
      setDragOverColumn(colId)
    }
  }

  const handleDragLeave = (e: React.DragEvent, colId: TaskStatus) => {
    const related = e.relatedTarget as Node | null
    if (related && (e.currentTarget as HTMLElement).contains(related)) {
      return
    }
    if (dragOverColumn === colId) {
      setDragOverColumn(null)
    }
  }

  const handleDrop = async (e: React.DragEvent, targetColId: TaskStatus) => {
    e.preventDefault()
    const taskId = e.dataTransfer.getData('text/plain') || draggedTaskId
    handleDragEnd()

    if (!taskId) return
    const task = tasks.find(t => t.id === taskId)
    if (!task) return
    if (task.status === targetColId) return

    // 1. Validate blocked tasks
    if (task.is_blocked) {
      setError('Cannot move task: Task is currently marked as Blocked. You must unblock it before changing its status.')
      setTimeout(() => setError(null), 6000)
      return
    }

    // 2. Validate legal transition rule
    const allowed = NEXT_MOVES[task.status as TaskStatus] || []
    if (!allowed.includes(targetColId)) {
      setError(`Illegal move: Cannot move task from "${task.status}" directly to "${targetColId}". Permitted moves: ${allowed.join(', ') || 'None'}.`)
      setTimeout(() => setError(null), 6000)
      return
    }

    // 3. Optimistic update
    const prevTasks = [...tasks]
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: targetColId, updated_at: new Date().toISOString() } : t))
    setError(null)

    // 4. Server Action call
    const res = await updateTaskStatus(taskId, targetColId)
    if (res?.error) {
      // Rollback on server error
      setTasks(prevTasks)
      setError(res.error)
      setTimeout(() => setError(null), 6000)
    } else {
      router.refresh()
    }
  }

  const handleCardClick = (taskId: string) => {
    if (isDraggingRef.current) return
    setActiveTaskId(taskId)
  }

  // Extract distinct assignees across tasks for the Jira quick-avatar filters
  const assignees = useMemo(() => {
    const map = new Map<string, { id: string; name: string; email: string }>()
    for (const t of tasks) {
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
  }, [tasks])

  const { openShortcutsModal } = useKeyboardShortcuts()
  const [focusedTaskId, setFocusedTaskId] = useState<string | null>(null)

  const moveTaskStatus = async (taskId: string, newStatus: TaskStatus) => {
    setError(null)
    const prevTasks = [...tasks]
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus, updated_at: new Date().toISOString() } : t))

    const res = await updateTaskStatus(taskId, newStatus)
    if (res?.error) {
      setTasks(prevTasks)
      setError(res.error)
      setTimeout(() => setError(null), 6000)
    } else {
      router.refresh()
    }
  }

  const handleQuickMove = async (e: React.MouseEvent, taskId: string, newStatus: TaskStatus) => {
    e.stopPropagation()
    await moveTaskStatus(taskId, newStatus)
  }

  // Filter tasks based on Jira quick filters
  const filteredTasks = useMemo(() => {
    const now = new Date().getTime()
    const oneDayAgo = now - 24 * 60 * 60 * 1000

    return tasks.filter(t => {
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
  }, [tasks, searchQuery, selectedProject, selectedAssignee, onlyMyIssues, recentOnly, currentUserId])

  // Scroll active card into view when keyboard focused
  useEffect(() => {
    if (focusedTaskId) {
      const el = document.getElementById(`task-card-${focusedTaskId}`)
      if (el) {
        el.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
      }
    }
  }, [focusedTaskId])

  // Board keyboard shortcuts listener (j, k, h, l, Enter, o, [, ], Esc)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      const isInput =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)

      if (isInput) return
      if (activeTaskId !== null) return // A task detail modal is open
      if (e.ctrlKey || e.metaKey || e.altKey) return

      // Flat list of visible cards in board column order
      const allVisibleTasks = COLUMNS.flatMap(col => 
        filteredTasks.filter(t => t.status === col.id)
      )
      if (allVisibleTasks.length === 0) return

      const colMap = COLUMNS.map(col => ({
        colId: col.id,
        tasks: filteredTasks.filter(t => t.status === col.id)
      }))

      // J / ArrowDown: Move down to next card
      if (e.key.toLowerCase() === 'j' || e.key === 'ArrowDown') {
        e.preventDefault()
        if (!focusedTaskId) {
          setFocusedTaskId(allVisibleTasks[0].id)
          return
        }
        const currentIndex = allVisibleTasks.findIndex(t => t.id === focusedTaskId)
        if (currentIndex === -1 || currentIndex === allVisibleTasks.length - 1) {
          setFocusedTaskId(allVisibleTasks[0].id)
        } else {
          setFocusedTaskId(allVisibleTasks[currentIndex + 1].id)
        }
        return
      }

      // K / ArrowUp: Move up to previous card
      if (e.key.toLowerCase() === 'k' || e.key === 'ArrowUp') {
        e.preventDefault()
        if (!focusedTaskId) {
          setFocusedTaskId(allVisibleTasks[allVisibleTasks.length - 1].id)
          return
        }
        const currentIndex = allVisibleTasks.findIndex(t => t.id === focusedTaskId)
        if (currentIndex <= 0) {
          setFocusedTaskId(allVisibleTasks[allVisibleTasks.length - 1].id)
        } else {
          setFocusedTaskId(allVisibleTasks[currentIndex - 1].id)
        }
        return
      }

      // L / ArrowRight: Move to column on the right
      if (e.key.toLowerCase() === 'l' || e.key === 'ArrowRight') {
        e.preventDefault()
        if (!focusedTaskId) {
          setFocusedTaskId(allVisibleTasks[0].id)
          return
        }
        const currentColIdx = colMap.findIndex(c => c.tasks.some(t => t.id === focusedTaskId))
        if (currentColIdx !== -1 && currentColIdx < colMap.length - 1) {
          for (let i = currentColIdx + 1; i < colMap.length; i++) {
            if (colMap[i].tasks.length > 0) {
              const currentTaskIdxInCol = colMap[currentColIdx].tasks.findIndex(t => t.id === focusedTaskId)
              const targetIdx = Math.min(currentTaskIdxInCol, colMap[i].tasks.length - 1)
              setFocusedTaskId(colMap[i].tasks[targetIdx].id)
              return
            }
          }
        }
        return
      }

      // H / ArrowLeft: Move to column on the left
      if (e.key.toLowerCase() === 'h' || e.key === 'ArrowLeft') {
        e.preventDefault()
        if (!focusedTaskId) {
          setFocusedTaskId(allVisibleTasks[0].id)
          return
        }
        const currentColIdx = colMap.findIndex(c => c.tasks.some(t => t.id === focusedTaskId))
        if (currentColIdx > 0) {
          for (let i = currentColIdx - 1; i >= 0; i--) {
            if (colMap[i].tasks.length > 0) {
              const currentTaskIdxInCol = colMap[currentColIdx].tasks.findIndex(t => t.id === focusedTaskId)
              const targetIdx = Math.min(currentTaskIdxInCol, colMap[i].tasks.length - 1)
              setFocusedTaskId(colMap[i].tasks[targetIdx].id)
              return
            }
          }
        }
        return
      }

      // Enter or 'o': Open task detail modal
      if (e.key === 'Enter' || e.key.toLowerCase() === 'o') {
        if (focusedTaskId) {
          e.preventDefault()
          setActiveTaskId(focusedTaskId)
        }
        return
      }

      // ']' Advance card status forward
      if (e.key === ']') {
        if (focusedTaskId) {
          e.preventDefault()
          const task = tasks.find(t => t.id === focusedTaskId)
          if (task) {
            if (task.is_blocked) {
              setError(`Cannot advance "${task.title}": Task is currently marked as Blocked.`)
              setTimeout(() => setError(null), 5000)
              return
            }
            const allowed = NEXT_MOVES[task.status as TaskStatus] || []
            let nextTarget: TaskStatus | null = null
            if (task.status === 'Backlog' && allowed.includes('In Progress')) nextTarget = 'In Progress'
            else if (task.status === 'In Progress' && allowed.includes('In Review')) nextTarget = 'In Review'
            else if (task.status === 'In Review' && allowed.includes('Done')) nextTarget = 'Done'

            if (nextTarget) {
              moveTaskStatus(task.id, nextTarget)
            } else {
              setError(`Cannot advance task beyond "${task.status}". Permitted moves: ${allowed.join(', ') || 'None'}.`)
              setTimeout(() => setError(null), 5000)
            }
          }
        }
        return
      }

      // '[' Regress card status backward
      if (e.key === '[') {
        if (focusedTaskId) {
          e.preventDefault()
          const task = tasks.find(t => t.id === focusedTaskId)
          if (task) {
            if (task.is_blocked) {
              setError(`Cannot move "${task.title}": Task is currently marked as Blocked.`)
              setTimeout(() => setError(null), 5000)
              return
            }
            const allowed = NEXT_MOVES[task.status as TaskStatus] || []
            let prevTarget: TaskStatus | null = null
            if (task.status === 'Done' && allowed.includes('In Progress')) prevTarget = 'In Progress'
            else if (task.status === 'Done' && allowed.includes('Backlog')) prevTarget = 'Backlog'
            else if (task.status === 'In Review' && allowed.includes('In Progress')) prevTarget = 'In Progress'
            else if (task.status === 'In Progress' && allowed.includes('Backlog')) prevTarget = 'Backlog'

            if (prevTarget) {
              moveTaskStatus(task.id, prevTarget)
            } else {
              setError(`Cannot regress task before "${task.status}". Permitted moves: ${allowed.join(', ') || 'None'}.`)
              setTimeout(() => setError(null), 5000)
            }
          }
        }
        return
      }

      // Escape: Deselect focused card
      if (e.key === 'Escape') {
        if (focusedTaskId) {
          setFocusedTaskId(null)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [focusedTaskId, filteredTasks, activeTaskId, tasks])

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
            <button
              type="button"
              onClick={() => setDependencyAuditOpen(true)}
              title="Audit Project Dependencies & Multi-Hop Cycles (g c)"
              className="bg-white hover:bg-[#EBECF0] text-[#42526E] border border-[#DFE1E6] font-medium text-xs px-2.5 py-1.5 rounded-[3px] shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <GitFork className="w-3.5 h-3.5 text-[#0052CC]" />
              <span className="hidden sm:inline">Dependency Graph</span>
            </button>

            <button
              type="button"
              onClick={openShortcutsModal}
              title="View board keyboard shortcuts (?)"
              className="bg-white hover:bg-[#EBECF0] text-[#42526E] border border-[#DFE1E6] font-medium text-xs px-2.5 py-1.5 rounded-[3px] shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Keyboard className="w-3.5 h-3.5 text-[#5E6C84]" />
              <span className="hidden sm:inline">Keys</span>
              <kbd className="text-[10px] font-mono bg-[#FAFBFC] border border-[#DFE1E6] px-1 rounded text-[#5E6C84]">?</kbd>
            </button>

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

      {/* Keyboard Quick Navigation Banner */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 bg-[#FAFBFC] border border-[#DFE1E6] rounded-[3px] text-[11px] text-[#5E6C84]">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-[#172B4D] flex items-center gap-1">
            <Keyboard className="w-3.5 h-3.5 text-[#0052CC]" />
            <span>Board Keys:</span>
          </span>
          <span className="flex items-center gap-1">
            <kbd className="bg-white border border-[#DFE1E6] px-1 rounded text-[10px] font-mono font-semibold">j</kbd>
            <kbd className="bg-white border border-[#DFE1E6] px-1 rounded text-[10px] font-mono font-semibold">k</kbd>
            <span>cards</span>
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <kbd className="bg-white border border-[#DFE1E6] px-1 rounded text-[10px] font-mono font-semibold">h</kbd>
            <kbd className="bg-white border border-[#DFE1E6] px-1 rounded text-[10px] font-mono font-semibold">l</kbd>
            <span>columns</span>
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <kbd className="bg-white border border-[#DFE1E6] px-1.5 rounded text-[10px] font-mono font-semibold">↵</kbd>
            <span>open</span>
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <kbd className="bg-white border border-[#DFE1E6] px-1 rounded text-[10px] font-mono font-semibold">[</kbd>
            <kbd className="bg-white border border-[#DFE1E6] px-1 rounded text-[10px] font-mono font-semibold">]</kbd>
            <span>move status</span>
          </span>
        </div>
        {focusedTaskId ? (
          <div className="flex items-center gap-1.5 text-[#0052CC] font-medium animate-in fade-in duration-150">
            <span className="w-1.5 h-1.5 rounded-full bg-[#0052CC] animate-pulse" />
            <span>Card selected • Press Esc to deselect</span>
          </div>
        ) : (
          <span className="text-[#8993A4] hidden md:inline">
            Press <kbd className="bg-white border border-[#DFE1E6] px-1 rounded text-[10px] font-mono">j</kbd> to begin navigating
          </span>
        )}
      </div>

      {/* Error Alert Banner */}
      {error && (
        <div className="p-3 text-xs text-[#DE350B] bg-[#FFEBE6] border border-[#FFBDAD] rounded-[3px] flex items-center gap-2 animate-in fade-in">
          <AlertCircle className="w-4 h-4 shrink-0 text-[#DE350B]" />
          <span className="font-medium">{error}</span>
        </div>
      )}

      {/* 3. Jira Kanban 4-Column Board with Drag & Drop */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 flex-1 items-start min-h-[580px]">
        {COLUMNS.map(col => {
          const colTasks = filteredTasks.filter(t => t.status === col.id)
          const isValidTarget = isLegalTarget(col.id)
          const isHovered = dragOverColumn === col.id
          const isSourceCol = draggedTask?.status === col.id

          return (
            <div 
              key={col.id} 
              onDragOver={(e) => handleDragOver(e, col.id)}
              onDragLeave={(e) => handleDragLeave(e, col.id)}
              onDrop={(e) => handleDrop(e, col.id)}
              className={`rounded-[4px] p-2 flex flex-col min-h-[560px] transition-all duration-150 ${
                isHovered && isValidTarget
                  ? 'bg-[#DEEBFF]/40 border-2 border-dashed border-[#0052CC] shadow-sm'
                  : isHovered && !isValidTarget && !isSourceCol
                  ? 'bg-[#FFEBE6]/30 border-2 border-dashed border-[#DE350B]/60'
                  : isValidTarget
                  ? 'bg-[#F4F8FD] border-2 border-dashed border-[#0052CC]/40'
                  : 'bg-[#F4F5F7] border border-[#DFE1E6]'
              }`}
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
                  {draggedTask && isValidTarget && (
                    <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded-[2px] bg-[#DEEBFF] text-[#0052CC] animate-pulse">
                      Valid move
                    </span>
                  )}
                  {draggedTask && isHovered && !isValidTarget && !isSourceCol && (
                    <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded-[2px] bg-[#FFEBE6] text-[#DE350B]">
                      Illegal
                    </span>
                  )}
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
                {/* Drop placeholder indicator when hovered over valid target */}
                {isHovered && isValidTarget && (
                  <div className="h-14 border-2 border-dashed border-[#0052CC] bg-[#DEEBFF]/50 rounded-[3px] flex items-center justify-center text-xs font-semibold text-[#0052CC] animate-pulse">
                    Drop issue here
                  </div>
                )}

                {colTasks.length === 0 && (!isHovered || !isValidTarget) ? (
                  <div className="h-28 border border-dashed border-[#DFE1E6] rounded-[3px] flex flex-col items-center justify-center text-xs text-[#5E6C84] bg-white/50">
                    <span>No issues</span>
                  </div>
                ) : (
                  colTasks.map(task => {
                    const issueKey = `${task.projects?.key || 'TASK'}-${task.id.slice(0, 4).toUpperCase()}`
                    const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'Done'
                    const assignments = task.task_assignments || []
                    const isBeingDragged = draggedTaskId === task.id
                    const isFocused = focusedTaskId === task.id
                    const timeSummary = getTimeTrackingSummary(task.task_history || [])

                    return (
                      <div 
                        id={`task-card-${task.id}`}
                        key={task.id}
                        draggable={true}
                        onDragStart={(e) => handleDragStart(e, task)}
                        onDragEnd={handleDragEnd}
                        onClick={() => {
                          setFocusedTaskId(task.id)
                          handleCardClick(task.id)
                        }}
                        className={`bg-white rounded-[3px] border p-3 transition-all cursor-grab active:cursor-grabbing select-none group space-y-2 relative ${
                          isBeingDragged
                            ? 'opacity-30 border-dashed border-[#0052CC] scale-[0.98] shadow-inner bg-[#F4F5F7]'
                            : isFocused
                            ? 'border-[#0052CC] ring-2 ring-[#0052CC] ring-offset-2 shadow-md bg-blue-50/20'
                            : 'border-[#DFE1E6] shadow-2xs hover:shadow-xs hover:border-[#4C9AFF]'
                        }`}
                      >
                        {/* Title / Summary with Grip handle */}
                        <div className="flex items-start justify-between gap-1">
                          <div className="text-[13px] font-medium text-[#172B4D] group-hover:text-[#0052CC] leading-snug line-clamp-3 transition-colors flex-1">
                            {task.title}
                          </div>
                          <GripVertical className="w-3.5 h-3.5 text-[#5E6C84] opacity-30 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5" />
                        </div>

                        {/* Status Badges / Blocked */}
                        {task.is_blocked && (
                          <div>
                            <BusyLozenge status="Blocked" isBlocked={true} size="sm" />
                          </div>
                        )}

                        {/* Time tracking badge if has tracking data */}
                        {timeSummary.hasTrackingData && (
                          <div>
                            <TimeTrackingProgress summary={timeSummary} compact={true} />
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

      {/* Project-wide Dependency Graph & Cycle Audit Modal */}
      <ProjectDependencyAuditModal
        open={dependencyAuditOpen}
        onOpenChange={setDependencyAuditOpen}
        projectId={selectedProject || (projects[0]?.id ?? '')}
        projectName={activeProjectData ? activeProjectData.name : (projects[0]?.name ?? 'All Projects')}
        projects={projects}
      />
    </div>
  )
}
