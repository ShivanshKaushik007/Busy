'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  FolderKanban, 
  Plus, 
  Archive, 
  ArchiveRestore, 
  Users, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Edit, 
  UserCheck,
  Star,
  Search,
  MoreHorizontal
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { createProject, toggleArchiveProject, updateProjectMembers, updateProject } from '@/app/actions/projectActions'
import BusyAvatar from '@/components/busy/BusyAvatar'

interface ProjectsClientProps {
  initialProjects: any[]
  isManager: boolean
  allProfiles: any[]
}

export default function ProjectsClient({ initialProjects, isManager, allProfiles }: ProjectsClientProps) {
  const router = useRouter()
  const [showArchived, setShowArchived] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  
  // Project creation form
  const [key, setKey] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [ownerId, setOwnerId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Edit Project Modal
  const [editModalProject, setEditModalProject] = useState<any | null>(null)
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editOwnerId, setEditOwnerId] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)

  // Members modal
  const [membersModalProject, setMembersModalProject] = useState<any | null>(null)
  const [selectedMembers, setSelectedMembers] = useState<string[]>([])
  const [savingMembers, setSavingMembers] = useState(false)

  const showFeedback = (msg: string) => {
    setSuccess(msg)
    setTimeout(() => setSuccess(null), 3000)
    router.refresh()
  }

  // 1. Create Project
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
      description: description.trim() || undefined,
      ownerId: ownerId || undefined
    })

    setLoading(false)

    if (res.error) {
      setError(res.error)
    } else {
      setKey('')
      setName('')
      setDescription('')
      setOwnerId('')
      setCreateOpen(false)
      showFeedback('Project created successfully!')
    }
  }

  // 2. Open Edit Project Modal
  const openEditModal = (proj: any) => {
    setEditModalProject(proj)
    setEditName(proj.name || '')
    setEditDescription(proj.description || '')
    setEditOwnerId(proj.owner_id || '')
  }

  // 3. Save Project Edits
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editModalProject) return
    if (!editName.trim()) {
      alert('Project name is required.')
      return
    }

    setSavingEdit(true)
    const res = await updateProject(editModalProject.id, {
      name: editName.trim(),
      description: editDescription.trim(),
      ownerId: editOwnerId || undefined
    })
    setSavingEdit(false)

    if (res.error) {
      alert(res.error)
    } else {
      setEditModalProject(null)
      showFeedback('Project details updated!')
    }
  }

  // 4. Archive / Restore Toggle
  const handleArchiveToggle = async (projectId: string, currentArchived: boolean) => {
    const res = await toggleArchiveProject(projectId, !currentArchived)
    if (res.error) {
      alert(res.error)
    } else {
      showFeedback(currentArchived ? 'Project restored' : 'Project archived')
    }
  }

  // 5. Members Modal
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

  const filteredProjects = initialProjects.filter(p => {
    const matchesArchived = showArchived ? p.is_archived : !p.is_archived
    const matchesSearch = !searchQuery || 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      p.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description?.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesArchived && matchesSearch
  })

  return (
    <div className="space-y-4 select-none">
      {/* 1. Breadcrumbs & Header */}
      <div>
        <nav className="text-xs text-[#5E6C84] mb-1 flex items-center gap-1.5 font-medium">
          <span>Projects</span>
          <span>/</span>
          <span className="text-[#172B4D] font-semibold">Projects Directory</span>
        </nav>
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold text-[#172B4D] tracking-tight">Projects</h1>
            <p className="text-xs text-[#5E6C84]">
              {isManager ? 'Manage portfolio projects, project leads, access, and settings.' : 'Projects you are an active member of.'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {isManager && (
              <button
                onClick={() => setCreateOpen(true)}
                className="bg-[#0052CC] hover:bg-[#0747A6] active:bg-[#0047B3] text-white font-medium text-xs px-3 py-1.5 rounded-[3px] shadow-2xs transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Create project</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Success Notification */}
      {success && (
        <div className="p-2.5 text-xs text-[#006644] bg-[#E3FCEF] border border-[#ABF5D1] rounded-[3px] flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-[#006644]" />
          <span className="font-medium">{success}</span>
        </div>
      )}

      {/* 2. Filter Bar & Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#DFE1E6] pb-2">
        {/* Search */}
        <div className="relative w-64">
          <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-[#5E6C84]" />
          <input
            type="text"
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-8 pl-8 pr-3 bg-white border border-[#DFE1E6] focus:border-[#0052CC] focus:ring-1 focus:ring-[#0052CC] rounded-[3px] text-xs text-[#172B4D] placeholder:text-[#5E6C84] transition-all outline-none"
          />
        </div>

        {/* Jira Tabs: Active vs Archived */}
        {isManager && (
          <div className="flex items-center gap-1 text-xs">
            <button
              onClick={() => setShowArchived(false)}
              className={`px-3 py-1.5 font-medium rounded-[3px] transition-colors cursor-pointer ${
                !showArchived 
                  ? 'bg-[#DEEBFF] text-[#0052CC] font-semibold' 
                  : 'text-[#5E6C84] hover:bg-[#EBECF0]'
              }`}
            >
              Active Projects
            </button>
            <button
              onClick={() => setShowArchived(true)}
              className={`px-3 py-1.5 font-medium rounded-[3px] transition-colors cursor-pointer ${
                showArchived 
                  ? 'bg-[#DEEBFF] text-[#0052CC] font-semibold' 
                  : 'text-[#5E6C84] hover:bg-[#EBECF0]'
              }`}
            >
              Archived
            </button>
          </div>
        )}
      </div>

      {/* 3. Jira Projects Directory Table */}
      <div className="bg-white border border-[#DFE1E6] rounded-[3px] shadow-2xs overflow-x-auto">
        <table className="w-full text-left text-xs text-[#172B4D]">
          <thead className="bg-[#F4F5F7] border-b border-[#DFE1E6] text-[11px] font-bold text-[#5E6C84] uppercase tracking-wider">
            <tr>
              <th className="w-8 px-3 py-2.5">
                <Star className="w-3.5 h-3.5 text-[#DFE1E6]" />
              </th>
              <th className="px-3 py-2.5">Name</th>
              <th className="w-24 px-3 py-2.5">Key</th>
              <th className="w-36 px-3 py-2.5">Type</th>
              <th className="w-48 px-3 py-2.5">Project Lead</th>
              <th className="w-24 px-3 py-2.5">Members</th>
              <th className="w-24 px-3 py-2.5">Issues</th>
              {isManager && <th className="w-32 px-3 py-2.5 text-right">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#DFE1E6]">
            {filteredProjects.length === 0 ? (
              <tr>
                <td colSpan={isManager ? 8 : 7} className="h-32 text-center text-[#5E6C84] text-xs">
                  No {showArchived ? 'archived' : 'active'} projects found.
                </td>
              </tr>
            ) : (
              filteredProjects.map((proj) => {
                const ownerName = proj.profiles?.full_name || proj.profiles?.email || 'Unassigned'
                const memberCount = proj.project_members?.length || 0
                const issueCount = proj.tasks?.length || 0

                return (
                  <tr key={proj.id} className="hover:bg-[#F4F5F7] transition-colors group">
                    {/* Star */}
                    <td className="px-3 py-3">
                      <Star className="w-3.5 h-3.5 text-[#DFE1E6] group-hover:text-[#FFAB00] transition-colors cursor-pointer" />
                    </td>

                    {/* Name + Icon */}
                    <td className="px-3 py-3 font-semibold text-[#172B4D]">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-[3px] bg-gradient-to-br from-[#0052CC] to-[#2684FF] text-white flex items-center justify-center font-bold text-[11px] shrink-0 shadow-2xs">
                          {proj.key.slice(0, 2)}
                        </div>
                        <div>
                          <Link 
                            href={`/tasks?project=${proj.id}`} 
                            className="hover:text-[#0052CC] hover:underline transition-colors"
                          >
                            {proj.name}
                          </Link>
                          {proj.description && (
                            <p className="text-[11px] text-[#5E6C84] font-normal truncate max-w-sm">
                              {proj.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Key */}
                    <td className="px-3 py-3 font-mono text-xs font-bold text-[#5E6C84]">
                      {proj.key}
                    </td>

                    {/* Type */}
                    <td className="px-3 py-3 text-[#5E6C84]">
                      Software project
                    </td>

                    {/* Lead */}
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1.5">
                        <BusyAvatar name={ownerName} size="xs" />
                        <span className="truncate max-w-[140px] text-[#172B4D]">{ownerName}</span>
                      </div>
                    </td>

                    {/* Members */}
                    <td className="px-3 py-3 text-[#5E6C84]">
                      {memberCount}
                    </td>

                    {/* Issues */}
                    <td className="px-3 py-3 text-[#5E6C84]">
                      {issueCount}
                    </td>

                    {/* Actions */}
                    {isManager && (
                      <td className="px-3 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEditModal(proj)}
                            className="px-2 py-1 text-[11px] font-medium text-[#42526E] hover:text-[#172B4D] hover:bg-[#EBECF0] rounded-[2px] transition-colors cursor-pointer"
                            title="Edit project details"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => openMembersModal(proj)}
                            className="px-2 py-1 text-[11px] font-medium text-[#42526E] hover:text-[#172B4D] hover:bg-[#EBECF0] rounded-[2px] transition-colors cursor-pointer"
                            title="Manage project team"
                          >
                            Team
                          </button>
                          <button
                            onClick={() => handleArchiveToggle(proj.id, proj.is_archived)}
                            className="px-2 py-1 text-[11px] font-medium text-[#DE350B] hover:bg-[#FFEBE6] rounded-[2px] transition-colors cursor-pointer"
                            title={proj.is_archived ? 'Restore project' : 'Archive project'}
                          >
                            {proj.is_archived ? 'Restore' : 'Archive'}
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* 4. Create Project Modal */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md p-0 overflow-hidden bg-white rounded-[4px] border border-[#DFE1E6] shadow-xl">
          <div className="px-6 py-4 border-b border-[#DFE1E6] bg-[#FAFBFC]">
            <DialogHeader className="p-0">
              <DialogTitle className="text-base font-bold text-[#172B4D]">Create Project</DialogTitle>
              <DialogDescription className="text-xs text-[#5E6C84]">
                Create a software project for team collaboration.
              </DialogDescription>
            </DialogHeader>
          </div>

          <form onSubmit={handleCreateProject} className="p-6 space-y-4 text-xs text-[#172B4D]">
            {error && (
              <div className="p-2.5 text-xs text-[#DE350B] bg-[#FFEBE6] border border-[#FFBDAD] rounded-[3px] flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-[#DE350B]" />
                <span className="font-medium">{error}</span>
              </div>
            )}

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-1 space-y-1">
                <label className="text-[11px] font-bold text-[#5E6C84] uppercase tracking-wider">
                  Key <span className="text-[#DE350B]">*</span>
                </label>
                <input
                  placeholder="PRJ"
                  value={key}
                  onChange={(e) => setKey(e.target.value.toUpperCase())}
                  maxLength={8}
                  required
                  className="w-full h-8 px-2.5 rounded-[3px] border border-[#DFE1E6] bg-white font-mono font-bold text-xs uppercase outline-none focus:border-[#0052CC] focus:ring-1 focus:ring-[#0052CC]"
                />
              </div>

              <div className="col-span-2 space-y-1">
                <label className="text-[11px] font-bold text-[#5E6C84] uppercase tracking-wider">
                  Name <span className="text-[#DE350B]">*</span>
                </label>
                <input
                  placeholder="e.g. Website Redesign"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full h-8 px-2.5 rounded-[3px] border border-[#DFE1E6] bg-white text-xs outline-none focus:border-[#0052CC] focus:ring-1 focus:ring-[#0052CC]"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-[#5E6C84] uppercase tracking-wider">
                Project Lead
              </label>
              <select
                value={ownerId}
                onChange={(e) => setOwnerId(e.target.value)}
                className="w-full h-8 rounded-[3px] border border-[#DFE1E6] bg-white px-2 text-xs outline-none cursor-pointer focus:border-[#0052CC] focus:ring-1 focus:ring-[#0052CC]"
              >
                <option value="">Default (You)</option>
                {allProfiles.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.full_name || p.email} ({p.role})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-[#5E6C84] uppercase tracking-wider">
                Description
              </label>
              <textarea
                placeholder="Brief summary of project objectives..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full p-2.5 rounded-[3px] border border-[#DFE1E6] bg-white text-xs outline-none focus:border-[#0052CC] focus:ring-1 focus:ring-[#0052CC]"
              />
            </div>

            <div className="pt-3 border-t border-[#DFE1E6] flex items-center justify-end gap-2">
              <button 
                type="button" 
                onClick={() => setCreateOpen(false)} 
                disabled={loading}
                className="px-3 py-1.5 text-xs font-medium text-[#42526E] hover:text-[#172B4D] hover:bg-[#EBECF0] rounded-[3px] cursor-pointer"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                disabled={loading} 
                className="bg-[#0052CC] hover:bg-[#0747A6] active:bg-[#0047B3] text-white font-medium text-xs px-3.5 py-1.5 rounded-[3px] shadow-2xs transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Create project</span>
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* 5. Edit Project Modal */}
      <Dialog open={!!editModalProject} onOpenChange={(open) => { if (!open) setEditModalProject(null) }}>
        <DialogContent className="max-w-md p-0 overflow-hidden bg-white rounded-[4px] border border-[#DFE1E6] shadow-xl">
          <div className="px-6 py-4 border-b border-[#DFE1E6] bg-[#FAFBFC]">
            <DialogHeader className="p-0">
              <DialogTitle className="text-base font-bold text-[#172B4D]">
                Edit Project [{editModalProject?.key}]
              </DialogTitle>
              <DialogDescription className="text-xs text-[#5E6C84]">
                Update project name, description, or lead.
              </DialogDescription>
            </DialogHeader>
          </div>

          <form onSubmit={handleSaveEdit} className="p-6 space-y-4 text-xs text-[#172B4D]">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-[#5E6C84] uppercase tracking-wider">
                Project Name <span className="text-[#DE350B]">*</span>
              </label>
              <input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                required
                className="w-full h-8 px-2.5 rounded-[3px] border border-[#DFE1E6] bg-white text-xs outline-none focus:border-[#0052CC] focus:ring-1 focus:ring-[#0052CC]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-[#5E6C84] uppercase tracking-wider">
                Project Lead
              </label>
              <select
                value={editOwnerId}
                onChange={(e) => setEditOwnerId(e.target.value)}
                className="w-full h-8 rounded-[3px] border border-[#DFE1E6] bg-white px-2 text-xs outline-none cursor-pointer focus:border-[#0052CC] focus:ring-1 focus:ring-[#0052CC]"
              >
                <option value="">Unassigned</option>
                {allProfiles.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.full_name || p.email} ({p.role})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-[#5E6C84] uppercase tracking-wider">
                Description
              </label>
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={3}
                className="w-full p-2.5 rounded-[3px] border border-[#DFE1E6] bg-white text-xs outline-none focus:border-[#0052CC] focus:ring-1 focus:ring-[#0052CC]"
              />
            </div>

            <div className="pt-3 border-t border-[#DFE1E6] flex items-center justify-end gap-2">
              <button 
                type="button" 
                onClick={() => setEditModalProject(null)} 
                disabled={savingEdit}
                className="px-3 py-1.5 text-xs font-medium text-[#42526E] hover:text-[#172B4D] hover:bg-[#EBECF0] rounded-[3px] cursor-pointer"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                disabled={savingEdit} 
                className="bg-[#0052CC] hover:bg-[#0747A6] active:bg-[#0047B3] text-white font-medium text-xs px-3.5 py-1.5 rounded-[3px] shadow-2xs transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                {savingEdit && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Save changes</span>
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* 6. Manage Project Members Modal */}
      <Dialog open={!!membersModalProject} onOpenChange={(open) => { if (!open) setMembersModalProject(null) }}>
        <DialogContent className="max-w-md p-0 overflow-hidden bg-white rounded-[4px] border border-[#DFE1E6] shadow-xl">
          <div className="px-6 py-4 border-b border-[#DFE1E6] bg-[#FAFBFC]">
            <DialogHeader className="p-0">
              <DialogTitle className="text-base font-bold text-[#172B4D]">
                Team Access — {membersModalProject?.name}
              </DialogTitle>
              <DialogDescription className="text-xs text-[#5E6C84]">
                Select who can view and be assigned to issues in this project.
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="p-6 space-y-3 text-xs text-[#172B4D]">
            <div className="max-h-60 overflow-y-auto space-y-1.5 border border-[#DFE1E6] rounded-[3px] p-2 bg-[#FAFBFC]">
              {allProfiles.map(prof => {
                const isChecked = selectedMembers.includes(prof.id)
                return (
                  <label key={prof.id} className="flex items-center justify-between p-2 rounded-[3px] hover:bg-white cursor-pointer border border-transparent hover:border-[#DFE1E6] transition-colors">
                    <div className="flex items-center gap-2">
                      <BusyAvatar name={prof.full_name} email={prof.email} size="xs" />
                      <div>
                        <span className="font-semibold text-xs text-[#172B4D]">{prof.full_name || prof.email}</span>
                        <p className="text-[11px] text-[#5E6C84]">{prof.email} • {prof.role}</p>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {
                        setSelectedMembers(prev => 
                          prev.includes(prof.id) ? prev.filter(id => id !== prof.id) : [...prev, prof.id]
                        )
                      }}
                      className="rounded-[2px] border-[#DFE1E6] text-[#0052CC] focus:ring-[#0052CC] cursor-pointer"
                    />
                  </label>
                )
              })}
            </div>

            <div className="pt-3 border-t border-[#DFE1E6] flex items-center justify-end gap-2">
              <button 
                onClick={() => setMembersModalProject(null)} 
                disabled={savingMembers}
                className="px-3 py-1.5 text-xs font-medium text-[#42526E] hover:text-[#172B4D] hover:bg-[#EBECF0] rounded-[3px] cursor-pointer"
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveMembers} 
                disabled={savingMembers} 
                className="bg-[#0052CC] hover:bg-[#0747A6] active:bg-[#0047B3] text-white font-medium text-xs px-3.5 py-1.5 rounded-[3px] shadow-2xs transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                {savingMembers && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Save members</span>
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
