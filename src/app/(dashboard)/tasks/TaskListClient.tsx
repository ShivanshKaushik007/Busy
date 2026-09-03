'use client'

import { useState } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Search, Download, ChevronLeft, ChevronRight, AlertCircle, CheckCircle2, Plus } from 'lucide-react'
import { bulkUpdateStatus, BulkUpdateResult } from '@/app/actions/bulkActions'
import { TaskStatus } from '@/lib/types'
import TaskDetailModal from '@/components/TaskDetailModal'
import CreateTaskDialog from '@/components/CreateTaskDialog'

export default function TaskListClient({ 
  initialTasks, 
  totalCount, 
  currentPage, 
  currentSort,
  projects = [],
  teamMembers = [],
  currentUserId
}: any) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set())
  const [isUpdating, setIsUpdating] = useState(false)
  const [bulkResults, setBulkResults] = useState<BulkUpdateResult[]>([])
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null)

  // Helper to update URL params which triggers a server-side refetch!
  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    // Reset to page 1 on new filter
    if (key !== 'page') params.set('page', '1')
    
    router.push(`${pathname}?${params.toString()}`)
  }

  // Handle Search Input (debounced in a real app, direct for now)
  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      updateFilter('q', e.currentTarget.value)
    }
  }

  // Checkbox logic
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

    // Call our server action which validates EACH task individually
    const results = await bulkUpdateStatus(Array.from(selectedTasks), newStatus)
    
    setBulkResults(results)
    setIsUpdating(false)
    
    // Clear selection if everything succeeded, else keep them selected to see errors
    if (results.every(r => r.success)) {
      setSelectedTasks(new Set())
    }
  }

  // CSV Export
  const exportCSV = () => {
    // Generate CSV string from the currently filtered tasks
    const headers = ['ID', 'Title', 'Status', 'Priority', 'Due Date']
    const rows = initialTasks.map((t: any) => 
      [t.id, `"${t.title.replace(/"/g, '""')}"`, t.status, t.priority, t.due_date || '']
    )
    
    const csvContent = [headers.join(','), ...rows.map((r: any[]) => r.join(','))].join('\n')
    
    // Create a Blob and download it
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.setAttribute('download', 'tasks_export.csv')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="bg-white rounded-md border border-gray-200 shadow-sm overflow-hidden flex flex-col">
      
      {/* Toolbar Area */}
      <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center bg-gray-50/50">
        <div className="flex flex-wrap items-center gap-2 flex-1 w-full max-w-2xl">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input 
              placeholder="Search issues..." 
              defaultValue={searchParams.get('q') || ''}
              onKeyDown={handleSearch}
              className="pl-8 bg-white border-gray-300 h-9"
            />
          </div>
          
          {/* Project Filter */}
          <select 
            className="h-9 border border-gray-300 rounded-md bg-white px-3 text-sm text-gray-700"
            value={searchParams.get('project') || ''}
            onChange={(e) => updateFilter('project', e.target.value)}
          >
            <option value="">All Projects</option>
            {projects.map((p: any) => (
              <option key={p.id} value={p.id}>[{p.key}] {p.name}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select 
            className="h-9 border border-gray-300 rounded-md bg-white px-3 text-sm text-gray-700"
            value={searchParams.get('status') || ''}
            onChange={(e) => updateFilter('status', e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="Backlog">Backlog</option>
            <option value="In Progress">In Progress</option>
            <option value="In Review">In Review</option>
            <option value="Done">Done</option>
          </select>

          {/* Assignee Filter (Requirement 5 & 6) */}
          <select 
            className="h-9 border border-gray-300 rounded-md bg-white px-3 text-sm text-gray-700"
            value={searchParams.get('assignee') || (searchParams.get('assignedToMe') === 'true' ? 'me' : '')}
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
            <option value="">All Assignees</option>
            <option value="me">Assigned to Me</option>
            {(teamMembers || []).map((m: any) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>

          {/* Priority Filter (Requirement 6) */}
          <select 
            className="h-9 border border-gray-300 rounded-md bg-white px-3 text-sm text-gray-700"
            value={searchParams.get('priority') || ''}
            onChange={(e) => updateFilter('priority', e.target.value)}
          >
            <option value="">All Priorities</option>
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
            <option value="Urgent">Urgent</option>
          </select>

          {/* Quick "My Tasks" Button (Requirement 5) */}
          <Button 
            variant={searchParams.get('assignedToMe') === 'true' ? "default" : "outline"} 
            size="sm" 
            className="h-9" 
            onClick={() => updateFilter('assignedToMe', searchParams.get('assignedToMe') === 'true' ? '' : 'true')}
          >
            {searchParams.get('assignedToMe') === 'true' ? 'My Tasks (Active)' : 'My Tasks'}
          </Button>

          {/* Overdue Filter */}
          <Button variant={searchParams.get('overdue') === 'true' ? "default" : "outline"} size="sm" className="h-9" onClick={() => updateFilter('overdue', searchParams.get('overdue') === 'true' ? '' : 'true')}>
            {searchParams.get('overdue') === 'true' ? 'Clear Overdue' : 'Overdue Only'}
          </Button>

          {/* Sort Selector (Requirement 6: sorting by due date, priority or last update) */}
          <select 
            className="h-9 border border-gray-300 rounded-md bg-white px-3 text-sm text-gray-700 font-medium"
            value={searchParams.get('sort') || currentSort || 'updated_at'}
            onChange={(e) => updateFilter('sort', e.target.value)}
          >
            <option value="updated_at">Sort: Last Update</option>
            <option value="due_date">Sort: Due Date</option>
            <option value="priority">Sort: Priority</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <CreateTaskDialog />
          <Button variant="outline" size="sm" className="h-9 gap-2" onClick={exportCSV}>
            <Download className="h-4 w-4" /> Export CSV
          </Button>
        </div>
      </div>

      {/* Bulk Actions Bar (Appears when rows are selected) */}
      {selectedTasks.size > 0 && (
        <div className="bg-blue-50 border-b border-blue-100 p-3 flex items-center justify-between animate-in fade-in slide-in-from-top-2">
          <span className="text-sm font-semibold text-blue-900">
            {selectedTasks.size} tasks selected
          </span>
          <div className="flex gap-2">
            <span className="text-sm text-blue-700 mr-2 self-center font-medium">Move to:</span>
            <Button size="sm" variant="outline" className="h-8 border-blue-200 hover:bg-blue-100" onClick={() => handleBulkStatusChange('Backlog')} disabled={isUpdating}>Backlog</Button>
            <Button size="sm" variant="outline" className="h-8 border-blue-200 hover:bg-blue-100" onClick={() => handleBulkStatusChange('In Progress')} disabled={isUpdating}>In Progress</Button>
            <Button size="sm" variant="outline" className="h-8 border-blue-200 hover:bg-blue-100" onClick={() => handleBulkStatusChange('Done')} disabled={isUpdating}>Done</Button>
          </div>
        </div>
      )}

      {/* Bulk Results Feedback (Shows exactly which tasks failed and why) */}
      {bulkResults.length > 0 && (
        <div className="p-4 border-b border-gray-200 max-h-48 overflow-y-auto bg-gray-50">
          <h4 className="text-sm font-bold text-gray-900 mb-2">Bulk Action Results:</h4>
          <ul className="space-y-1">
            {bulkResults.map(res => (
              <li key={res.taskId} className="text-sm flex items-start gap-2">
                {res.success ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                )}
                <span className={res.success ? "text-gray-700" : "text-red-700 font-medium"}>
                  Task {res.taskId.split('-')[0]}... - {res.success ? 'Success' : res.error}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Table */}
      <Table>
        <TableHeader className="bg-gray-50/50">
          <TableRow>
            <TableHead className="w-12 pl-4">
              <Checkbox 
                checked={initialTasks.length > 0 && selectedTasks.size === initialTasks.length}
                onCheckedChange={toggleAll}
              />
            </TableHead>
            <TableHead>Title</TableHead>
            <TableHead>Status</TableHead>
            <TableHead 
              className="cursor-pointer hover:text-gray-900" 
              onClick={() => updateFilter('sort', currentSort === 'priority' ? 'updated_at' : 'priority')}
            >
              Priority {currentSort === 'priority' && '↓'}
            </TableHead>
            <TableHead 
              className="cursor-pointer hover:text-gray-900"
              onClick={() => updateFilter('sort', currentSort === 'due_date' ? 'updated_at' : 'due_date')}
            >
              Due Date {currentSort === 'due_date' && '↓'}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {initialTasks.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="h-24 text-center text-gray-500">
                No tasks found matching your filters.
              </TableCell>
            </TableRow>
          ) : (
            initialTasks.map((task: any) => (
              <TableRow key={task.id} className={selectedTasks.has(task.id) ? "bg-blue-50/30" : ""}>
                <TableCell className="pl-4">
                  <Checkbox 
                    checked={selectedTasks.has(task.id)}
                    onCheckedChange={(c) => toggleTask(task.id, c as boolean)}
                  />
                </TableCell>
                <TableCell className="font-medium text-gray-900">
                  <button
                    type="button"
                    onClick={() => setActiveTaskId(task.id)}
                    className="text-left font-semibold text-primary hover:underline flex items-center cursor-pointer"
                  >
                    {task.title}
                  </button>
                  {task.is_blocked && (
                    <Badge variant="destructive" className="ml-2 text-[10px] h-5">BLOCKED</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={task.status === 'Done' ? 'default' : 'secondary'} className={task.status === 'Done' ? 'bg-green-600' : 'bg-gray-200 text-gray-800'}>
                    {task.status}
                  </Badge>
                </TableCell>
                <TableCell>{task.priority}</TableCell>
                <TableCell className={new Date(task.due_date) < new Date() && task.status !== 'Done' ? "text-red-600 font-medium" : "text-gray-500"}>
                  {task.due_date ? new Date(task.due_date).toLocaleDateString() : '-'}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {/* Pagination Footer */}
      <div className="p-4 border-t border-gray-200 flex items-center justify-between text-sm text-gray-500">
        <div>
          Showing {Math.min(1 + (currentPage - 1) * 10, totalCount)} to {Math.min(currentPage * 10, totalCount)} of {totalCount} matches
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            disabled={currentPage <= 1}
            onClick={() => updateFilter('page', (currentPage - 1).toString())}
          >
            <ChevronLeft className="h-4 w-4" /> Previous
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            disabled={currentPage * 10 >= totalCount}
            onClick={() => updateFilter('page', (currentPage + 1).toString())}
          >
            Next <ChevronRight className="h-4 w-4" />
          </Button>
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
