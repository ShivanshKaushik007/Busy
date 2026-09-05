'use client'

import React, { useState, useEffect } from 'react'
import { 
  X, 
  Loader2, 
  AlertCircle, 
  Clock, 
  MessageSquare, 
  Trash2, 
  Lock, 
  ArrowRight,
  Plus,
  History,
  Calendar,
  Layers,
  ChevronDown,
  AtSign,
  Timer
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog'
import { 
  getTaskDetail, 
  updateTaskStatus, 
  toggleTaskBlocked, 
  updateTaskDetails, 
  addTaskComment, 
  deleteTask, 
  addTaskDependency, 
  removeTaskDependency, 
  toggleTaskAssignment 
} from '@/app/actions/taskActions'
import { deleteTaskWorklog } from '@/app/actions/timeTrackingActions'
import { TaskPriority, TaskStatus } from '@/lib/types'
import BusyLozenge from '@/components/busy/BusyLozenge'
import BusyPriorityIcon from '@/components/busy/BusyPriorityIcon'
import BusyIssueTypeIcon from '@/components/busy/BusyIssueTypeIcon'
import BusyAvatar from '@/components/busy/BusyAvatar'
import MentionTextarea from '@/components/busy/MentionTextarea'
import CommentRenderer, { containsAnyMention, containsUserMention } from '@/components/busy/CommentRenderer'
import TimeTrackingProgress from '@/components/busy/TimeTrackingProgress'
import LogWorkModal from '@/components/busy/LogWorkModal'
import SetEstimateModal from '@/components/busy/SetEstimateModal'
import DependencyChainViewer from '@/components/busy/DependencyChainViewer'
import { getTimeTrackingSummary } from '@/lib/timeTrackingUtils'
import { formatDateTime } from '@/lib/dateUtils'

interface TaskDetailModalProps {
  taskId: string | null
  onClose: () => void
  onTaskUpdated?: () => void
}

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
  const [activityTab, setActivityTab] = useState<'all' | 'comments' | 'mentions' | 'worklog' | 'history'>('all')
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false)
  const [logWorkOpen, setLogWorkOpen] = useState(false)
  const [estimateModalOpen, setEstimateModalOpen] = useState(false)

  const timeSummary = React.useMemo(() => {
    return getTimeTrackingSummary(data?.history || [])
  }, [data?.history])

  const handleDeleteWorklog = async (historyId: string) => {
    if (!taskId) return
    if (!confirm('Are you sure you want to remove this work log entry?')) return
    const res = await deleteTaskWorklog(taskId, historyId)
    if (res.error) {
      setError(res.error)
    } else {
      showSuccess('Work log entry removed')
      loadData()
    }
  }

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
      setError('Could not load issue details.')
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
    setStatusDropdownOpen(false)
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
      showSuccess(nextBlockedState ? 'Issue marked as Blocked' : 'Issue unblocked')
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
      showSuccess('Details updated')
      loadData()
    }
  }

  // Handle new comment
  const handleAddComment = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!commentText.trim() || !data?.task) return
    setSubmittingComment(true)
    setError(null)
    const res = await addTaskComment(data.task.id, commentText)
    setSubmittingComment(false)
    if (res.error) {
      setError(res.error)
    } else {
      setCommentText('')
      showSuccess('Comment added to issue timeline')
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
    if (!confirm('Are you sure you want to delete this issue? This action is irreversible.')) return
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
  const issueKey = task ? `${task.projects?.key || 'TASK'}-${task.id.slice(0, 4).toUpperCase()}` : ''
  const legalNextStatuses = task ? LEGAL_TRANSITIONS[task.status as TaskStatus] || [] : []
  const isTaskOverdue = task?.due_date && new Date(task.due_date) < new Date() && task.status !== 'Done'

  // Filter history based on activity tab
  const historyItems = (data?.history || []).filter((h: any) => {
    if (activityTab === 'comments') return h.action_type === 'comment'
    if (activityTab === 'mentions') return h.action_type === 'comment' && containsAnyMention(h.new_value || '')
    if (activityTab === 'worklog') return h.action_type === 'worklog'
    if (activityTab === 'history') return h.action_type !== 'comment' && h.action_type !== 'worklog'
    return true
  })

  return (
    <Dialog open={!!taskId} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-w-4xl max-h-[92vh] flex flex-col p-0 overflow-hidden bg-white rounded-[4px] border border-[#DFE1E6] shadow-xl">
        {/* 1. Header Bar */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-[#DFE1E6] bg-[#FAFBFC]">
          <div className="flex items-center gap-2 text-xs">
            <BusyIssueTypeIcon type="task" size={15} />
            <span className="font-mono font-semibold text-[#0052CC] hover:underline cursor-pointer">
              {issueKey}
            </span>
            <span className="text-[#5E6C84]">/</span>
            <span className="text-[#5E6C84] font-medium truncate max-w-sm">{task?.title}</span>
            {task?.is_blocked && (
              <BusyLozenge status="Blocked" isBlocked={true} size="sm" />
            )}
          </div>

          <div className="flex items-center gap-1 pr-6">
            {data?.isManager && (
              <button
                onClick={handleDelete}
                className="p-1.5 text-[#5E6C84] hover:text-[#DE350B] hover:bg-[#FFEBE6] rounded-[3px] transition-colors cursor-pointer"
                title="Delete issue (Manager only)"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Error / Success feedback */}
        {error && (
          <div className="mx-6 mt-3 p-2.5 text-xs text-[#DE350B] bg-[#FFEBE6] border border-[#FFBDAD] rounded-[3px] flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-[#DE350B]" />
            <span className="font-medium">{error}</span>
          </div>
        )}
        {successMsg && (
          <div className="mx-6 mt-3 p-2.5 text-xs text-[#006644] bg-[#E3FCEF] border border-[#ABF5D1] rounded-[3px] flex items-center gap-2">
            <span className="font-medium">{successMsg}</span>
          </div>
        )}

        {loading && !data ? (
          <div className="p-16 flex flex-col items-center justify-center text-[#5E6C84] gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-[#0052CC]" />
            <span className="text-xs font-medium">Loading issue details...</span>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* 2. Left 2 Columns: Title, Description, Blocker Links, Activity Timeline */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Title & Description */}
              <div className="space-y-4">
                <div>
                  <input
                    id="busy-issue-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full text-xl font-bold text-[#172B4D] p-1.5 rounded-[3px] border border-transparent hover:border-[#DFE1E6] focus:border-[#0052CC] focus:bg-white transition-all outline-none"
                    placeholder="Issue summary"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-[#5E6C84] uppercase tracking-wider">
                    Description
                  </label>
                  <textarea 
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    placeholder="Add a detailed description..."
                    className="w-full p-2.5 text-xs text-[#172B4D] bg-white border border-[#DFE1E6] focus:border-[#0052CC] focus:ring-1 focus:ring-[#0052CC] rounded-[3px] transition-all outline-none"
                  />
                </div>

                <div className="flex justify-end">
                  <button 
                    onClick={handleSaveDetails} 
                    disabled={savingDetails}
                    className="bg-[#0052CC] hover:bg-[#0747A6] active:bg-[#0047B3] text-white font-medium text-xs px-3 py-1.5 rounded-[3px] shadow-2xs transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    {savingDetails ? 'Saving...' : 'Save changes'}
                  </button>
                </div>
              </div>

              {/* Linked Issues & Dependency Chains with Cycle Detection */}
              {task && (
                <div className="border-t border-[#DFE1E6] pt-4">
                  <DependencyChainViewer
                    taskId={task.id}
                    taskTitle={task.title}
                    projectId={task.project_id}
                    onDependenciesChanged={loadData}
                  />
                </div>
              )}

              {/* Activity Section with Jira Tabs (Comments & Immutable Timeline) */}
              <div className="border-t border-[#DFE1E6] pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-[#172B4D] flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-[#5E6C84]" />
                    <span>Activity</span>
                  </h4>

                  {/* Jira Tabs */}
                  <div className="flex items-center gap-1 text-xs">
                    <button
                      onClick={() => setActivityTab('all')}
                      className={`px-2 py-0.5 rounded-[3px] font-medium transition-colors cursor-pointer ${
                        activityTab === 'all' 
                          ? 'bg-[#EBECF0] text-[#172B4D] font-semibold' 
                          : 'text-[#5E6C84] hover:bg-[#FAFBFC]'
                      }`}
                    >
                      All
                    </button>
                    <button
                      onClick={() => setActivityTab('comments')}
                      className={`px-2 py-0.5 rounded-[3px] font-medium transition-colors cursor-pointer ${
                        activityTab === 'comments' 
                          ? 'bg-[#EBECF0] text-[#172B4D] font-semibold' 
                          : 'text-[#5E6C84] hover:bg-[#FAFBFC]'
                      }`}
                    >
                      Comments
                    </button>
                    <button
                      onClick={() => setActivityTab('mentions')}
                      className={`px-2 py-0.5 rounded-[3px] font-medium transition-colors cursor-pointer flex items-center gap-1 ${
                        activityTab === 'mentions' 
                          ? 'bg-[#EBECF0] text-[#172B4D] font-semibold' 
                          : 'text-[#5E6C84] hover:bg-[#FAFBFC]'
                      }`}
                    >
                      <AtSign className="w-3 h-3 text-[#0052CC]" />
                      <span>Mentions</span>
                    </button>
                    <button
                      onClick={() => setActivityTab('worklog')}
                      className={`px-2 py-0.5 rounded-[3px] font-medium transition-colors cursor-pointer flex items-center gap-1 ${
                        activityTab === 'worklog' 
                          ? 'bg-[#EBECF0] text-[#172B4D] font-semibold' 
                          : 'text-[#5E6C84] hover:bg-[#FAFBFC]'
                      }`}
                    >
                      <Clock className="w-3 h-3 text-[#0052CC]" />
                      <span>Work Log {timeSummary.worklogs.length > 0 ? `(${timeSummary.worklogs.length})` : ''}</span>
                    </button>
                    <button
                      onClick={() => setActivityTab('history')}
                      className={`px-2 py-0.5 rounded-[3px] font-medium transition-colors cursor-pointer ${
                        activityTab === 'history' 
                          ? 'bg-[#EBECF0] text-[#172B4D] font-semibold' 
                          : 'text-[#5E6C84] hover:bg-[#FAFBFC]'
                      }`}
                    >
                      History
                    </button>
                  </div>
                </div>

                {/* Jira Add Comment Box */}
                <form onSubmit={handleAddComment} className="space-y-2 bg-[#FAFBFC] p-3 rounded-[3px] border border-[#DFE1E6]">
                  <MentionTextarea 
                    value={commentText}
                    onChange={setCommentText}
                    placeholder="Add a comment... (type @ to mention a teammate)"
                    members={data?.allWorkspaceMembers || []}
                    projectMembers={data?.projectMembers || []}
                    disabled={submittingComment}
                    rows={2}
                    onSubmit={handleAddComment}
                  />
                  <div className="flex justify-between items-center pt-1">
                    <div className="text-[11px] text-[#5E6C84] flex items-center gap-1">
                      <span>Tip: type</span>
                      <kbd className="px-1 py-0.5 bg-[#EBECF0] text-[#172B4D] text-[10px] rounded border border-[#DFE1E6] font-mono">@</kbd>
                      <span>to mention or</span>
                      <kbd className="px-1 py-0.5 bg-[#EBECF0] text-[#172B4D] text-[10px] rounded border border-[#DFE1E6] font-mono">Ctrl+Enter</kbd>
                      <span>to save</span>
                    </div>
                    <div className="flex justify-end gap-2">
                      {commentText.trim() && (
                        <button
                          type="button"
                          onClick={() => setCommentText('')}
                          className="text-xs text-[#5E6C84] hover:text-[#172B4D] px-2 py-1 cursor-pointer"
                        >
                          Cancel
                        </button>
                      )}
                      <button 
                        type="submit" 
                        disabled={submittingComment || !commentText.trim()}
                        className="bg-[#0052CC] hover:bg-[#0747A6] active:bg-[#0047B3] text-white font-medium text-xs px-3 py-1 rounded-[3px] shadow-2xs transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                      >
                        <MessageSquare className="w-3 h-3" />
                        <span>{submittingComment ? 'Saving...' : 'Save'}</span>
                      </button>
                    </div>
                  </div>
                </form>

                {/* Immutable Timeline Stream (Requirement 9) */}
                <div className="space-y-3 pt-2">
                  {historyItems.length === 0 ? (
                    <p className="text-xs text-[#5E6C84] italic py-2">No activity recorded for this view.</p>
                  ) : (
                    historyItems.map((h: any) => {
                      const userName = h.profiles?.full_name || h.profiles?.email || 'User'
                      return (
                        <div key={h.id} className="flex gap-2.5 text-xs py-1">
                          <BusyAvatar 
                            name={h.profiles?.full_name} 
                            email={h.profiles?.email} 
                            size="sm" 
                          />
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-[#172B4D]">{userName}</span>
                              <span 
                                suppressHydrationWarning
                                className="text-[11px] text-[#5E6C84]"
                              >
                                {formatDateTime(h.created_at)}
                              </span>
                            </div>

                            {h.action_type === 'comment' ? (
                              <div className="space-y-1">
                                {containsUserMention(h.new_value, data?.currentUserId) && (
                                  <div className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-semibold text-[#0052CC] bg-[#DEEBFF] border border-[#B3D4FF] rounded-[3px]">
                                    <AtSign className="w-2.5 h-2.5" />
                                    <span>Mentioned you</span>
                                  </div>
                                )}
                                <div className={`p-2.5 rounded-[3px] text-[#172B4D] text-xs border leading-relaxed ${
                                  containsUserMention(h.new_value, data?.currentUserId)
                                    ? 'bg-[#F4F8FF] border-[#B3D4FF]'
                                    : 'bg-[#FAFBFC] border-[#DFE1E6]'
                                }`}>
                                  <CommentRenderer 
                                    content={h.new_value}
                                    currentUserId={data?.currentUserId}
                                    members={data?.allWorkspaceMembers || []}
                                  />
                                </div>
                              </div>
                            ) : h.action_type === 'status_change' ? (
                              <div className="text-[#5E6C84] flex items-center gap-1.5 flex-wrap">
                                <span>changed status from</span>
                                <BusyLozenge status={h.old_value} size="sm" />
                                <span>to</span>
                                <BusyLozenge status={h.new_value} size="sm" />
                              </div>
                            ) : h.action_type === 'blocked_change' ? (
                              <p className="text-[#5E6C84]">
                                {h.new_value === 'true' ? 'marked this issue as BLOCKED' : 'unblocked this issue'}
                              </p>
                            ) : h.action_type === 'created' ? (
                              <p className="text-[#5E6C84]">
                                created issue <span className="font-semibold text-[#172B4D]">"{h.new_value}"</span>
                              </p>
                            ) : h.action_type === 'assignment' ? (
                              <p className="text-[#5E6C84]">assigned a team member to this issue</p>
                            ) : h.action_type === 'unassignment' ? (
                              <p className="text-[#5E6C84]">unassigned a team member from this issue</p>
                            ) : h.action_type === 'worklog' ? (
                              (() => {
                                let payload: any = {}
                                try {
                                  payload = typeof h.new_value === 'string' && h.new_value.startsWith('{')
                                    ? JSON.parse(h.new_value)
                                    : { timeSpentFormatted: h.new_value }
                                } catch (e) {
                                  payload = { timeSpentFormatted: h.new_value }
                                }
                                const isAuthorOrManager = data?.isManager || (data?.currentUserId && data.currentUserId === h.actor_id)
                                return (
                                  <div className="space-y-1.5 p-2.5 bg-[#FAFBFC] border border-[#DFE1E6] rounded-[3px]">
                                    <div className="flex items-center justify-between gap-2">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#DEEBFF] text-[#0052CC] font-mono font-bold text-xs">
                                          <Clock className="w-3 h-3" />
                                          <span>Logged {payload.timeSpentFormatted}</span>
                                        </span>
                                        {payload.remainingFormatted && (
                                          <span className="text-[11px] text-[#5E6C84]">
                                            Remaining: <strong className="text-[#172B4D]">{payload.remainingFormatted}</strong>
                                          </span>
                                        )}
                                      </div>

                                      {isAuthorOrManager && (
                                        <button
                                          type="button"
                                          onClick={() => handleDeleteWorklog(h.id)}
                                          className="text-[#5E6C84] hover:text-[#DE350B] p-1 rounded transition-colors text-[11px] cursor-pointer"
                                          title="Delete work log entry"
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </button>
                                      )}
                                    </div>
                                    {payload.description && (
                                      <p className="text-xs text-[#172B4D] leading-relaxed pt-0.5 whitespace-pre-wrap">
                                        {payload.description}
                                      </p>
                                    )}
                                  </div>
                                )
                              })()
                            ) : h.action_type === 'estimate_updated' ? (
                              (() => {
                                let payload: any = {}
                                try {
                                  payload = typeof h.new_value === 'string' && h.new_value.startsWith('{')
                                    ? JSON.parse(h.new_value)
                                    : { estimateFormatted: h.new_value }
                                } catch (e) {
                                  payload = { estimateFormatted: h.new_value }
                                }
                                return (
                                  <p className="text-[#5E6C84] flex items-center gap-1.5">
                                    <Clock className="w-3 h-3 text-[#0052CC]" />
                                    <span>updated original estimate to</span>
                                    <span className="font-semibold text-[#172B4D] font-mono bg-[#EBECF0] px-1 py-0.5 rounded">
                                      {payload.estimateFormatted || h.new_value || 'None'}
                                    </span>
                                  </p>
                                )
                              })()
                            ) : h.action_type?.startsWith('updated_') ? (
                              <p className="text-[#5E6C84]">
                                updated <span className="font-semibold text-[#172B4D] capitalize">{h.action_type.replace('updated_', '').replace('_', ' ')}</span> from <span className="line-through text-[#5E6C84]">{h.old_value || 'None'}</span> to <span className="font-semibold text-[#172B4D]">{h.new_value || 'None'}</span>
                              </p>
                            ) : (
                              <p className="text-[#5E6C84]">{h.new_value || h.action_type}</p>
                            )}
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>

            </div>

            {/* 3. Right 1 Column: Metadata, Jira Status Selector, Assignee, Details */}
            <div className="space-y-5 bg-[#FAFBFC] p-4 rounded-[4px] border border-[#DFE1E6] h-fit">
              
              {/* Status Section & Legal Transitions */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-[#5E6C84] uppercase tracking-wider">
                  Status
                </label>

                {/* Status Dropdown Button */}
                <div className="relative">
                  <button
                    onClick={() => setStatusDropdownOpen(!statusDropdownOpen)}
                    className="w-full h-8 px-2.5 rounded-[3px] border border-[#DFE1E6] bg-white hover:bg-[#EBECF0] flex items-center justify-between shadow-2xs transition-colors cursor-pointer"
                  >
                    <BusyLozenge status={task?.status} size="md" isBlocked={task?.is_blocked} />
                    <ChevronDown className="w-3.5 h-3.5 text-[#5E6C84]" />
                  </button>

                  {statusDropdownOpen && (
                    <div className="absolute left-0 right-0 top-9 z-20 bg-white border border-[#DFE1E6] rounded-[3px] shadow-md p-1 space-y-0.5 animate-in fade-in">
                      <div className="px-2 py-1 text-[10px] font-bold text-[#5E6C84] uppercase">
                        Legal Next Transitions
                      </div>
                      {legalNextStatuses.length === 0 ? (
                        <div className="px-2 py-1 text-xs text-[#5E6C84] italic">
                          No moves available
                        </div>
                      ) : (
                        legalNextStatuses.map((nextStatus) => (
                          <button
                            key={nextStatus}
                            onClick={() => handleStatusChange(nextStatus)}
                            className="w-full text-left px-2 py-1.5 text-xs hover:bg-[#EBECF0] rounded-[2px] flex items-center justify-between transition-colors cursor-pointer"
                          >
                            <BusyLozenge status={nextStatus} size="sm" />
                            <ArrowRight className="w-3 h-3 text-[#5E6C84]" />
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>

                {/* Block / Unblock Toggle (Requirement 4) */}
                {(task?.status === 'In Progress' || task?.status === 'In Review') && (
                  <button
                    onClick={handleToggleBlocked}
                    className={`w-full py-1 text-xs font-semibold rounded-[3px] border transition-colors cursor-pointer ${
                      task?.is_blocked
                        ? 'bg-[#FFEBE6] text-[#DE350B] border-[#FFBDAD] hover:bg-[#FFD2CC]'
                        : 'bg-white text-[#42526E] border-[#DFE1E6] hover:bg-[#EBECF0]'
                    }`}
                  >
                    {task?.is_blocked ? 'Unblock Issue' : 'Mark as Blocked'}
                  </button>
                )}
              </div>

              {/* Details Section */}
              <div className="space-y-4 pt-2 border-t border-[#DFE1E6]">
                <h5 className="text-[11px] font-bold text-[#5E6C84] uppercase tracking-wider">
                  Details
                </h5>

                {/* Priority */}
                <div className="space-y-1">
                  <span className="text-[11px] font-semibold text-[#5E6C84]">Priority</span>
                  <div className="flex items-center gap-2">
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as TaskPriority)}
                      className="w-full h-7 rounded-[3px] border border-[#DFE1E6] bg-white px-2 text-xs font-medium text-[#172B4D] outline-none cursor-pointer hover:bg-[#EBECF0]"
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                      <option value="Urgent">Urgent</option>
                    </select>
                  </div>
                </div>

                {/* Due Date */}
                <div className="space-y-1">
                  <span className="text-[11px] font-semibold text-[#5E6C84]">Due Date</span>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className={`w-full h-7 text-xs border rounded-[3px] bg-white px-2 outline-none cursor-pointer ${
                      isTaskOverdue ? 'border-[#DE350B] text-[#DE350B] font-semibold' : 'border-[#DFE1E6] text-[#172B4D]'
                    }`}
                  />
                  {isTaskOverdue && (
                    <span className="text-[10px] font-semibold text-[#DE350B]">
                      This issue is overdue!
                    </span>
                  )}
                </div>

                {/* Assignees (Requirement 5) */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-semibold text-[#5E6C84]">Assignees</span>
                  <div className="space-y-1">
                    {task?.task_assignments?.length === 0 ? (
                      <p className="text-xs text-[#5E6C84] italic">Unassigned</p>
                    ) : (
                      task?.task_assignments?.map((a: any) => (
                        <div 
                          key={a.user_id} 
                          className="flex items-center justify-between gap-1.5 text-xs text-[#172B4D] bg-white p-1.5 rounded-[3px] border border-[#DFE1E6]"
                        >
                          <div className="flex items-center gap-1.5 truncate">
                            <BusyAvatar 
                              name={a.profiles?.full_name} 
                              email={a.profiles?.email} 
                              size="xs" 
                            />
                            <span className="truncate">{a.profiles?.full_name || a.profiles?.email}</span>
                          </div>
                          <button
                            onClick={() => handleToggleAssignment(a.user_id, false)}
                            className="text-[#5E6C84] hover:text-[#DE350B] p-0.5 cursor-pointer"
                            title="Unassign"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Add Assignee Dropdown (Only members of project) */}
                  <div className="pt-1">
                    <select
                      className="w-full h-7 text-xs border border-[#DFE1E6] rounded-[3px] bg-white px-2 text-[#172B4D] outline-none cursor-pointer hover:bg-[#EBECF0]"
                      value=""
                      onChange={(e) => {
                        if (e.target.value) {
                          handleToggleAssignment(e.target.value, true)
                        }
                      }}
                    >
                      <option value="">+ Assign team member...</option>
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

                {/* Time Tracking Section */}
                <div className="pt-3 border-t border-[#DFE1E6] space-y-2">
                  <h5 className="text-[11px] font-bold text-[#5E6C84] uppercase tracking-wider">
                    Time Tracking
                  </h5>
                  <TimeTrackingProgress
                    summary={timeSummary}
                    onOpenLogWork={() => setLogWorkOpen(true)}
                    onOpenEstimate={() => setEstimateModalOpen(true)}
                  />
                </div>

                {/* Project Info */}
                <div className="pt-2 border-t border-[#DFE1E6] space-y-1 text-xs">
                  <span className="text-[11px] font-semibold text-[#5E6C84]">Project</span>
                  <div className="font-semibold text-[#172B4D]">
                    {task?.projects?.name || 'Company Portfolio'} ({task?.projects?.key || 'CP'})
                  </div>
                </div>

              </div>

            </div>

          </div>
        )}

        {/* Time Tracking Modals */}
        {data?.task && (
          <>
            <LogWorkModal
              open={logWorkOpen}
              onOpenChange={setLogWorkOpen}
              taskId={data.task.id}
              issueKey={issueKey}
              taskTitle={data.task.title}
              currentSummary={timeSummary}
              onWorkLogged={() => {
                showSuccess('Work logged to issue timeline')
                loadData()
              }}
            />
            <SetEstimateModal
              open={estimateModalOpen}
              onOpenChange={setEstimateModalOpen}
              taskId={data.task.id}
              issueKey={issueKey}
              taskTitle={data.task.title}
              currentEstimateFormatted={timeSummary.originalEstimateFormatted}
              onEstimateSaved={() => {
                showSuccess('Original estimate updated')
                loadData()
              }}
            />
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
