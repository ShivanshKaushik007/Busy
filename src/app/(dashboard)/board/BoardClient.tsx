'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Plus, Search, ArrowRight, ShieldAlert, 
  Calendar, CheckCircle2, AlertCircle 
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import TaskDetailModal from '@/components/TaskDetailModal'
import CreateTaskDialog from '@/components/CreateTaskDialog'
import { updateTaskStatus } from '@/app/actions/taskActions'
import { TaskStatus } from '@/lib/types'

const COLUMNS: { id: TaskStatus; label: string; bg: string; border: string }[] = [
  { id: 'Backlog', label: 'Backlog', bg: 'bg-gray-100/70', border: 'border-gray-200' },
  { id: 'In Progress', label: 'In Progress', bg: 'bg-blue-50/50', border: 'border-blue-200' },
  { id: 'In Review', label: 'In Review', bg: 'bg-amber-50/50', border: 'border-amber-200' },
  { id: 'Done', label: 'Done', bg: 'bg-green-50/50', border: 'border-green-200' }
]

const NEXT_MOVES: Record<TaskStatus, TaskStatus[]> = {
  'Backlog': ['In Progress'],
  'In Progress': ['In Review', 'Backlog'],
  'In Review': ['Done', 'In Progress'],
  'Done': ['Backlog']
}

export default function BoardClient({ initialTasks, projects }: { initialTasks: any[]; projects: any[] }) {
  const router = useRouter()
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedProject, setSelectedProject] = useState<string>('')
  const [error, setError] = useState<string | null>(null)

  const handleQuickMove = async (e: React.MouseEvent, taskId: string, newStatus: TaskStatus) => {
    e.stopPropagation()
    setError(null)
    const res = await updateTaskStatus(taskId, newStatus)
    if (res.error) {
      setError(res.error)
      setTimeout(() => setError(null), 5000)
    } else {
      router.refresh()
    }
  }

  // Filter tasks
  const filteredTasks = initialTasks.filter(t => {
    const matchesSearch = !searchQuery || 
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      t.description?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesProject = !selectedProject || t.project_id === selectedProject
    return matchesSearch && matchesProject
  })

  return (
    <div className="space-y-6 flex flex-col h-full">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <nav className="text-sm text-gray-500 mb-1">
            Projects / Company Portfolio / <span className="text-gray-900 font-medium">Board</span>
          </nav>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">Sprint Kanban Board</h2>
        </div>

        <div className="flex items-center gap-2">
          <CreateTaskDialog defaultProjectId={selectedProject || undefined} />
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 bg-gray-50/60 p-3 rounded-lg border border-gray-200">
        <div className="relative w-64">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
          <Input 
            placeholder="Search board..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 bg-white border-gray-300 h-9"
          />
        </div>

        <select
          value={selectedProject}
          onChange={(e) => setSelectedProject(e.target.value)}
          className="h-9 rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-700 focus:ring-1 focus:ring-primary"
        >
          <option value="">All Projects</option>
          {projects.map(p => (
            <option key={p.id} value={p.id}>[{p.key}] {p.name}</option>
          ))}
        </select>
      </div>

      {/* Error alert */}
      {error && (
        <div className="p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 4-Column Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 flex-1 items-start">
        {COLUMNS.map(col => {
          const colTasks = filteredTasks.filter(t => t.status === col.id)
          return (
            <div 
              key={col.id} 
              className={`rounded-xl p-3 border ${col.border} ${col.bg} flex flex-col min-h-[550px] shadow-2xs`}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between pb-3 px-1">
                <span className="font-bold text-xs uppercase tracking-wider text-gray-700">
                  {col.label}
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white/80 border text-gray-600 shadow-2xs">
                  {colTasks.length}
                </span>
              </div>

              {/* Column Cards */}
              <div className="space-y-2.5 flex-1">
                {colTasks.length === 0 ? (
                  <div className="h-28 border border-dashed rounded-lg flex items-center justify-center text-xs text-gray-400">
                    No issues in {col.label}
                  </div>
                ) : (
                  colTasks.map(task => (
                    <Card 
                      key={task.id}
                      onClick={() => setActiveTaskId(task.id)}
                      className="bg-white border-gray-200 hover:border-primary/50 shadow-xs hover:shadow-md transition-all cursor-pointer group"
                    >
                      <CardContent className="p-3.5 space-y-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-xs font-mono font-bold text-gray-500">
                            {task.projects?.key || 'TASK'}-{task.id.slice(0, 4)}
                          </span>
                          <div className="flex items-center gap-1">
                            {task.is_blocked && (
                              <Badge variant="destructive" className="text-[10px] h-4 px-1">
                                BLOCKED
                              </Badge>
                            )}
                            <Badge 
                              variant="outline" 
                              className={`text-[10px] h-4 px-1 ${
                                task.priority === 'Urgent' ? 'border-red-400 text-red-700 bg-red-50' :
                                task.priority === 'High' ? 'border-orange-400 text-orange-700 bg-orange-50' : ''
                              }`}
                            >
                              {task.priority}
                            </Badge>
                          </div>
                        </div>

                        <h4 className="font-semibold text-sm text-gray-900 group-hover:text-primary leading-tight line-clamp-2">
                          {task.title}
                        </h4>

                        {task.due_date && (
                          <div className={`flex items-center gap-1 text-[11px] ${
                            new Date(task.due_date) < new Date() && task.status !== 'Done' ? 'text-red-600 font-semibold' : 'text-gray-500'
                          }`}>
                            <Calendar className="h-3 w-3" />
                            <span>{new Date(task.due_date).toLocaleDateString()}</span>
                          </div>
                        )}

                        {/* Quick Move Action Buttons */}
                        <div className="pt-1 border-t border-gray-100 flex items-center justify-between">
                          <span className="text-[10px] text-gray-400">Move to:</span>
                          <div className="flex items-center gap-1">
                            {NEXT_MOVES[task.status as TaskStatus]?.map(nextStatus => (
                              <button
                                key={nextStatus}
                                type="button"
                                onClick={(e) => handleQuickMove(e, task.id, nextStatus)}
                                className="text-[10px] font-medium px-2 py-0.5 rounded bg-gray-100 hover:bg-primary hover:text-white transition-colors flex items-center gap-0.5 text-gray-700 cursor-pointer"
                              >
                                {nextStatus} <ArrowRight className="h-2.5 w-2.5" />
                              </button>
                            ))}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
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
