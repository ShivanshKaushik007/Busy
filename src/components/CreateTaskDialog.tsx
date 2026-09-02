'use client'

import { useState, useEffect } from 'react'
import { Plus, Loader2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { createTask, getUserProjects, getProjectMembersAndTasks } from '@/app/actions/taskActions'
import { TaskPriority } from '@/lib/types'

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
      setError('Please provide a title for the task.')
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
        <Button 
          onClick={() => setIsOpen(true)}
          className="h-8 px-3 bg-primary text-primary-foreground hover:bg-primary/90 font-medium flex items-center gap-1.5"
        >
          <Plus className="h-4 w-4" /> Create
        </Button>
      )}

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Create Task</DialogTitle>
            <DialogDescription>
              Add a new task to track inside a project.
            </DialogDescription>
          </DialogHeader>

          {error && (
            <div className="p-3 mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Project Selector */}
            <div className="space-y-1.5">
              <Label htmlFor="project">Project <span className="text-red-500">*</span></Label>
              <select
                id="project"
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-primary"
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

            {/* Task Title */}
            <div className="space-y-1.5">
              <Label htmlFor="title">Title <span className="text-red-500">*</span></Label>
              <Input
                id="title"
                placeholder="What needs to be done?"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Add more details, steps, or acceptance criteria..."
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {/* Priority & Due Date Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="priority">Priority</Label>
                <select
                  id="priority"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as TaskPriority)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Urgent">Urgent</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="dueDate">Due Date</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
            </div>

            {/* Assignees (Project Members Only) */}
            <div className="space-y-1.5">
              <Label>Assignees (Project members only)</Label>
              {members.length === 0 ? (
                <p className="text-xs text-muted-foreground">No members in this project yet.</p>
              ) : (
                <div className="max-h-28 overflow-y-auto border border-input rounded-md p-2 space-y-1.5 bg-gray-50/50">
                  {members.map(m => (
                    <label key={m.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-white p-1 rounded">
                      <Checkbox
                        checked={selectedAssignees.includes(m.id)}
                        onCheckedChange={() => toggleAssignee(m.id)}
                      />
                      <span className="font-medium text-gray-800">{m.full_name || m.email}</span>
                      <span className="text-xs text-gray-500">({m.email})</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Blocking Dependencies */}
            <div className="space-y-1.5">
              <Label>Blocked By (Other tasks that must finish before this one)</Label>
              {availableTasks.length === 0 ? (
                <p className="text-xs text-muted-foreground">No unfinished tasks in this project to block this task.</p>
              ) : (
                <div className="max-h-28 overflow-y-auto border border-input rounded-md p-2 space-y-1.5 bg-gray-50/50">
                  {availableTasks.map(t => (
                    <label key={t.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-white p-1 rounded">
                      <Checkbox
                        checked={selectedBlockers.includes(t.id)}
                        onCheckedChange={() => toggleBlocker(t.id)}
                      />
                      <span className="font-medium text-gray-800">{t.title}</span>
                      <span className="text-xs text-muted-foreground">({t.status})</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpen(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading} className="bg-primary text-primary-foreground">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...
                  </>
                ) : (
                  'Create Task'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
