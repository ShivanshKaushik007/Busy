'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  FolderKanban, Plus, Archive, ArchiveRestore, 
  Users, CheckCircle2, AlertCircle, Loader2, KeyRound 
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { createProject, toggleArchiveProject, updateProjectMembers } from '@/app/actions/projectActions'

interface ProjectsClientProps {
  initialProjects: any[]
  isManager: boolean
  allProfiles: any[]
}

export default function ProjectsClient({ initialProjects, isManager, allProfiles }: ProjectsClientProps) {
  const router = useRouter()
  const [projects, setProjects] = useState(initialProjects)
  const [showArchived, setShowArchived] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  
  // Project creation form
  const [key, setKey] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Members modal
  const [membersModalProject, setMembersModalProject] = useState<any | null>(null)
  const [selectedMembers, setSelectedMembers] = useState<string[]>([])
  const [savingMembers, setSavingMembers] = useState(false)

  const showFeedback = (msg: string) => {
    setSuccess(msg)
    setTimeout(() => setSuccess(null), 3000)
    router.refresh()
  }

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!key.trim() || !name.trim()) {
      setError('Key and Name are required.')
      return
    }

    setLoading(true)
    setError(null)

    const res = await createProject({
      key: key.trim().toUpperCase(),
      name: name.trim(),
      description: description.trim() || undefined
    })

    setLoading(false)

    if (res.error) {
      setError(res.error)
    } else {
      setKey('')
      setName('')
      setDescription('')
      setCreateOpen(false)
      showFeedback('Project created successfully!')
    }
  }

  const handleArchiveToggle = async (projectId: string, currentArchived: boolean) => {
    const res = await toggleArchiveProject(projectId, !currentArchived)
    if (res.error) {
      alert(res.error)
    } else {
      showFeedback(currentArchived ? 'Project restored' : 'Project archived')
    }
  }

  const openMembersModal = (proj: any) => {
    setMembersModalProject(proj)
    const currentIds = (proj.project_members || []).map((m: any) => m.user_id)
    setSelectedMembers(currentIds)
  }

  const handleSaveMembers = async () => {
    if (!membersModalProject) return
    setSavingMembers(true)
    const res = await updateProjectMembers(membersModalProject.id, selectedMembers)
    setSavingMembers(false)
    if (res.error) {
      alert(res.error)
    } else {
      setMembersModalProject(null)
      showFeedback('Project members updated')
    }
  }

  const filteredProjects = initialProjects.filter(p => 
    showArchived ? p.is_archived : !p.is_archived
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <nav className="text-sm text-gray-500 mb-1">
            Overview / <span className="text-gray-900 font-medium">Projects</span>
          </nav>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">Projects Portfolio</h2>
          <p className="text-sm text-gray-500">
            {isManager ? 'Manage software projects, team access, and archiving.' : 'Projects you are an active member of.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isManager && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowArchived(!showArchived)}
                className="h-9 gap-1.5"
              >
                {showArchived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
                {showArchived ? 'View Active' : 'View Archived'}
              </Button>

              <Button
                onClick={() => setCreateOpen(true)}
                size="sm"
                className="h-9 gap-1.5 bg-primary text-primary-foreground"
              >
                <Plus className="h-4 w-4" /> New Project
              </Button>
            </>
          )}
        </div>
      </div>

      {success && (
        <div className="p-3 text-sm text-green-700 bg-green-50 border border-green-200 rounded-md flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Projects Grid */}
      {filteredProjects.length === 0 ? (
        <div className="text-center py-16 bg-white border border-dashed rounded-lg">
          <FolderKanban className="h-10 w-10 text-gray-400 mx-auto mb-2" />
          <h3 className="text-base font-semibold text-gray-900">No {showArchived ? 'archived' : 'active'} projects found</h3>
          <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">
            {isManager 
              ? 'Get started by creating your first project for the team.' 
              : 'You have not been added to any active projects yet.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map(proj => (
            <Card key={proj.id} className="border-gray-200 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-200">
                      {proj.key}
                    </span>
                    {proj.is_archived && (
                      <Badge variant="secondary" className="text-xs">Archived</Badge>
                    )}
                  </div>
                  <span className="text-xs text-gray-400">
                    {proj.tasks?.length || 0} issues
                  </span>
                </div>
                <CardTitle className="text-lg font-bold text-gray-900 pt-2">{proj.name}</CardTitle>
                <CardDescription className="line-clamp-2 text-xs">
                  {proj.description || 'No description provided.'}
                </CardDescription>
              </CardHeader>

              <CardContent className="pt-0 border-t border-gray-100 mt-3 pt-3 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <Users className="h-3.5 w-3.5" />
                  <span>{proj.project_members?.length || 0} members</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <Link href={`/tasks?project=${proj.id}`}>
                    <Button variant="ghost" size="sm" className="h-7 text-xs text-primary font-medium">
                      View Tasks
                    </Button>
                  </Link>

                  {isManager && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => openMembersModal(proj)}
                      >
                        Team
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-gray-500 hover:text-red-600"
                        onClick={() => handleArchiveToggle(proj.id, proj.is_archived)}
                      >
                        {proj.is_archived ? 'Restore' : 'Archive'}
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Project Modal (Managers Only) */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
            <DialogDescription>
              Managers create projects with a short key, a name, and description.
            </DialogDescription>
          </DialogHeader>

          {error && (
            <div className="p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleCreateProject} className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-1 space-y-1.5">
                <Label htmlFor="proj-key">Key <span className="text-red-500">*</span></Label>
                <Input
                  id="proj-key"
                  placeholder="PRJ"
                  value={key}
                  onChange={(e) => setKey(e.target.value.toUpperCase())}
                  maxLength={10}
                  required
                />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="proj-name">Name <span className="text-red-500">*</span></Label>
                <Input
                  id="proj-name"
                  placeholder="Website Redesign"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="proj-desc">Description</Label>
              <Textarea
                id="proj-desc"
                placeholder="High-level goals and client scope..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)} disabled={loading}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading} className="bg-primary text-primary-foreground">
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Create Project
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Project Members Modal */}
      <Dialog open={!!membersModalProject} onOpenChange={(open) => { if (!open) setMembersModalProject(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage Project Members</DialogTitle>
            <DialogDescription>
              Assign team members to <strong>{membersModalProject?.name}</strong>. Removing someone unassigns them from tasks.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-60 overflow-y-auto space-y-2 border rounded-md p-3 bg-gray-50/50">
            {allProfiles.map(prof => {
              const isChecked = selectedMembers.includes(prof.id)
              return (
                <label key={prof.id} className="flex items-center justify-between p-2 rounded hover:bg-white cursor-pointer border">
                  <div>
                    <span className="font-semibold text-sm text-gray-800">{prof.full_name || prof.email}</span>
                    <p className="text-xs text-gray-500">{prof.email} ({prof.role})</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => {
                      setSelectedMembers(prev => 
                        prev.includes(prof.id) ? prev.filter(id => id !== prof.id) : [...prev, prof.id]
                      )
                    }}
                    className="h-4 w-4 rounded text-primary focus:ring-primary"
                  />
                </label>
              )
            })}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setMembersModalProject(null)} disabled={savingMembers}>
              Cancel
            </Button>
            <Button onClick={handleSaveMembers} disabled={savingMembers} className="bg-primary text-primary-foreground">
              {savingMembers ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Save Members
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
