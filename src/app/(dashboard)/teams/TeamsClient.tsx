'use client'

import React, { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Users,
  Search,
  FolderKanban,
  Columns3,
  ShieldCheck,
  User,
  ListTodo,
  Plus,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ExternalLink,
  Layers,
  Crown
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { updateProjectMembers } from '@/app/actions/projectActions'
import BusyAvatar from '@/components/busy/BusyAvatar'

interface TeamsClientProps {
  initialProjects: any[]
  isManager: boolean
  allProfiles: any[]
  currentUserId: string
}

function getProfile(prof: any): { id: string; full_name: string; email: string; role: string } | null {
  if (!prof) return null
  if (Array.isArray(prof)) return prof[0] || null
  return prof
}

export default function TeamsClient({
  initialProjects,
  isManager,
  allProfiles,
  currentUserId
}: TeamsClientProps) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedProjectId, setSelectedProjectId] = useState<string>('ALL')
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'manager' | 'member'>('ALL')
  const [viewMode, setViewMode] = useState<'by-project' | 'directory'>('by-project')

  // Manage Project Members Dialog state (Manager only)
  const [manageProject, setManageProject] = useState<any | null>(null)
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])
  const [savingMembers, setSavingMembers] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [memberDialogSearch, setMemberDialogSearch] = useState('')

  // 1. Compute overall workspace stats
  const stats = useMemo(() => {
    const activeProjects = initialProjects.filter((p: any) => !p.is_archived)
    const uniqueUserMap = new Map<string, { id: string; role: string }>()

    activeProjects.forEach((p: any) => {
      p.project_members?.forEach((pm: any) => {
        const prof = getProfile(pm.profiles)
        if (prof?.id) {
          uniqueUserMap.set(prof.id, {
            id: prof.id,
            role: prof.role || 'member'
          })
        }
      })
      const ownerProf = getProfile(p.profiles)
      if (ownerProf?.id) {
        uniqueUserMap.set(ownerProf.id, {
          id: ownerProf.id,
          role: ownerProf.role || 'member'
        })
      }
    })

    const totalUniqueMembers = uniqueUserMap.size
    const totalManagers = Array.from(uniqueUserMap.values()).filter(u => u.role === 'manager').length
    const totalProjects = activeProjects.length
    const totalTasks = activeProjects.reduce((acc: number, p: any) => acc + (p.tasks?.length || 0), 0)

    return {
      totalMembers: totalUniqueMembers,
      totalProjects,
      totalManagers,
      totalTasks
    }
  }, [initialProjects])

  // 2. Directory list: Unique people across all projects
  const directoryPeople = useMemo(() => {
    const peopleMap = new Map<string, {
      id: string
      full_name: string
      email: string
      role: string
      projects: Array<{ id: string; key: string; name: string; isLead: boolean }>
      taskCount: number
    }>()

    // Seed from allProfiles if available, else from project members
    const baseList = allProfiles.length > 0 
      ? allProfiles 
      : initialProjects.flatMap((p: any) => (p.project_members || []).map((m: any) => getProfile(m.profiles))).filter(Boolean)

    baseList.forEach((prof: any) => {
      const p = getProfile(prof)
      if (!p?.id || peopleMap.has(p.id)) return
      peopleMap.set(p.id, {
        id: p.id,
        full_name: p.full_name || '',
        email: p.email || '',
        role: p.role || 'member',
        projects: [],
        taskCount: 0
      })
    })

    // Populate projects & task counts
    initialProjects.filter((p: any) => !p.is_archived).forEach((p: any) => {
      const isMember = (uid: string) => 
        p.project_members?.some((pm: any) => pm.user_id === uid) || p.owner_id === uid

      peopleMap.forEach((person, uid) => {
        if (isMember(uid)) {
          person.projects.push({
            id: p.id,
            key: p.key,
            name: p.name,
            isLead: p.owner_id === uid
          })
          // Count assigned tasks in this project
          const assignedCount = (p.tasks || []).filter((t: any) => 
            t.task_assignments?.some((a: any) => a.user_id === uid)
          ).length
          person.taskCount += assignedCount
        }
      })
    })

    return Array.from(peopleMap.values())
  }, [initialProjects, allProfiles])

  // 3. Filtered projects for "By Project" view
  const filteredProjects = useMemo(() => {
    return initialProjects
      .filter((p: any) => !p.is_archived)
      .filter((p: any) => {
        if (selectedProjectId !== 'ALL' && p.id !== selectedProjectId) return false
        
        if (!searchQuery.trim()) return true
        const q = searchQuery.toLowerCase().trim()
        
        // Search matches project name or key
        if (p.name.toLowerCase().includes(q) || p.key.toLowerCase().includes(q)) {
          return true
        }

        // Or matches any member's name or email
        const hasMatchingMember = p.project_members?.some((pm: any) => {
          const prof = getProfile(pm.profiles)
          return (prof?.full_name?.toLowerCase() || '').includes(q) ||
            (prof?.email?.toLowerCase() || '').includes(q)
        })
        if (hasMatchingMember) return true

        // Or matches owner
        const ownerProf = getProfile(p.profiles)
        if (
          (ownerProf?.full_name?.toLowerCase() || '').includes(q) ||
          (ownerProf?.email?.toLowerCase() || '').includes(q)
        ) {
          return true
        }

        return false
      })
  }, [initialProjects, selectedProjectId, searchQuery])

  // 4. Filtered directory people for "Directory" view
  const filteredDirectoryPeople = useMemo(() => {
    return directoryPeople.filter(p => {
      // Role filter
      if (roleFilter !== 'ALL' && p.role !== roleFilter) return false

      // Project filter
      if (selectedProjectId !== 'ALL' && !p.projects.some(proj => proj.id === selectedProjectId)) {
        return false
      }

      // Search query filter
      if (!searchQuery.trim()) return true
      const q = searchQuery.toLowerCase().trim()
      return (
        p.full_name.toLowerCase().includes(q) ||
        p.email.toLowerCase().includes(q) ||
        p.projects.some(proj => proj.name.toLowerCase().includes(q) || proj.key.toLowerCase().includes(q))
      )
    })
  }, [directoryPeople, roleFilter, selectedProjectId, searchQuery])

  // Open Manage Members Modal
  const openManageModal = (project: any) => {
    const currentMemberIds = (project.project_members || []).map((pm: any) => pm.user_id)
    if (project.owner_id && !currentMemberIds.includes(project.owner_id)) {
      currentMemberIds.push(project.owner_id)
    }
    setManageProject(project)
    setSelectedUserIds(currentMemberIds)
    setMemberDialogSearch('')
  }

  // Toggle user in manage members modal
  const toggleUserSelection = (userId: string) => {
    setSelectedUserIds(prev => 
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    )
  }

  // Save Project Members
  const handleSaveMembers = async () => {
    if (!manageProject) return
    setSavingMembers(true)
    setFeedback(null)

    const res = await updateProjectMembers(manageProject.id, selectedUserIds)
    setSavingMembers(false)

    if (res.error) {
      setFeedback({ type: 'error', message: res.error })
    } else {
      setFeedback({ type: 'success', message: `Team members updated for project [${manageProject.key}].` })
      setManageProject(null)
      router.refresh()
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* 1. Page Header & Context */}
      <div>
        <nav className="flex items-center gap-1.5 text-xs text-[#5E6C84] mb-2 font-medium">
          <Link href="/" className="hover:text-[#0052CC] transition-colors">Busy</Link>
          <span>/</span>
          <span className="text-[#172B4D] font-semibold">Teams</span>
        </nav>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-[4px] bg-[#0052CC] text-white flex items-center justify-center shadow-2xs">
                <Users className="w-4 h-4" />
              </div>
              <h1 className="text-2xl font-bold text-[#172B4D] tracking-tight">
                Project Teams & People
              </h1>
            </div>
            <p className="text-xs text-[#5E6C84] mt-1">
              Browse team members across all Busy projects, inspect their roles, and track active task assignments.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/projects"
              className="h-8 px-3 text-xs font-medium rounded-[3px] border border-[#DFE1E6] bg-white hover:bg-[#EBECF0] text-[#172B4D] transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <FolderKanban className="w-3.5 h-3.5 text-[#5E6C84]" />
              <span>Manage Projects</span>
            </Link>
            <Link
              href="/board"
              className="h-8 px-3 text-xs font-medium rounded-[3px] bg-[#0052CC] hover:bg-[#0747A6] active:bg-[#0047B3] text-white transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <Columns3 className="w-3.5 h-3.5" />
              <span>Go to Board</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 2. Headline Stat Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white border border-[#DFE1E6] rounded-[4px] p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#5E6C84] uppercase tracking-wider">Total Members</span>
            <Users className="w-4 h-4 text-[#0052CC]" />
          </div>
          <div className="text-2xl font-bold text-[#172B4D] mt-2">{stats.totalMembers}</div>
          <p className="text-[11px] text-[#5E6C84] mt-0.5">Across all active teams</p>
        </div>

        <div className="bg-white border border-[#DFE1E6] rounded-[4px] p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#5E6C84] uppercase tracking-wider">Project Teams</span>
            <FolderKanban className="w-4 h-4 text-[#00875A]" />
          </div>
          <div className="text-2xl font-bold text-[#172B4D] mt-2">{stats.totalProjects}</div>
          <p className="text-[11px] text-[#5E6C84] mt-0.5">Active software projects</p>
        </div>

        <div className="bg-white border border-[#DFE1E6] rounded-[4px] p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#5E6C84] uppercase tracking-wider">Project Leads</span>
            <Crown className="w-4 h-4 text-[#FFAB00]" />
          </div>
          <div className="text-2xl font-bold text-[#172B4D] mt-2">{stats.totalManagers}</div>
          <p className="text-[11px] text-[#5E6C84] mt-0.5">Managers & project owners</p>
        </div>

        <div className="bg-white border border-[#DFE1E6] rounded-[4px] p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#5E6C84] uppercase tracking-wider">Assigned Tasks</span>
            <ListTodo className="w-4 h-4 text-[#6554C0]" />
          </div>
          <div className="text-2xl font-bold text-[#172B4D] mt-2">{stats.totalTasks}</div>
          <p className="text-[11px] text-[#5E6C84] mt-0.5">Tracked in team backlogs</p>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-3 rounded-[3px] text-xs font-medium flex items-center gap-2 border ${
            feedback.type === 'success'
              ? 'bg-[#E3FCEF] text-[#006644] border-[#ABF5D1]'
              : 'bg-[#FFEBE6] text-[#DE350B] border-[#FFBDAD]'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-[#006644]" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 text-[#DE350B]" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* 3. Search & View Controls Bar */}
      <div className="bg-[#FAFBFC] border border-[#DFE1E6] rounded-[4px] p-3 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
        <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
          {/* Live Search */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-[#5E6C84]" />
            <input
              type="text"
              placeholder="Search by member, email, or project..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-8 pl-8 pr-3 bg-white border border-[#DFE1E6] focus:border-[#0052CC] focus:ring-1 focus:ring-[#0052CC] rounded-[3px] text-xs text-[#172B4D] placeholder:text-[#5E6C84] transition-all outline-none"
            />
          </div>

          {/* Project Filter */}
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="h-8 border border-[#DFE1E6] rounded-[3px] bg-white px-2.5 text-xs text-[#172B4D] font-medium outline-none cursor-pointer hover:bg-[#EBECF0]"
          >
            <option value="ALL">All Projects ({initialProjects.filter((p: any) => !p.is_archived).length})</option>
            {initialProjects.filter((p: any) => !p.is_archived).map((p: any) => (
              <option key={p.id} value={p.id}>
                [{p.key}] {p.name}
              </option>
            ))}
          </select>

          {/* Role Filter (Directory Mode) */}
          {viewMode === 'directory' && (
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as any)}
              className="h-8 border border-[#DFE1E6] rounded-[3px] bg-white px-2.5 text-xs text-[#172B4D] font-medium outline-none cursor-pointer hover:bg-[#EBECF0]"
            >
              <option value="ALL">All Roles</option>
              <option value="manager">Managers only</option>
              <option value="member">Members only</option>
            </select>
          )}
        </div>

        {/* View Switcher: By Project vs All People */}
        <div className="flex items-center border border-[#DFE1E6] rounded-[3px] overflow-hidden bg-white p-0.5">
          <button
            onClick={() => setViewMode('by-project')}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-[2px] transition-colors cursor-pointer ${
              viewMode === 'by-project'
                ? 'bg-[#0052CC] text-white'
                : 'text-[#42526E] hover:text-[#172B4D] hover:bg-[#EBECF0]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>By Project</span>
          </button>
          <button
            onClick={() => setViewMode('directory')}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-[2px] transition-colors cursor-pointer ${
              viewMode === 'directory'
                ? 'bg-[#0052CC] text-white'
                : 'text-[#42526E] hover:text-[#172B4D] hover:bg-[#EBECF0]'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>All People</span>
          </button>
        </div>
      </div>

      {/* 4. MAIN CONTENT AREA */}
      {viewMode === 'by-project' ? (
        /* ==================== VIEW MODE: BY PROJECT ==================== */
        <div className="space-y-6">
          {filteredProjects.length === 0 ? (
            <div className="bg-white border border-[#DFE1E6] rounded-[4px] p-12 text-center">
              <FolderKanban className="w-10 h-10 text-[#5E6C84] mx-auto mb-3 opacity-40" />
              <h3 className="text-sm font-bold text-[#172B4D]">No projects found</h3>
              <p className="text-xs text-[#5E6C84] mt-1">
                {searchQuery ? 'Try clearing your search filters.' : 'No active projects available.'}
              </p>
            </div>
          ) : (
            filteredProjects.map((project: any) => {
              const members = project.project_members || []
              // Collect all unique member profiles (including project owner)
              const memberListMap = new Map<string, {
                id: string
                full_name: string
                email: string
                role: string
                isOwner: boolean
              }>()

              // Add owner
              const ownerProf = getProfile(project.profiles)
              if (ownerProf?.id) {
                memberListMap.set(ownerProf.id, {
                  id: ownerProf.id,
                  full_name: ownerProf.full_name || '',
                  email: ownerProf.email || '',
                  role: ownerProf.role || 'manager',
                  isOwner: true
                })
              }

              // Add members
              members.forEach((m: any) => {
                const prof = getProfile(m.profiles)
                if (prof?.id && !memberListMap.has(prof.id)) {
                  memberListMap.set(prof.id, {
                    id: prof.id,
                    full_name: prof.full_name || '',
                    email: prof.email || '',
                    role: prof.role || 'member',
                    isOwner: prof.id === project.owner_id
                  })
                }
              })

              const displayMembers = Array.from(memberListMap.values())
              const projectTasks = project.tasks || []

              return (
                <div
                  key={project.id}
                  className="bg-white border border-[#DFE1E6] rounded-[4px] shadow-2xs overflow-hidden transition-all hover:border-[#C1C7D0]"
                >
                  {/* Project Team Card Header */}
                  <div className="p-4 bg-[#FAFBFC] border-b border-[#DFE1E6] flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-[4px] bg-[#0052CC] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs tracking-wider">
                        {project.key.slice(0, 3)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="text-sm font-bold text-[#172B4D] hover:text-[#0052CC] transition-colors">
                            {project.name}
                          </h2>
                          <span className="text-[11px] font-mono font-semibold px-1.5 py-0.5 bg-white border border-[#DFE1E6] rounded-[2px] text-[#42526E]">
                            {project.key}
                          </span>
                          <span className="text-[11px] font-semibold px-2 py-0.5 bg-[#DEEBFF] text-[#0052CC] rounded-[3px]">
                            {displayMembers.length} {displayMembers.length === 1 ? 'member' : 'members'}
                          </span>
                          <span className="text-[11px] font-semibold px-2 py-0.5 bg-[#EBECF0] text-[#42526E] rounded-[3px]">
                            {projectTasks.length} {projectTasks.length === 1 ? 'task' : 'tasks'}
                          </span>
                        </div>
                        {project.description && (
                          <p className="text-xs text-[#5E6C84] mt-0.5 line-clamp-1">{project.description}</p>
                        )}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 shrink-0">
                      {isManager && (
                        <button
                          onClick={() => openManageModal(project)}
                          className="h-7 px-2.5 text-xs font-medium text-[#0052CC] hover:bg-[#DEEBFF] rounded-[3px] transition-colors flex items-center gap-1 cursor-pointer border border-[#0052CC]/20"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Manage Members</span>
                        </button>
                      )}
                      <Link
                        href={`/board?projectId=${project.id}`}
                        className="h-7 px-2.5 text-xs font-medium text-[#42526E] hover:text-[#172B4D] hover:bg-[#EBECF0] rounded-[3px] transition-colors flex items-center gap-1 border border-[#DFE1E6]"
                        title="View Kanban Board"
                      >
                        <Columns3 className="w-3 h-3" />
                        <span>Board</span>
                      </Link>
                      <Link
                        href={`/tasks?project=${project.id}`}
                        className="h-7 px-2.5 text-xs font-medium text-[#42526E] hover:text-[#172B4D] hover:bg-[#EBECF0] rounded-[3px] transition-colors flex items-center gap-1 border border-[#DFE1E6]"
                        title="View all project tasks"
                      >
                        <ListTodo className="w-3 h-3" />
                        <span>Tasks</span>
                      </Link>
                    </div>
                  </div>

                  {/* Team Members Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-[#DFE1E6] bg-[#FAFBFC]/60 text-[11px] font-bold text-[#5E6C84] uppercase tracking-wider">
                          <th className="py-2 px-4">Member</th>
                          <th className="py-2 px-4">Project Role</th>
                          <th className="py-2 px-4">Workspace Role</th>
                          <th className="py-2 px-4">Assigned Tasks in Project</th>
                          <th className="py-2 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#DFE1E6]">
                        {displayMembers.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="py-6 text-center text-xs text-[#5E6C84] italic">
                              No members assigned to this project yet.
                            </td>
                          </tr>
                        ) : (
                          displayMembers.map(member => {
                            // Calculate task breakdown for this member in this project
                            const memberTasks = projectTasks.filter((t: any) => 
                              t.task_assignments?.some((a: any) => a.user_id === member.id)
                            )
                            const inProgressCount = memberTasks.filter((t: any) => t.status === 'In Progress').length
                            const doneCount = memberTasks.filter((t: any) => t.status === 'Done').length
                            const backlogCount = memberTasks.filter((t: any) => t.status === 'Backlog' || t.status === 'Blocked' || t.status === 'In Review').length

                            return (
                              <tr
                                key={member.id}
                                className="hover:bg-[#FAFBFC] transition-colors"
                              >
                                {/* Member Info */}
                                <td className="py-3 px-4">
                                  <div className="flex items-center gap-2.5">
                                    <BusyAvatar
                                      name={member.full_name}
                                      email={member.email}
                                      size="sm"
                                    />
                                    <div>
                                      <div className="font-semibold text-[#172B4D] flex items-center gap-1.5">
                                        <span>{member.full_name || member.email}</span>
                                        {member.id === currentUserId && (
                                          <span className="text-[10px] font-normal px-1 py-0.2 bg-[#EBECF0] text-[#5E6C84] rounded-[2px]">
                                            You
                                          </span>
                                        )}
                                      </div>
                                      <div className="text-[11px] text-[#5E6C84]">{member.email}</div>
                                    </div>
                                  </div>
                                </td>

                                {/* Project Role */}
                                <td className="py-3 px-4">
                                  {member.isOwner ? (
                                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-[3px] bg-[#FFFAE6] text-[#FF8B00] border border-[#FFE380]">
                                      <Crown className="w-3 h-3" />
                                      <span>Project Lead</span>
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#42526E]">
                                      <User className="w-3 h-3 text-[#5E6C84]" />
                                      <span>Team Member</span>
                                    </span>
                                  )}
                                </td>

                                {/* Workspace Role */}
                                <td className="py-3 px-4">
                                  {member.role === 'manager' ? (
                                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-1.5 py-0.5 rounded-[2px] bg-[#E3FCEF] text-[#006644]">
                                      <ShieldCheck className="w-3 h-3" />
                                      <span>Manager</span>
                                    </span>
                                  ) : (
                                    <span className="text-[11px] font-medium text-[#5E6C84]">
                                      Member
                                    </span>
                                  )}
                                </td>

                                {/* Assigned Tasks */}
                                <td className="py-3 px-4">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-semibold text-[#172B4D]">
                                      {memberTasks.length} {memberTasks.length === 1 ? 'task' : 'tasks'}
                                    </span>
                                    {memberTasks.length > 0 && (
                                      <div className="flex items-center gap-1 text-[10px]">
                                        {inProgressCount > 0 && (
                                          <span className="px-1.5 py-0.5 rounded-[2px] bg-[#DEEBFF] text-[#0052CC] font-medium">
                                            {inProgressCount} in progress
                                          </span>
                                        )}
                                        {doneCount > 0 && (
                                          <span className="px-1.5 py-0.5 rounded-[2px] bg-[#E3FCEF] text-[#006644] font-medium">
                                            {doneCount} done
                                          </span>
                                        )}
                                        {backlogCount > 0 && (
                                          <span className="px-1.5 py-0.5 rounded-[2px] bg-[#EBECF0] text-[#5E6C84] font-medium">
                                            {backlogCount} todo
                                          </span>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </td>

                                {/* Action */}
                                <td className="py-3 px-4 text-right">
                                  <Link
                                    href={`/tasks?project=${project.id}&assignee=${member.id}`}
                                    className="inline-flex items-center gap-1 text-xs font-medium text-[#0052CC] hover:underline"
                                  >
                                    <span>View tasks</span>
                                    <ExternalLink className="w-3 h-3" />
                                  </Link>
                                </td>
                              </tr>
                            )
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )
            })
          )}
        </div>
      ) : (
        /* ==================== VIEW MODE: ALL PEOPLE (DIRECTORY) ==================== */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDirectoryPeople.length === 0 ? (
            <div className="col-span-full bg-white border border-[#DFE1E6] rounded-[4px] p-12 text-center">
              <Users className="w-10 h-10 text-[#5E6C84] mx-auto mb-3 opacity-40" />
              <h3 className="text-sm font-bold text-[#172B4D]">No team members found</h3>
              <p className="text-xs text-[#5E6C84] mt-1">Try adjusting your search or role filters.</p>
            </div>
          ) : (
            filteredDirectoryPeople.map(person => (
              <div
                key={person.id}
                className="bg-white border border-[#DFE1E6] rounded-[4px] p-4 shadow-2xs hover:border-[#C1C7D0] transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Person Info */}
                  <div className="flex items-start gap-3">
                    <BusyAvatar
                      name={person.full_name}
                      email={person.email}
                      size="md"
                    />
                    <div className="overflow-hidden flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <h3 className="text-sm font-bold text-[#172B4D] truncate">
                          {person.full_name || person.email}
                        </h3>
                        {person.role === 'manager' ? (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-[2px] bg-[#E3FCEF] text-[#006644] shrink-0">
                            Manager
                          </span>
                        ) : (
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-[2px] bg-[#EBECF0] text-[#5E6C84] shrink-0">
                            Member
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#5E6C84] truncate">{person.email}</p>
                    </div>
                  </div>

                  {/* Assigned Projects */}
                  <div className="mt-4 space-y-1.5">
                    <span className="text-[11px] font-bold text-[#5E6C84] uppercase tracking-wider block">
                      Assigned Projects ({person.projects.length})
                    </span>
                    {person.projects.length === 0 ? (
                      <p className="text-xs text-[#5E6C84] italic">Not assigned to any project yet.</p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {person.projects.map(proj => (
                          <Link
                            key={proj.id}
                            href={`/tasks?project=${proj.id}&assignee=${person.id}`}
                            className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-[3px] bg-[#FAFBFC] border border-[#DFE1E6] text-[#172B4D] hover:bg-[#DEEBFF] hover:border-[#0052CC] hover:text-[#0052CC] transition-colors"
                            title={`View tasks in ${proj.name}`}
                          >
                            <span className="font-mono text-[#0052CC]">[{proj.key}]</span>
                            <span className="truncate max-w-[120px]">{proj.name}</span>
                            {proj.isLead && <Crown className="w-2.5 h-2.5 text-[#FFAB00]" />}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer stats & links */}
                <div className="mt-4 pt-3 border-t border-[#DFE1E6] flex items-center justify-between text-xs">
                  <div className="text-[#5E6C84]">
                    <span className="font-bold text-[#172B4D]">{person.taskCount}</span> total tasks
                  </div>
                  <Link
                    href={`/tasks?assignee=${person.id}`}
                    className="font-medium text-[#0052CC] hover:underline flex items-center gap-1"
                  >
                    <span>View all tasks</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* 5. MANAGER MODAL: MANAGE PROJECT MEMBERS */}
      {manageProject && (
        <Dialog open={!!manageProject} onOpenChange={(open) => !open && setManageProject(null)}>
          <DialogContent className="max-w-md bg-white rounded-[4px] border border-[#DFE1E6] p-0 overflow-hidden shadow-xl">
            <div className="p-4 border-b border-[#DFE1E6] bg-[#FAFBFC]">
              <DialogHeader className="p-0">
                <DialogTitle className="text-base font-bold text-[#172B4D] flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#0052CC]" />
                  <span>Manage Team: [{manageProject.key}] {manageProject.name}</span>
                </DialogTitle>
                <DialogDescription className="text-xs text-[#5E6C84]">
                  Assign team members to this project. Removing a member will unassign them from active tasks in this project.
                </DialogDescription>
              </DialogHeader>
            </div>

            <div className="p-4 space-y-3">
              {/* Search inside dialog */}
              <div className="relative">
                <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-[#5E6C84]" />
                <input
                  type="text"
                  placeholder="Filter users by name or email..."
                  value={memberDialogSearch}
                  onChange={(e) => setMemberDialogSearch(e.target.value)}
                  className="w-full h-8 pl-8 pr-3 border border-[#DFE1E6] rounded-[3px] text-xs text-[#172B4D] outline-none focus:border-[#0052CC]"
                />
              </div>

              {/* Profiles checkbox list */}
              <div className="max-h-60 overflow-y-auto border border-[#DFE1E6] rounded-[3px] p-2 space-y-1 bg-[#FAFBFC]">
                {allProfiles
                  .filter((p: any) => {
                    if (!memberDialogSearch.trim()) return true
                    const q = memberDialogSearch.toLowerCase()
                    return (
                      (p.full_name?.toLowerCase() || '').includes(q) ||
                      (p.email?.toLowerCase() || '').includes(q)
                    )
                  })
                  .map((prof: any) => (
                    <label
                      key={prof.id}
                      className="flex items-center gap-2.5 p-1.5 rounded-[3px] hover:bg-white cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={selectedUserIds.includes(prof.id)}
                        onChange={() => toggleUserSelection(prof.id)}
                        className="rounded-[2px] border-[#DFE1E6] text-[#0052CC] focus:ring-[#0052CC] cursor-pointer"
                      />
                      <BusyAvatar name={prof.full_name} email={prof.email} size="xs" />
                      <div className="overflow-hidden flex-1 leading-tight">
                        <div className="text-xs font-semibold text-[#172B4D] truncate">
                          {prof.full_name || prof.email}
                        </div>
                        <div className="text-[10px] text-[#5E6C84] truncate">{prof.email}</div>
                      </div>
                      {prof.role === 'manager' && (
                        <span className="text-[10px] font-semibold px-1 py-0.5 rounded-[2px] bg-[#E3FCEF] text-[#006644]">
                          Mgr
                        </span>
                      )}
                    </label>
                  ))}
              </div>
            </div>

            <div className="p-3 border-t border-[#DFE1E6] bg-[#FAFBFC] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setManageProject(null)}
                className="px-3 py-1.5 text-xs font-medium text-[#42526E] hover:text-[#172B4D] hover:bg-[#EBECF0] rounded-[3px] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveMembers}
                disabled={savingMembers}
                className="bg-[#0052CC] hover:bg-[#0747A6] active:bg-[#0047B3] text-white font-medium text-xs px-3.5 py-1.5 rounded-[3px] shadow-2xs transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                {savingMembers && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{savingMembers ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
