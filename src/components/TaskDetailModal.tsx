'use client'

import { useState, useEffect } from 'react'
import { 
  X, Loader2, AlertCircle, Clock, MessageSquare, 
  Trash2, ShieldAlert, CheckCircle2, User, Lock, ArrowRight 
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog'
import { 
  getTaskDetail, updateTaskStatus, toggleTaskBlocked, 
  updateTaskDetails, addTaskComment, deleteTask, 
  addTaskDependency, removeTaskDependency, toggleTaskAssignment 
} from '@/app/actions/taskActions'
import { TaskPriority, TaskStatus } from '@/lib/types'

interface TaskDetailModalProps {
  taskId: string | null
  onClose: () => void
  onTaskUpdated?: () => void
}

// Legal transitions mapped as per requirement 4
const LEGAL_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  'Backlog': ['In Progress'],
  'In Progress': ['In Review', 'Backlog'],
  'In Review': ['Done', 'In Progress'],
  'Done': ['Backlog', 'In Progress']
}

export default function TaskDetailModal({ taskId, onClose, onTaskUpdated }: TaskDetailModalProps) {
  const [data, setData] = useState<any | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Edit fields
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<TaskPriority>('Medium')
  const [dueDate, setDueDate] = useState('')
  const [commentText, setCommentText] = useState('')
  const [submittingComment, setSubmittingComment] = useState(false)
  const [savingDetails, setSavingDetails] = useState(false)

  const loadData = async () => {
    if (!taskId) return
    setLoading(true)
    setError(null)
    const res = await getTaskDetail(taskId)
    setLoading(false)
    if (res) {
      setData(res)
      setTitle(res.task.title || '')
      setDescription(res.task.description || '')
      setPriority(res.task.priority || 'Medium')
      setDueDate(res.task.due_date ? res.task.due_date.split('T')[0] : '')
    } else {
      setError('Could not load task details.')
    }
  }

  useEffect(() => {
    if (taskId) {
      loadData()
    } else {
      setData(null)
    }
  }, [taskId])

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg)
    setTimeout(() => setSuccessMsg(null), 3000)
    onTaskUpdated?.()
  }

  // Handle status move
  const handleStatusChange = async (newStatus: TaskStatus) => {
    if (!data?.task) return
    setError(null)
    const res = await updateTaskStatus(data.task.id, newStatus)
    if (res.error) {
      setError(res.error)
    } else {
      showSuccess(`Status changed to ${newStatus}`)
      loadData()
    }
  }

  // Handle block/unblock toggle
  const handleToggleBlocked = async () => {
    if (!data?.task) return
    setError(null)
    const nextBlockedState = !data.task.is_blocked
    const res = await toggleTaskBlocked(data.task.id, nextBlockedState)
    if (res.error) {
      setError(res.error)
    } else {
      showSuccess(nextBlockedState ? 'Task marked as Blocked' : 'Task Unblocked')
      loadData()
    }
  }

  // Handle detail updates (Title, description, priority, due date)
  const handleSaveDetails = async () => {
    if (!data?.task) return
    setSavingDetails(true)
    setError(null)
    const res = await updateTaskDetails(data.task.id, {
      title,
      description,
      priority,
      dueDate: dueDate || null
    })
    setSavingDetails(false)
    if (res.error) {
      setError(res.error)
    } else {
      showSuccess('Task details updated')
      loadData()
    }
  }

  // Handle new comment
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!commentText.trim() || !data?.task) return
    setSubmittingComment(true)
    setError(null)
    const res = await addTaskComment(data.task.id, commentText)
    setSubmittingComment(false)
    if (res.error) {
      setError(res.error)
    } else {
      setCommentText('')
      showSuccess('Comment added to timeline')
      loadData()
    }
  }

  // Handle assign / unassign
  const handleToggleAssignment = async (userId: string, assign: boolean) => {
    if (!data?.task) return
    setError(null)
    const res = await toggleTaskAssignment(data.task.id, userId, assign)
    if (res.error) {
      setError(res.error)
    } else {
      showSuccess(assign ? 'Assignee added' : 'Assignee removed')
      loadData()
      onTaskUpdated?.()
    }
  }

  // Handle task deletion (Manager only)
  const handleDelete = async () => {
    if (!data?.task) return
    if (!confirm('Are you sure you want to delete this task? This action cannot be undone.')) return
    const res = await deleteTask(data.task.id)
    if (res.error) {
      setError(res.error)
    } else {
      onTaskUpdated?.()
      onClose()
    }
  }

  if (!taskId) return null

  const task = data?.task
  const legalNextStatuses = task ? LEGAL_TRANSITIONS[task.status as TaskStatus] || [] : []

  return (
    <Dialog open={!!taskId} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-w-4xl max-h-[92vh] flex flex-col p-0 overflow-hidden">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50/50">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-semibold text-primary">
              {task?.projects?.key || 'TASK'}-{task?.id?.slice(0, 4)}
            </span>
            <span className="text-gray-400">/</span>
            <span className="text-gray-600 font-medium truncate max-w-xs">{task?.title}</span>
            {task?.is_blocked && (
              <Badge variant="destructive" className="ml-2 text-xs">
                BLOCKED
              </Badge>
            )}
          </div>
        </div>

        {/* Alerts / Error feedback */}
        {error && (
          <div className="mx-6 mt-4 p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {successMsg && (
          <div className="mx-6 mt-4 p-3 text-sm text-green-700 bg-green-50 border border-green-200 rounded-md flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {loading && !data ? (
          <div className="p-12 flex items-center justify-center text-gray-500">
            <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading issue details...
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left 2 Columns: Main Info, Comments, Timeline */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Title & Description */}
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="edit-title" className="text-xs text-gray-500 uppercase tracking-wider">Title</Label>
                  <Input 
                    id="edit-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="font-semibold text-lg"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="edit-desc" className="text-xs text-gray-500 uppercase tracking-wider">Description</Label>
                  <Textarea 
                    id="edit-desc"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    placeholder="Add a detailed description..."
                  />
                </div>

                <div className="flex justify-end">
                  <Button 
                    size="sm" 
                    onClick={handleSaveDetails} 
                    disabled={savingDetails}
                    className="h-8"
                  >
                    {savingDetails ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </div>

              {/* Blocking Dependencies Information */}
              <div className="border-t pt-4">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
                  Blocked By (Must be resolved before moving to Done)
                </h4>
                {task?.task_dependencies?.length === 0 ? (
                  <p className="text-xs text-gray-500">No tasks currently block this issue.</p>
                ) : (
                  <div className="space-y-1.5">
                    {task?.task_dependencies?.map((dep: any) => (
                      <div key={dep.blocks_task_id} className="flex items-center justify-between text-sm bg-gray-50 p-2 rounded border">
                        <div className="flex items-center gap-2">
                          <Lock className="h-4 w-4 text-amber-500" />
                          <span className="font-medium text-gray-800">{dep.tasks?.title}</span>
                          <Badge variant={dep.tasks?.status === 'Done' ? 'default' : 'secondary'} className="text-[10px]">
                            {dep.tasks?.status}
                          </Badge>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-6 text-xs text-gray-400 hover:text-red-600"
                          onClick={() => {
                            removeTaskDependency(task.id, dep.blocks_task_id).then(loadData)
                          }}
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Activity & Immutable Timeline (Requirement 9) */}
              <div className="border-t pt-4 space-y-4">
                <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-500" /> Activity Timeline & Comments
                </h4>

                {/* Comment box */}
                <form onSubmit={handleAddComment} className="space-y-2">
                  <Textarea 
                    placeholder="Leave a comment or progress update..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    rows={2}
                  />
                  <div className="flex justify-end">
                    <Button 
                      type="submit" 
                      size="sm" 
                      disabled={submittingComment || !commentText.trim()}
                      className="h-8 gap-1.5"
                    >
                      <MessageSquare className="h-3.5 w-3.5" />
                      {submittingComment ? 'Posting...' : 'Add Comment'}
                    </Button>
                  </div>
                </form>

                {/* Timeline Stream */}
                <div className="space-y-3 pt-2">
                  {data?.history?.length === 0 ? (
                    <p className="text-xs text-gray-400">No timeline history recorded yet.</p>
                  ) : (
                    data?.history?.map((h: any) => (
                      <div key={h.id} className="flex gap-3 text-xs border-l-2 border-gray-200 pl-3 py-1">
                        <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-800 font-bold flex items-center justify-center shrink-0 text-[10px]">
                          {h.profiles?.full_name?.[0] || 'U'}
                        </div>
                        <div className="flex-1 space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-900">
                              {h.profiles?.full_name || h.profiles?.email || 'User'}
                            </span>
                            <span className="text-gray-400">
                              {new Date(h.created_at).toLocaleString()}
                            </span>
                          </div>

                          {h.action_type === 'comment' ? (
                            <div className="p-2 bg-gray-50 rounded text-gray-800 text-sm mt-1 border">
                              {h.new_value}
                            </div>
                          ) : h.action_type === 'status_change' ? (
                            <p className="text-gray-600 flex items-center gap-1.5">
                              Moved status from <Badge variant="outline">{h.old_value}</Badge> to <Badge variant="default">{h.new_value}</Badge>
                            </p>
                          ) : h.action_type === 'blocked_change' ? (
                            <p className="text-gray-600">
                              {h.new_value === 'true' ? 'Marked task as BLOCKED' : 'UNBLOCKED task'}
                            </p>
                          ) : h.action_type === 'created' ? (
                            <p className="text-gray-600 font-medium">
                              Created task: <span className="text-gray-900">"{h.new_value}"</span>
                            </p>
                          ) : h.action_type === 'assignment' ? (
                            <p className="text-gray-600 font-medium">
                              Assigned team member to task
                            </p>
                          ) : h.action_type === 'unassignment' ? (
                            <p className="text-gray-600 font-medium">
                              Unassigned team member from task
                            </p>
                          ) : h.action_type?.startsWith('updated_') ? (
                            <p className="text-gray-600">
                              Updated <span className="font-semibold text-gray-800 capitalize">{h.action_type.replace('updated_', '').replace('_', ' ')}</span> from <span className="line-through text-gray-400">{h.old_value || 'None'}</span> to <span className="font-medium text-gray-900">{h.new_value || 'None'}</span>
                            </p>
                          ) : (
                            <p className="text-gray-600">
                              {h.new_value || h.action_type}
                            </p>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>

            {/* Right 1 Column: Metadata, Lifecycle Transitions, Details */}
            <div className="space-y-6 bg-gray-50/50 p-4 rounded-lg border border-gray-200 h-fit">
              
              {/* Status Section (State Machine enforcement) */}
              <div className="space-y-2">
                <Label className="text-xs text-gray-500 uppercase font-semibold">Status</Label>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge className="text-sm px-2.5 py-1">
                      Current: {task?.status}
                    </Badge>
                    
                    {/* Blocked Button (Requirement 4) */}
                    {(task?.status === 'In Progress' || task?.status === 'In Review') && (
                      <Button
                        size="sm"
                        variant={task?.is_blocked ? "destructive" : "outline"}
                        onClick={handleToggleBlocked}
                        className="h-7 text-xs"
                      >
                        {task?.is_blocked ? 'Unblock Task' : 'Mark Blocked'}
                      </Button>
                    )}
                  </div>

                  {/* Strictly Legal Next Moves */}
                  <div className="pt-2">
                    <p className="text-xs text-gray-500 mb-1.5 font-medium">Permitted Next Moves:</p>
                    {legalNextStatuses.length === 0 ? (
                      <p className="text-xs text-gray-400">No transitions available.</p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {legalNextStatuses.map((nextStatus) => (
                          <Button
                            key={nextStatus}
                            size="sm"
                            variant="secondary"
                            onClick={() => handleStatusChange(nextStatus)}
                            className="h-7 text-xs bg-white hover:bg-primary hover:text-white border shadow-2xs gap-1"
                          >
                            <ArrowRight className="h-3 w-3" /> {nextStatus}
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Priority */}
              <div className="space-y-1.5">
                <Label className="text-xs text-gray-500 uppercase font-semibold">Priority</Label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as TaskPriority)}
                  className="w-full h-8 rounded border border-gray-300 bg-white px-2.5 text-xs shadow-2xs focus:ring-1 focus:ring-primary"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Urgent">Urgent</option>
                </select>
              </div>

              {/* Due Date */}
              <div className="space-y-1.5">
                <Label className="text-xs text-gray-500 uppercase font-semibold">Due Date</Label>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="h-8 text-xs bg-white"
                />
              </div>

              {/* Assignees (Requirement 5: any number of assignees from project members) */}
              <div className="space-y-2">
                <Label className="text-xs text-gray-500 uppercase font-semibold">Assignees</Label>
                <div className="space-y-1.5">
                  {task?.task_assignments?.length === 0 ? (
                    <p className="text-xs text-gray-400 italic">No one assigned yet.</p>
                  ) : (
                    task?.task_assignments?.map((a: any) => (
                      <div key={a.user_id} className="flex items-center justify-between gap-1.5 text-xs text-gray-700 bg-white p-1.5 rounded border">
                        <div className="flex items-center gap-1.5 truncate">
                          <User className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                          <span className="truncate">{a.profiles?.full_name || a.profiles?.email}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleToggleAssignment(a.user_id, false)}
                          className="text-gray-400 hover:text-red-600 transition-colors p-0.5"
                          title="Unassign"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {/* Add Assignee Dropdown (Only members of project) */}
                <div className="pt-1">
                  <select
                    className="w-full h-8 text-xs border border-gray-200 rounded bg-white px-2 text-gray-700"
                    value=""
                    onChange={(e) => {
                      if (e.target.value) {
                        handleToggleAssignment(e.target.value, true)
                      }
                    }}
                  >
                    <option value="">+ Assign Team Member...</option>
                    {(data?.projectMembers || [])
                      .filter((pm: any) => !task?.task_assignments?.some((a: any) => a.user_id === pm.id))
                      .map((pm: any) => (
                        <option key={pm.id} value={pm.id}>
                          {pm.full_name || pm.email}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Delete Task Button (Only for Managers) */}
              {data?.isManager && (
                <div className="border-t pt-4">
                  <Button
                    variant="destructive"
                    size="sm"
                    className="w-full h-8 text-xs gap-1.5"
                    onClick={handleDelete}
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Delete Task
                  </Button>
                </div>
              )}

            </div>

          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
