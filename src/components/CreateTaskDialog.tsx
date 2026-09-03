'use client'

import React, { useState, useEffect } from 'react'
import { Plus, Loader2, AlertCircle, Lock, Calendar } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { createTask, getUserProjects, getProjectMembersAndTasks } from '@/app/actions/taskActions'
import { TaskPriority } from '@/lib/types'
import BusyIssueTypeIcon from '@/components/busy/BusyIssueTypeIcon'
import BusyPriorityIcon from '@/components/busy/BusyPriorityIcon'
import BusyAvatar from '@/components/busy/BusyAvatar'

interface CreateTaskDialogProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  trigger?: React.ReactNode
  defaultProjectId?: string
}

export default function CreateTaskDialog({
  open: controlledOpen,
  onOpenChange: setControlledOpen,
  trigger,
  defaultProjectId
}: CreateTaskDialogProps) {
  const [open, setOpen] = useState(false)
  const isControlled = controlledOpen !== undefined
  const isOpen = isControlled ? controlledOpen : open
  const setIsOpen = (val: boolean) => {
    if (isControlled) setControlledOpen?.(val)
    else setOpen(val)
  }

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Projects list
  const [projects, setProjects] = useState<Array<{ id: string; name: string; key: string }>>([])
  const [selectedProjectId, setSelectedProjectId] = useState<string>(defaultProjectId || '')

  // Project context (members and tasks)
  const [members, setMembers] = useState<Array<{ id: string; full_name: string; email: string }>>([])
  const [availableTasks, setAvailableTasks] = useState<Array<{ id: string; title: string; status: string }>>([])

  // Form states
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<TaskPriority>('Medium')
  const [dueDate, setDueDate] = useState('')
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([])
  const [selectedBlockers, setSelectedBlockers] = useState<string[]>([])

  // Load available projects on open
  useEffect(() => {
    if (isOpen) {
      setError(null)
      getUserProjects().then(projs => {
        setProjects(projs)
        if (!selectedProjectId && projs.length > 0) {
          setSelectedProjectId(defaultProjectId || projs[0].id)
        }
      })
    }
  }, [isOpen, defaultProjectId])

  // Load project context whenever selected project changes
  useEffect(() => {
    if (selectedProjectId) {
      getProjectMembersAndTasks(selectedProjectId).then(ctx => {
        setMembers(ctx.members)
        setAvailableTasks(ctx.tasks)
      })
    } else {
      setMembers([])
      setAvailableTasks([])
    }
    setSelectedAssignees([])
    setSelectedBlockers([])
  }, [selectedProjectId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      setError('Please provide a summary for the issue.')
      return
    }
    if (!selectedProjectId) {
      setError('Please select a project.')
      return
    }

    setLoading(true)
    setError(null)

    const res = await createTask({
      projectId: selectedProjectId,
      title: title.trim(),
      description: description.trim() || undefined,
      priority,
      dueDate: dueDate || null,
      assignedUserIds: selectedAssignees,
      blockingTaskIds: selectedBlockers
    })

    setLoading(false)

    if (res.error) {
      setError(res.error)
    } else {
      // Reset
      setTitle('')
      setDescription('')
      setPriority('Medium')
      setDueDate('')
      setSelectedAssignees([])
      setSelectedBlockers([])
      setIsOpen(false)
    }
  }

  const toggleAssignee = (uid: string) => {
    setSelectedAssignees(prev => 
      prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]
    )
  }

  const toggleBlocker = (tid: string) => {
    setSelectedBlockers(prev =>
      prev.includes(tid) ? prev.filter(id => id !== tid) : [...prev, tid]
    )
  }

  return (
    <>
      {trigger ? (
        <span onClick={() => setIsOpen(true)}>{trigger}</span>
      ) : (
        <button 
          onClick={() => setIsOpen(true)}
          className="bg-[#0052CC] hover:bg-[#0747A6] active:bg-[#0047B3] text-white font-medium text-xs px-3 py-1.5 rounded-[3px] shadow-2xs transition-colors flex items-center gap-1 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>Create</span>
        </button>
      )}

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] flex flex-col p-0 overflow-hidden bg-white rounded-[4px] border border-[#DFE1E6] shadow-xl">
          <div className="px-6 py-4 border-b border-[#DFE1E6] bg-[#FAFBFC]">
            <DialogHeader className="p-0">
              <div className="flex items-center gap-2">
                <BusyIssueTypeIcon type="task" size={16} />
                <DialogTitle className="text-base font-bold text-[#172B4D]">Create Issue</DialogTitle>
              </div>
              <DialogDescription className="text-xs text-[#5E6C84]">
                Create a new issue in your Busy workspace.
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="p-6 overflow-y-auto flex-1">
            {error && (
              <div className="p-2.5 mb-4 text-xs text-[#DE350B] bg-[#FFEBE6] border border-[#FFBDAD] rounded-[3px] flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-[#DE350B]" />
                <span className="font-medium">{error}</span>
              </div>
            )}

            <form id="busy-create-issue-form" onSubmit={handleSubmit} className="space-y-4 text-xs text-[#172B4D]">
              {/* Project Selector */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#5E6C84] uppercase tracking-wider">
                  Project <span className="text-[#DE350B]">*</span>
                </label>
                <select
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="w-full h-8 rounded-[3px] border border-[#DFE1E6] bg-white px-2.5 text-xs text-[#172B4D] font-medium outline-none cursor-pointer focus:border-[#0052CC] focus:ring-1 focus:ring-[#0052CC]"
                  required
                >
                  {projects.length === 0 && <option value="">No projects available</option>}
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>
                      [{p.key}] {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Issue Type info */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#5E6C84] uppercase tracking-wider">
                  Issue Type
                </label>
                <div className="flex items-center gap-2 h-8 px-2.5 bg-[#FAFBFC] border border-[#DFE1E6] rounded-[3px] text-xs font-medium text-[#172B4D]">
                  <BusyIssueTypeIcon type="task" size={14} />
                  <span>Task</span>
                </div>
              </div>

              {/* Summary / Title */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#5E6C84] uppercase tracking-wider">
                  Summary <span className="text-[#DE350B]">*</span>
                </label>
                <input
                  placeholder="What needs to be done?"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="w-full h-8 px-2.5 rounded-[3px] border border-[#DFE1E6] bg-white text-xs text-[#172B4D] outline-none focus:border-[#0052CC] focus:ring-1 focus:ring-[#0052CC]"
                />
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#5E6C84] uppercase tracking-wider">
                  Description
                </label>
                <textarea
                  placeholder="Add details, steps, or acceptance criteria..."
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-2.5 rounded-[3px] border border-[#DFE1E6] bg-white text-xs text-[#172B4D] outline-none focus:border-[#0052CC] focus:ring-1 focus:ring-[#0052CC]"
                />
              </div>

              {/* Priority & Due Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#5E6C84] uppercase tracking-wider">
                    Priority
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as TaskPriority)}
                    className="w-full h-8 rounded-[3px] border border-[#DFE1E6] bg-white px-2.5 text-xs text-[#172B4D] font-medium outline-none cursor-pointer focus:border-[#0052CC] focus:ring-1 focus:ring-[#0052CC]"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#5E6C84] uppercase tracking-wider">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full h-8 rounded-[3px] border border-[#DFE1E6] bg-white px-2 text-xs text-[#172B4D] outline-none focus:border-[#0052CC] focus:ring-1 focus:ring-[#0052CC]"
                  />
                </div>
              </div>

              {/* Assignees */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-[#5E6C84] uppercase tracking-wider">
                  Assignees (Project members only)
                </label>
                {members.length === 0 ? (
                  <p className="text-xs text-[#5E6C84] italic">No members in this project yet.</p>
                ) : (
                  <div className="max-h-28 overflow-y-auto border border-[#DFE1E6] rounded-[3px] p-2 space-y-1 bg-[#FAFBFC]">
                    {members.map(m => (
                      <label key={m.id} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-white p-1 rounded-[2px]">
                        <input
                          type="checkbox"
                          checked={selectedAssignees.includes(m.id)}
                          onChange={() => toggleAssignee(m.id)}
                          className="rounded-[2px] border-[#DFE1E6] text-[#0052CC] focus:ring-[#0052CC] cursor-pointer"
                        />
                        <BusyAvatar name={m.full_name} email={m.email} size="xs" />
                        <span className="font-medium text-[#172B4D]">{m.full_name || m.email}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Blocking Dependencies */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-[#5E6C84] uppercase tracking-wider flex items-center gap-1">
                  <Lock className="w-3 h-3 text-[#FFAB00]" />
                  <span>Blocked By (Optional Dependencies)</span>
                </label>
                {availableTasks.length === 0 ? (
                  <p className="text-xs text-[#5E6C84] italic">No other tasks in this project yet.</p>
                ) : (
                  <div className="max-h-28 overflow-y-auto border border-[#DFE1E6] rounded-[3px] p-2 space-y-1 bg-[#FAFBFC]">
                    {availableTasks.map(t => (
                      <label key={t.id} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-white p-1 rounded-[2px]">
                        <input
                          type="checkbox"
                          checked={selectedBlockers.includes(t.id)}
                          onChange={() => toggleBlocker(t.id)}
                          className="rounded-[2px] border-[#DFE1E6] text-[#0052CC] focus:ring-[#0052CC] cursor-pointer"
                        />
                        <span className="font-medium text-[#172B4D] truncate">{t.title}</span>
                        <span className="text-[10px] text-[#5E6C84] ml-auto">({t.status})</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </form>
          </div>

          <div className="px-6 py-3 border-t border-[#DFE1E6] bg-[#FAFBFC] flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-3 py-1.5 text-xs font-medium text-[#42526E] hover:text-[#172B4D] hover:bg-[#EBECF0] rounded-[3px] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="jira-create-issue-form"
              disabled={loading || !title.trim()}
              className="bg-[#0052CC] hover:bg-[#0747A6] active:bg-[#0047B3] text-white font-medium text-xs px-3.5 py-1.5 rounded-[3px] shadow-2xs transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{loading ? 'Creating...' : 'Create'}</span>
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
