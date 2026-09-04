'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import Link from 'next/link'
import { 
  Search, 
  Download, 
  ChevronLeft, 
  ChevronRight, 
  AlertCircle, 
  CheckCircle2, 
  Plus, 
  Calendar, 
  X, 
  Filter, 
  ArrowUpDown, 
  UserCheck,
  Keyboard
} from 'lucide-react'
import { bulkUpdateStatus, bulkUpdateAssignee, bulkUpdateDueDate, BulkUpdateResult } from '@/app/actions/bulkActions'
import { TaskStatus } from '@/lib/types'
import TaskDetailModal from '@/components/TaskDetailModal'
import CreateTaskDialog from '@/components/CreateTaskDialog'
import BusyLozenge from '@/components/busy/BusyLozenge'
import BusyPriorityIcon from '@/components/busy/BusyPriorityIcon'
import BusyIssueTypeIcon from '@/components/busy/BusyIssueTypeIcon'
import BusyAvatar from '@/components/busy/BusyAvatar'
import { formatShortDate, formatFullDate } from '@/lib/dateUtils'
import { useKeyboardShortcuts } from '@/components/keyboard/KeyboardShortcutsProvider'

export default function TaskListClient({ 
  initialTasks, 
  totalCount, 
  currentPage, 
  currentSort,
  projects = [],
  teamMembers = [],
  currentUserId,
  activeProject
}: any) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set())
  const [isUpdating, setIsUpdating] = useState(false)
  const [bulkResults, setBulkResults] = useState<BulkUpdateResult[]>([])
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null)
  const [searchInput, setSearchInput] = useState(searchParams.get('q') || '')
  const { openShortcutsModal } = useKeyboardShortcuts()
  const [focusedIndex, setFocusedIndex] = useState<number>(-1)

  // Scroll focused row into view
  useEffect(() => {
    if (focusedIndex >= 0 && initialTasks[focusedIndex]) {
      const row = document.getElementById(`task-row-${initialTasks[focusedIndex].id}`)
      if (row) {
        row.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
      }
    }
  }, [focusedIndex, initialTasks])

  // Table keyboard listener: j (down), k (up), x (toggle checkbox), Enter/o (open modal), Esc (clear focus)
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
      if (activeTaskId !== null) return
      if (e.ctrlKey || e.metaKey || e.altKey) return
      if (!initialTasks || initialTasks.length === 0) return

      if (e.key.toLowerCase() === 'j' || e.key === 'ArrowDown') {
        e.preventDefault()
        setFocusedIndex(prev => (prev < initialTasks.length - 1 ? prev + 1 : 0))
        return
      }

      if (e.key.toLowerCase() === 'k' || e.key === 'ArrowUp') {
        e.preventDefault()
        setFocusedIndex(prev => (prev > 0 ? prev - 1 : initialTasks.length - 1))
        return
      }

      if (e.key.toLowerCase() === 'x') {
        if (focusedIndex >= 0 && focusedIndex < initialTasks.length) {
          e.preventDefault()
          const task = initialTasks[focusedIndex]
          toggleTask(task.id, !selectedTasks.has(task.id))
        }
        return
      }

      if (e.key === 'Enter' || e.key.toLowerCase() === 'o') {
        if (focusedIndex >= 0 && focusedIndex < initialTasks.length) {
          e.preventDefault()
          setActiveTaskId(initialTasks[focusedIndex].id)
        }
        return
      }

      if (e.key === 'Escape') {
        if (focusedIndex >= 0) {
          setFocusedIndex(-1)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [focusedIndex, initialTasks, selectedTasks, activeTaskId])

  // Helper to update URL params triggering server-side refetch
  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    if (key !== 'page') params.set('page', '1')
    
    router.push(`${pathname}?${params.toString()}`)
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    updateFilter('q', searchInput)
  }

  // Checkbox selection
  const toggleAll = (checked: boolean) => {
    if (checked) {
      setSelectedTasks(new Set(initialTasks.map((t: any) => t.id)))
    } else {
      setSelectedTasks(new Set())
    }
  }

  const toggleTask = (taskId: string, checked: boolean) => {
    const newSet = new Set(selectedTasks)
    if (checked) newSet.add(taskId)
    else newSet.delete(taskId)
    setSelectedTasks(newSet)
  }

  // Bulk Actions
  const handleBulkStatusChange = async (newStatus: TaskStatus) => {
    if (selectedTasks.size === 0) return
    setIsUpdating(true)
    setBulkResults([])

    const results = await bulkUpdateStatus(Array.from(selectedTasks), newStatus)
    setBulkResults(results)
    setIsUpdating(false)
    
    if (results.every(r => r.success)) {
      setSelectedTasks(new Set())
    }
  }

  const handleBulkAssigneeChange = async (assigneeId: string | null) => {
    if (selectedTasks.size === 0) return
    setIsUpdating(true)
    setBulkResults([])

    const results = await bulkUpdateAssignee(Array.from(selectedTasks), assigneeId)
    setBulkResults(results)
    setIsUpdating(false)

    if (results.every(r => r.success)) {
      setSelectedTasks(new Set())
    }
  }

  const handleBulkDueDateChange = async (newDueDate: string) => {
    if (selectedTasks.size === 0) return
    setIsUpdating(true)
    setBulkResults([])

    const results = await bulkUpdateDueDate(Array.from(selectedTasks), newDueDate || null)
    setBulkResults(results)
    setIsUpdating(false)

    if (results.every(r => r.success)) {
      setSelectedTasks(new Set())
    }
  }

  const getTaskTitle = (taskId: string) => {
    const found = initialTasks.find((t: any) => t.id === taskId)
    return found ? found.title : `Task ${taskId.slice(0, 4)}`
  }

  // CSV Export
  const exportCSV = () => {
    const headers = ['Issue Key', 'Title', 'Status', 'Priority', 'Due Date', 'Updated At']
    const rows = initialTasks.map((t: any) => [
      `${t.projects?.key || 'TASK'}-${t.id.slice(0, 4)}`,
      `"${t.title.replace(/"/g, '""')}"`,
      t.status,
      t.priority,
      t.due_date || '',
      t.updated_at || ''
    ])
    
    const csvContent = [headers.join(','), ...rows.map((r: any[]) => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.setAttribute('download', 'busy_issues_export.csv')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const isAssignedToMe = searchParams.get('assignedToMe') === 'true'
  const isOverdue = searchParams.get('overdue') === 'true'

  return (
    <div className="space-y-4 flex flex-col h-full select-none">
      {/* 1. Jira Breadcrumb & Header */}
      <div>
        <nav className="text-xs text-[#5E6C84] mb-1 flex items-center gap-1.5 font-medium">
          <Link href="/projects" className="hover:text-[#0052CC] transition-colors">Projects</Link>
          <span>/</span>
          <span>{activeProject ? activeProject.name : 'Company Portfolio'}</span>
          <span>/</span>
          <span className="text-[#172B4D] font-semibold">Search issues</span>
        </nav>
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-[#172B4D] tracking-tight">
              {activeProject ? `[${activeProject.key}] Issues` : 'All Issues'}
            </h1>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-[3px] bg-[#EBECF0] text-[#42526E]">
              {totalCount} {totalCount === 1 ? 'issue' : 'issues'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={openShortcutsModal}
              title="View keyboard shortcuts (?)"
              className="h-8 px-2.5 text-xs font-medium rounded-[3px] border border-[#DFE1E6] bg-[#FAFBFC] hover:bg-[#EBECF0] text-[#42526E] hover:text-[#172B4D] transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <Keyboard className="w-3.5 h-3.5 text-[#5E6C84]" />
              <span className="hidden sm:inline">Shortcuts</span>
              <kbd className="text-[10px] font-mono bg-white border border-[#DFE1E6] px-1 rounded text-[#5E6C84]">?</kbd>
            </button>
            <button
              onClick={exportCSV}
              className="h-8 px-2.5 text-xs font-medium rounded-[3px] border border-[#DFE1E6] bg-[#FAFBFC] hover:bg-[#EBECF0] text-[#42526E] hover:text-[#172B4D] transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
            <CreateTaskDialog 
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

      {/* 2. Jira Search & Filters Toolbar */}
      <div className="bg-[#FAFBFC] border border-[#DFE1E6] rounded-[3px] p-3 space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex flex-wrap items-center gap-2">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-[#5E6C84]" />
            <input 
              type="text"
              placeholder="Search by text or description..." 
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full h-8 pl-8 pr-3 bg-white border border-[#DFE1E6] focus:border-[#0052CC] focus:ring-1 focus:ring-[#0052CC] rounded-[3px] text-xs text-[#172B4D] placeholder:text-[#5E6C84] transition-all outline-none"
            />
          </div>

          {/* Project Filter */}
          <select 
            className="h-8 border border-[#DFE1E6] rounded-[3px] bg-white px-2.5 text-xs text-[#172B4D] font-medium outline-none cursor-pointer hover:bg-[#EBECF0]"
            value={searchParams.get('project') || ''}
            onChange={(e) => updateFilter('project', e.target.value)}
          >
            <option value="">Project: All</option>
            {projects.map((p: any) => (
              <option key={p.id} value={p.id}>[{p.key}] {p.name}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select 
            className="h-8 border border-[#DFE1E6] rounded-[3px] bg-white px-2.5 text-xs text-[#172B4D] font-medium outline-none cursor-pointer hover:bg-[#EBECF0]"
            value={searchParams.get('status') || ''}
            onChange={(e) => updateFilter('status', e.target.value)}
          >
            <option value="">Status: All</option>
            <option value="Backlog">Backlog</option>
            <option value="In Progress">In Progress</option>
            <option value="In Review">In Review</option>
            <option value="Done">Done</option>
          </select>

          {/* Assignee Filter */}
          <select 
            className="h-8 border border-[#DFE1E6] rounded-[3px] bg-white px-2.5 text-xs text-[#172B4D] font-medium outline-none cursor-pointer hover:bg-[#EBECF0]"
            value={searchParams.get('assignee') || (isAssignedToMe ? 'me' : '')}
            onChange={(e) => {
              if (e.target.value === 'me') {
                updateFilter('assignedToMe', 'true')
                updateFilter('assignee', '')
              } else {
                updateFilter('assignedToMe', '')
                updateFilter('assignee', e.target.value)
              }
            }}
          >
            <option value="">Assignee: All</option>
            <option value="me">Assigned to Me</option>
            {(teamMembers || []).map((m: any) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>

          {/* Priority Filter */}
          <select 
            className="h-8 border border-[#DFE1E6] rounded-[3px] bg-white px-2.5 text-xs text-[#172B4D] font-medium outline-none cursor-pointer hover:bg-[#EBECF0]"
            value={searchParams.get('priority') || ''}
            onChange={(e) => updateFilter('priority', e.target.value)}
          >
            <option value="">Priority: All</option>
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
            <option value="Urgent">Urgent</option>
          </select>

          {/* Quick "My Tasks" Button */}
          <button 
            type="button"
            onClick={() => updateFilter('assignedToMe', isAssignedToMe ? '' : 'true')}
            className={`h-8 px-2.5 text-xs font-medium rounded-[3px] border transition-colors cursor-pointer flex items-center gap-1 ${
              isAssignedToMe 
                ? 'bg-[#DEEBFF] text-[#0052CC] border-[#B3D4FF] font-semibold' 
                : 'bg-white text-[#42526E] border-[#DFE1E6] hover:bg-[#EBECF0] hover:text-[#172B4D]'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>My issues</span>
          </button>

          {/* Quick "Overdue" Filter Button */}
          <button 
            type="button"
            onClick={() => updateFilter('overdue', isOverdue ? '' : 'true')}
            className={`h-8 px-2.5 text-xs font-medium rounded-[3px] border transition-colors cursor-pointer ${
              isOverdue 
                ? 'bg-[#FFEBE6] text-[#DE350B] border-[#FFBDAD] font-semibold' 
                : 'bg-white text-[#42526E] border-[#DFE1E6] hover:bg-[#EBECF0] hover:text-[#172B4D]'
            }`}
          >
            {isOverdue ? 'Clear Overdue' : 'Overdue only'}
          </button>

          {/* Sort Selector */}
          <div className="ml-auto flex items-center gap-1 text-xs text-[#5E6C84]">
            <ArrowUpDown className="w-3.5 h-3.5" />
            <select 
              className="h-8 border border-[#DFE1E6] rounded-[3px] bg-white px-2 text-xs text-[#172B4D] font-medium outline-none cursor-pointer hover:bg-[#EBECF0]"
              value={searchParams.get('sort') || currentSort || 'updated_at'}
              onChange={(e) => updateFilter('sort', e.target.value)}
            >
              <option value="updated_at">Sort: Last Update</option>
              <option value="due_date">Sort: Due Date</option>
              <option value="priority">Sort: Priority</option>
            </select>
          </div>
        </form>
      </div>

      {/* 3. Bulk Actions Toolbar (Jira ADS Banner) */}
      {selectedTasks.size > 0 && (
        <div className="bg-[#DEEBFF] border border-[#B3D4FF] rounded-[3px] p-2.5 flex flex-wrap items-center justify-between gap-3 animate-in fade-in slide-in-from-top-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#0052CC] bg-white px-2 py-0.5 rounded-[3px] border border-[#B3D4FF]">
              {selectedTasks.size} selected
            </span>
            <span className="text-xs text-[#0747A6] font-medium hidden sm:inline">
              Bulk actions available:
            </span>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            {/* Status transitions */}
            <div className="flex items-center gap-1 bg-white/70 p-1 rounded-[3px] border border-[#B3D4FF]/60">
              <span className="text-[11px] text-[#0747A6] font-bold px-1">Move:</span>
              <button 
                onClick={() => handleBulkStatusChange('Backlog')} 
                disabled={isUpdating}
                className="text-[11px] font-semibold px-2 py-0.5 rounded-[2px] bg-white border border-[#DFE1E6] hover:bg-[#0052CC] hover:text-white text-[#42526E] transition-colors cursor-pointer"
              >
                Backlog
              </button>
              <button 
                onClick={() => handleBulkStatusChange('In Progress')} 
                disabled={isUpdating}
                className="text-[11px] font-semibold px-2 py-0.5 rounded-[2px] bg-white border border-[#DFE1E6] hover:bg-[#0052CC] hover:text-white text-[#42526E] transition-colors cursor-pointer"
              >
                In Progress
              </button>
              <button 
                onClick={() => handleBulkStatusChange('In Review')} 
                disabled={isUpdating}
                className="text-[11px] font-semibold px-2 py-0.5 rounded-[2px] bg-white border border-[#DFE1E6] hover:bg-[#0052CC] hover:text-white text-[#42526E] transition-colors cursor-pointer"
              >
                In Review
              </button>
              <button 
                onClick={() => handleBulkStatusChange('Done')} 
                disabled={isUpdating}
                className="text-[11px] font-semibold px-2 py-0.5 rounded-[2px] bg-white border border-[#DFE1E6] hover:bg-[#0052CC] hover:text-white text-[#42526E] transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>

            {/* Bulk Assignee */}
            <div className="flex items-center gap-1 bg-white/70 p-1 rounded-[3px] border border-[#B3D4FF]/60">
              <span className="text-[11px] text-[#0747A6] font-bold px-1">Assign:</span>
              <select
                className="h-6 text-[11px] border border-[#DFE1E6] rounded-[2px] bg-white px-1.5 text-[#172B4D] font-medium outline-none cursor-pointer"
                onChange={(e) => {
                  if (e.target.value === '__UNASSIGN__') handleBulkAssigneeChange(null)
                  else if (e.target.value) handleBulkAssigneeChange(e.target.value)
                  e.target.value = ''
                }}
                defaultValue=""
                disabled={isUpdating}
              >
                <option value="" disabled>Choose...</option>
                <option value="__UNASSIGN__">Unassign All</option>
                {(teamMembers || []).map((m: any) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>

            {/* Bulk Due Date */}
            <div className="flex items-center gap-1 bg-white/70 p-1 rounded-[3px] border border-[#B3D4FF]/60">
              <span className="text-[11px] text-[#0747A6] font-bold px-1">Due:</span>
              <input
                type="date"
                className="h-6 text-[11px] border border-[#DFE1E6] rounded-[2px] bg-white px-1.5 text-[#172B4D] outline-none cursor-pointer"
                onChange={(e) => {
                  if (e.target.value) handleBulkDueDateChange(e.target.value)
                }}
                disabled={isUpdating}
              />
            </div>

            {/* Deselect */}
            <button
              onClick={() => setSelectedTasks(new Set())}
              className="text-xs text-[#0747A6] hover:underline px-1 cursor-pointer font-medium"
            >
              Deselect
            </button>
          </div>
        </div>
      )}

      {/* Bulk Results Feedback Banner (Requirement 7) */}
      {bulkResults.length > 0 && (
        <div className="border border-[#DFE1E6] rounded-[3px] p-3 max-h-56 overflow-y-auto bg-white shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-bold text-[#172B4D]">
              Bulk Action Report ({bulkResults.filter(r => r.success).length} succeeded, {bulkResults.filter(r => !r.success).length} rejected):
            </h4>
            <button 
              className="text-xs text-[#5E6C84] hover:text-[#172B4D] cursor-pointer" 
              onClick={() => setBulkResults([])}
            >
              Dismiss
            </button>
          </div>
          <ul className="space-y-1">
            {bulkResults.map(res => (
              <li key={res.taskId} className="text-xs flex items-start gap-2 p-1.5 rounded-[2px] bg-[#FAFBFC] border border-[#DFE1E6]">
                {res.success ? (
                  <CheckCircle2 className="w-4 h-4 text-[#00875A] mt-0.5 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-[#DE350B] mt-0.5 shrink-0" />
                )}
                <div className="flex-1">
                  <span className="font-semibold text-[#172B4D]">"{getTaskTitle(res.taskId)}"</span>:
                  <span className={res.success ? " text-[#00875A] ml-1.5 font-medium" : " text-[#DE350B] font-medium ml-1.5"}>
                    {res.success ? 'Success' : res.error}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Keyboard Quick Navigation Banner */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 bg-[#FAFBFC] border border-[#DFE1E6] rounded-[3px] text-[11px] text-[#5E6C84]">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-[#172B4D] flex items-center gap-1">
            <Keyboard className="w-3.5 h-3.5 text-[#0052CC]" />
            <span>Table Keys:</span>
          </span>
          <span className="flex items-center gap-1">
            <kbd className="bg-white border border-[#DFE1E6] px-1 rounded text-[10px] font-mono font-semibold">j</kbd>
            <kbd className="bg-white border border-[#DFE1E6] px-1 rounded text-[10px] font-mono font-semibold">k</kbd>
            <span>rows</span>
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <kbd className="bg-white border border-[#DFE1E6] px-1 rounded text-[10px] font-mono font-semibold">x</kbd>
            <span>toggle select</span>
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <kbd className="bg-white border border-[#DFE1E6] px-1.5 rounded text-[10px] font-mono font-semibold">↵</kbd>
            <span>open details</span>
          </span>
        </div>
        {focusedIndex >= 0 ? (
          <div className="flex items-center gap-1.5 text-[#0052CC] font-medium animate-in fade-in duration-150">
            <span className="w-1.5 h-1.5 rounded-full bg-[#0052CC] animate-pulse" />
            <span>Row {focusedIndex + 1} focused • Press Esc to clear</span>
          </div>
        ) : (
          <span className="text-[#8993A4] hidden md:inline">
            Press <kbd className="bg-white border border-[#DFE1E6] px-1 rounded text-[10px] font-mono">j</kbd> to begin navigating rows
          </span>
        )}
      </div>

      {/* 4. Jira Data Table */}
      <div className="bg-white border border-[#DFE1E6] rounded-[3px] shadow-2xs overflow-x-auto">
        <table className="w-full text-left text-xs text-[#172B4D]">
          <thead className="bg-[#F4F5F7] border-b border-[#DFE1E6] text-[11px] font-bold text-[#5E6C84] uppercase tracking-wider">
            <tr>
              <th className="w-10 px-3 py-2.5">
                <input 
                  type="checkbox" 
                  checked={initialTasks.length > 0 && selectedTasks.size === initialTasks.length}
                  onChange={(e) => toggleAll(e.target.checked)}
                  className="rounded-[2px] border-[#DFE1E6] text-[#0052CC] focus:ring-[#0052CC] cursor-pointer"
                />
              </th>
              <th className="w-10 px-2 py-2.5">Type</th>
              <th className="w-28 px-3 py-2.5">Key</th>
              <th className="px-3 py-2.5">Summary</th>
              <th className="w-36 px-3 py-2.5">Status</th>
              <th className="w-44 px-3 py-2.5">Assignee</th>
              <th 
                className="w-28 px-3 py-2.5 cursor-pointer hover:text-[#172B4D]"
                onClick={() => updateFilter('sort', currentSort === 'priority' ? 'updated_at' : 'priority')}
              >
                Priority {currentSort === 'priority' && '↓'}
              </th>
              <th 
                className="w-32 px-3 py-2.5 cursor-pointer hover:text-[#172B4D]"
                onClick={() => updateFilter('sort', currentSort === 'due_date' ? 'updated_at' : 'due_date')}
              >
                Due Date {currentSort === 'due_date' && '↓'}
              </th>
              <th className="w-28 px-3 py-2.5">Updated</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#DFE1E6]">
            {initialTasks.length === 0 ? (
              <tr>
                <td colSpan={9} className="h-32 text-center text-[#5E6C84] text-xs">
                  No issues found matching your filters.
                </td>
              </tr>
            ) : (
              initialTasks.map((task: any, index: number) => {
                const isSelected = selectedTasks.has(task.id)
                const isFocused = focusedIndex === index
                const issueKey = `${task.projects?.key || 'TASK'}-${task.id.slice(0, 4).toUpperCase()}`
                const isTaskOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'Done'
                const assignments = task.task_assignments || []

                return (
                  <tr 
                    id={`task-row-${task.id}`}
                    key={task.id} 
                    className={`transition-colors cursor-pointer group ${
                      isFocused
                        ? 'bg-[#DEEBFF]/60 border-l-4 border-l-[#0052CC]'
                        : isSelected
                        ? 'bg-[#DEEBFF]/30 hover:bg-[#DEEBFF]/40'
                        : 'hover:bg-[#F4F5F7]'
                    }`}
                    onClick={() => {
                      setFocusedIndex(index)
                      setActiveTaskId(task.id)
                    }}
                  >
                    {/* Checkbox */}
                    <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                      <input 
                        type="checkbox" 
                        checked={isSelected}
                        onChange={(e) => toggleTask(task.id, e.target.checked)}
                        className="rounded-[2px] border-[#DFE1E6] text-[#0052CC] focus:ring-[#0052CC] cursor-pointer"
                      />
                    </td>

                    {/* Type Icon */}
                    <td className="px-2 py-2.5">
                      <BusyIssueTypeIcon type="task" size={14} />
                    </td>

                    {/* Key */}
                    <td className="px-3 py-2.5 font-mono text-[11px] font-semibold text-[#0052CC] group-hover:underline">
                      {issueKey}
                    </td>

                    {/* Summary */}
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-[#172B4D] group-hover:text-[#0052CC] transition-colors line-clamp-1">
                          {task.title}
                        </span>
                        {task.is_blocked && (
                          <BusyLozenge status="Blocked" isBlocked={true} size="sm" />
                        )}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-3 py-2.5">
                      <BusyLozenge status={task.status} size="sm" />
                    </td>

                    {/* Assignee */}
                    <td className="px-3 py-2.5">
                      {assignments.length > 0 ? (
                        <div className="flex items-center gap-2">
                          <BusyAvatar 
                            name={assignments[0].profiles?.full_name} 
                            email={assignments[0].profiles?.email} 
                            size="xs" 
                          />
                          <span className="text-xs text-[#172B4D] truncate max-w-[120px]">
                            {assignments[0].profiles?.full_name || assignments[0].profiles?.email}
                          </span>
                          {assignments.length > 1 && (
                            <span className="text-[10px] text-[#5E6C84] bg-[#EBECF0] px-1 rounded">
                              +{assignments.length - 1}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-[#5E6C84] italic">Unassigned</span>
                      )}
                    </td>

                    {/* Priority */}
                    <td className="px-3 py-2.5">
                      <BusyPriorityIcon priority={task.priority} showLabel={true} size={13} />
                    </td>

                    {/* Due Date */}
                    <td className="px-3 py-2.5">
                      {task.due_date ? (
                        <span 
                          suppressHydrationWarning
                          className={`inline-flex items-center gap-1 text-[11px] font-medium ${
                            isTaskOverdue ? 'text-[#DE350B] font-semibold' : 'text-[#5E6C84]'
                          }`}
                        >
                          <Calendar className="w-3 h-3" />
                          {formatFullDate(task.due_date)}
                        </span>
                      ) : (
                        <span className="text-[#5E6C84]">-</span>
                      )}
                    </td>

                    {/* Updated */}
                    <td 
                      suppressHydrationWarning
                      className="px-3 py-2.5 text-[#5E6C84] text-[11px]"
                    >
                      {task.updated_at ? formatShortDate(task.updated_at) : '-'}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* 5. Jira Pagination Footer */}
      <div className="flex items-center justify-between text-xs text-[#5E6C84] py-2 px-1">
        <div>
          Showing <span className="font-semibold text-[#172B4D]">{Math.min(1 + (currentPage - 1) * 10, totalCount)}</span>–<span className="font-semibold text-[#172B4D]">{Math.min(currentPage * 10, totalCount)}</span> of <span className="font-semibold text-[#172B4D]">{totalCount}</span> issues
        </div>
        <div className="flex items-center gap-1.5">
          <button 
            disabled={currentPage <= 1}
            onClick={() => updateFilter('page', (currentPage - 1).toString())}
            className="h-7 px-2.5 text-xs font-medium rounded-[3px] border border-[#DFE1E6] bg-[#FAFBFC] hover:bg-[#EBECF0] disabled:opacity-40 disabled:pointer-events-none text-[#42526E] transition-colors flex items-center gap-1 cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5" /> Previous
          </button>
          <button 
            disabled={currentPage * 10 >= totalCount}
            onClick={() => updateFilter('page', (currentPage + 1).toString())}
            className="h-7 px-2.5 text-xs font-medium rounded-[3px] border border-[#DFE1E6] bg-[#FAFBFC] hover:bg-[#EBECF0] disabled:opacity-40 disabled:pointer-events-none text-[#42526E] transition-colors flex items-center gap-1 cursor-pointer"
          >
            Next <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Interactive Task Detail Modal */}
      <TaskDetailModal 
        taskId={activeTaskId} 
        onClose={() => setActiveTaskId(null)} 
        onTaskUpdated={() => router.refresh()} 
      />
    </div>
  )
}
