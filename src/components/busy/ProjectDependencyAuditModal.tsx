'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog'
import {
  GitFork,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
  Trash2,
  Lock,
  Layers,
  Sparkles,
  X
} from 'lucide-react'
import {
  getProjectDependencyHealth,
  removeDependency
} from '@/app/actions/dependencyActions'
import { getUserProjects } from '@/app/actions/taskActions'
import { ProjectDependencyHealth, TaskNode } from '@/lib/dependencyGraphUtils'
import BusyLozenge from './BusyLozenge'

interface ProjectDependencyAuditModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId?: string
  projectName?: string
  projects?: Array<{ id: string; name: string; key?: string }>
}

export default function ProjectDependencyAuditModal({
  open,
  onOpenChange,
  projectId = '',
  projectName = 'Current Project',
  projects = []
}: ProjectDependencyAuditModalProps) {
  const [projectList, setProjectList] = useState<Array<{ id: string; name: string; key?: string }>>(projects)
  const [selectedProjectId, setSelectedProjectId] = useState(projectId || (projects[0]?.id ?? ''))
  const [health, setHealth] = useState<ProjectDependencyHealth | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [breakingEdge, setBreakingEdge] = useState<string | null>(null)

  useEffect(() => {
    if (projects.length > 0) {
      setProjectList(projects)
      if (projectId) {
        setSelectedProjectId(projectId)
      } else if (!selectedProjectId) {
        setSelectedProjectId(projects[0].id)
      }
    } else if (open) {
      getUserProjects().then(projs => {
        if (projs && projs.length > 0) {
          setProjectList(projs as any)
          if (projectId) {
            setSelectedProjectId(projectId)
          } else if (!selectedProjectId) {
            setSelectedProjectId(projs[0].id)
          }
        }
      })
    }
  }, [open, projectId, projects, selectedProjectId])

  const activeProject = projectList.find(p => p.id === selectedProjectId)
  const currentDisplayName = activeProject ? `[${activeProject.key || 'PROJ'}] ${activeProject.name}` : projectName

  const loadHealth = useCallback(async () => {
    const targetId = selectedProjectId || projectId
    if (!targetId) return
    setLoading(true)
    setError(null)
    const res = await getProjectDependencyHealth(targetId)
    if ('error' in res) {
      setError(res.error)
    } else {
      setHealth(res)
    }
    setLoading(false)
  }, [selectedProjectId, projectId])

  useEffect(() => {
    if (open) {
      loadHealth()
    }
  }, [open, loadHealth])

  const handleBreakCycle = async (taskId: string, blockerTaskId: string) => {
    setBreakingEdge(`${taskId}-${blockerTaskId}`)
    await removeDependency(taskId, blockerTaskId)
    await loadHealth()
    setBreakingEdge(null)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="sm:max-w-3xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden bg-white border border-[#DFE1E6] rounded-[6px] shadow-2xl">
        {/* HEADER */}
        <DialogHeader className="px-6 py-4 border-b border-[#DFE1E6] bg-[#FAFBFC] shrink-0">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-[4px] bg-[#0052CC]/10 border border-[#0052CC]/20 flex items-center justify-center text-[#0052CC] shrink-0">
                <GitFork className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-base font-bold text-[#172B4D] flex items-center gap-2 flex-wrap">
                  <span>Dependency Graph & Cycle Auditor</span>
                  <span className="text-[10px] font-bold text-[#0052CC] bg-[#DEEBFF] px-2 py-0.5 rounded-[3px] border border-[#B3D4FF]">
                    Multi-Hop Cycle Detection
                  </span>
                </DialogTitle>
                <DialogDescription className="text-xs text-[#5E6C84] mt-0.5 truncate">
                  Auditing DAG validity, deadlock chains, and critical paths for <strong>{currentDisplayName}</strong>
                </DialogDescription>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {projectList.length > 1 && (
                <select
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="h-7 rounded-[3px] border border-[#DFE1E6] bg-white px-2 text-xs text-[#172B4D] font-medium outline-none cursor-pointer hover:bg-[#FAFBFC] focus:border-[#0052CC]"
                  title="Switch project"
                >
                  {projectList.map(p => (
                    <option key={p.id} value={p.id}>
                      [{p.key || 'PROJ'}] {p.name}
                    </option>
                  ))}
                </select>
              )}
              <button
                type="button"
                onClick={loadHealth}
                disabled={loading}
                className="p-1.5 rounded-[3px] text-[#5E6C84] hover:text-[#172B4D] hover:bg-[#EBECF0] transition-colors cursor-pointer"
                title="Refresh analysis"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>

              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="p-1.5 rounded-[3px] text-[#5E6C84] hover:text-[#172B4D] hover:bg-[#EBECF0] transition-colors cursor-pointer"
                title="Close modal (Esc)"
              >
                <X className="w-4 h-4" />
                <span className="sr-only">Close</span>
              </button>
            </div>
          </div>
        </DialogHeader>

        {/* CONTENT AREA */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-[#FAFBFC]/50">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-[#5E6C84]">
              <RefreshCw className="w-8 h-8 animate-spin text-[#0052CC] mb-3" />
              <div className="text-sm font-semibold text-[#172B4D]">Analyzing Project Graph...</div>
              <div className="text-xs text-[#5E6C84] mt-1">Checking for circular dependency chains and computing critical paths</div>
            </div>
          ) : error ? (
            <div className="p-4 bg-[#FFEBE6] border border-[#FFBDAD] rounded-[4px] text-xs text-[#BF2600]">
              {error}
            </div>
          ) : health ? (
            <>
              {/* 1. HEALTH METRICS CARDS */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* DAG Health Status */}
                <div className={`p-3.5 rounded-[4px] border ${
                  health.isDagValid
                    ? 'bg-[#E3FCEF]/60 border-[#ABF5D1]'
                    : 'bg-[#FFEBE6] border-[#FFBDAD]'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#5E6C84]">
                      Graph Health
                    </span>
                    {health.isDagValid ? (
                      <ShieldCheck className="w-4 h-4 text-[#00875A]" />
                    ) : (
                      <ShieldAlert className="w-4 h-4 text-[#DE350B]" />
                    )}
                  </div>
                  <div className={`text-lg font-bold mt-1.5 ${
                    health.isDagValid ? 'text-[#00875A]' : 'text-[#DE350B]'
                  }`}>
                    {health.isDagValid ? '100% DAG Valid' : `${health.cycles.length} Cycle(s) Detected`}
                  </div>
                  <div className="text-[11px] text-[#5E6C84] mt-0.5">
                    {health.isDagValid ? 'Zero circular deadlocks found' : 'Deadlocked tasks detected'}
                  </div>
                </div>

                {/* Longest Dependency Chain (Depth) */}
                <div className="p-3.5 rounded-[4px] border bg-white border-[#DFE1E6]">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#5E6C84]">
                      Max Chain Depth
                    </span>
                    <Layers className="w-4 h-4 text-[#0052CC]" />
                  </div>
                  <div className="text-lg font-bold mt-1.5 text-[#172B4D]">
                    {health.maxDepth} {health.maxDepth === 1 ? 'Level' : 'Levels'} Deep
                  </div>
                  <div className="text-[11px] text-[#5E6C84] mt-0.5">
                    Longest sequential blocker path
                  </div>
                </div>

                {/* Total Dependencies */}
                <div className="p-3.5 rounded-[4px] border bg-white border-[#DFE1E6]">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#5E6C84]">
                      Dependencies
                    </span>
                    <Lock className="w-4 h-4 text-[#FF8B00]" />
                  </div>
                  <div className="text-lg font-bold mt-1.5 text-[#172B4D]">
                    {health.totalDependencies} Links
                  </div>
                  <div className="text-[11px] text-[#5E6C84] mt-0.5">
                    Across {health.totalTasks} tasks in project
                  </div>
                </div>
              </div>

              {/* 2. CIRCULAR DEADLOCK WARNING (If any cycles exist) */}
              {!health.isDagValid && health.cycles.length > 0 && (
                <div className="p-4 bg-[#FFEBE6] border-2 border-[#DE350B] rounded-[4px] space-y-3">
                  <div className="flex items-center gap-2 text-sm font-bold text-[#DE350B]">
                    <AlertTriangle className="w-5 h-5 shrink-0" />
                    <span>Circular Dependency Deadlock Detected!</span>
                  </div>
                  <p className="text-xs text-[#172B4D] leading-relaxed">
                    The following task chain forms a closed loop. None of these tasks can ever be moved to <strong>Done</strong> because each task is waiting for another in the loop to complete first:
                  </p>

                  <div className="space-y-2">
                    {health.cycles.map((c, idx) => (
                      <div key={idx} className="p-3 bg-white rounded border border-[#FFBDAD] space-y-2">
                        <div className="font-mono text-xs font-semibold text-[#DE350B] break-all leading-normal">
                          🔁 {c.cycleString}
                        </div>

                        {c.cycleNodes.length >= 2 && (
                          <div className="pt-1 flex items-center justify-between text-xs border-t border-[#EBECF0]">
                            <span className="text-[#5E6C84]">
                              Suggested resolution: Break link between {c.cycleNodes[0].title} and {c.cycleNodes[1].title}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleBreakCycle(c.cycleNodes[0].id, c.cycleNodes[1].id)}
                              disabled={!!breakingEdge}
                              className="px-2.5 py-1 text-xs font-semibold bg-[#DE350B] text-white rounded-[3px] hover:bg-[#BF2600] transition-colors cursor-pointer shrink-0 ml-2"
                            >
                              Break Link
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 3. CRITICAL PATH (Longest Sequential Blocker Chain) */}
              {health.criticalPath.length > 1 && (
                <div className="p-4 bg-white border border-[#DFE1E6] rounded-[4px] space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-[#172B4D]">
                      <Sparkles className="w-4 h-4 text-[#0052CC]" />
                      <span>Project Critical Path (Longest Dependency Chain)</span>
                    </div>
                    <span className="text-[10px] text-[#5E6C84]">
                      {health.criticalPath.length} tasks in sequence
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    {health.criticalPath.map((node, idx) => (
                      <React.Fragment key={node.id}>
                        <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#FAFBFC] border border-[#DFE1E6] rounded-[3px]">
                          <span className="font-semibold text-[#172B4D]">{node.title}</span>
                          <BusyLozenge status={node.status} size="sm" />
                        </div>
                        {idx < health.criticalPath.length - 1 && (
                          <ArrowRight className="w-3.5 h-3.5 text-[#0052CC] shrink-0" />
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                  <p className="text-[11px] text-[#5E6C84]">
                    Tasks earlier in the chain must finish before tasks later in the chain can proceed to Done.
                  </p>
                </div>
              )}

              {/* 4. ALL DEPENDENCIES SUMMARY */}
              <div className="p-4 bg-white border border-[#DFE1E6] rounded-[4px] space-y-2">
                <div className="text-xs font-bold text-[#172B4D]">
                  Dependency Policy & Rules
                </div>
                <ul className="text-xs text-[#5E6C84] space-y-1.5 list-disc pl-4 leading-relaxed">
                  <li>
                    <strong>Transitive Cycle Prevention:</strong> Attempts to link tasks that would close a loop of any chain length ($A \to B \to C \to A$) are automatically rejected on the server and in the client.
                  </li>
                  <li>
                    <strong>SLA & Done Enforcement:</strong> A task with any unfinished blocking task (direct or indirect) cannot transition to <em>Done</em> until all blockers are complete.
                  </li>
                  <li>
                    <strong>Project Scoping:</strong> Dependency relationships can only be formed between tasks belonging to the same project.
                  </li>
                </ul>
              </div>
            </>
          ) : null}
        </div>

        {/* FOOTER */}
        <div className="px-6 py-3 bg-white border-t border-[#DFE1E6] flex items-center justify-between shrink-0">
          <div className="text-xs text-[#5E6C84]">
            Project: <strong className="text-[#172B4D]">{projectName}</strong>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="px-4 py-1.5 text-xs font-semibold bg-[#EBECF0] hover:bg-[#DFE1E6] text-[#172B4D] rounded-[3px] transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
