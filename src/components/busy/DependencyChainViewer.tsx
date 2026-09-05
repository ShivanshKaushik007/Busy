'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  Lock,
  Unlock,
  AlertTriangle,
  GitFork,
  ArrowRight,
  Plus,
  Trash2,
  CheckCircle2,
  RefreshCw,
  Info,
  ChevronDown,
  ChevronUp,
  ShieldAlert
} from 'lucide-react'
import BusyLozenge from './BusyLozenge'
import {
  getTaskDependencyChains,
  addDependencyWithCycleCheck,
  removeDependency
} from '@/app/actions/dependencyActions'
import { TransitiveChainsResult, TransitiveDependencyItem } from '@/lib/dependencyGraphUtils'

interface DependencyChainViewerProps {
  taskId: string
  taskTitle: string
  projectId: string
  onDependenciesChanged?: () => void
}

interface CandidateTask {
  id: string
  title: string
  status: string
  priority?: string
  projectKey?: string
  wouldCauseCycle: boolean
  cycleString?: string
}

export default function DependencyChainViewer({
  taskId,
  taskTitle,
  projectId,
  onDependenciesChanged
}: DependencyChainViewerProps) {
  const [chains, setChains] = useState<TransitiveChainsResult | null>(null)
  const [candidates, setCandidates] = useState<CandidateTask[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedBlockerId, setSelectedBlockerId] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [cycleAlert, setCycleAlert] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [showTransitiveTree, setShowTransitiveTree] = useState(true)

  const loadChains = useCallback(async () => {
    setLoading(true)
    setActionError(null)
    setCycleAlert(null)
    const res = await getTaskDependencyChains(taskId)
    if (res.error) {
      setActionError(res.error)
    } else if (res.chains) {
      setChains(res.chains)
      setCandidates(res.availableCandidates || [])
    }
    setLoading(false)
  }, [taskId])

  useEffect(() => {
    loadChains()
  }, [loadChains])

  const handleCandidateSelect = (candidateId: string) => {
    setSelectedBlockerId(candidateId)
    const candidate = candidates.find(c => c.id === candidateId)
    if (candidate?.wouldCauseCycle) {
      setCycleAlert(
        `Circular Dependency Warning: Selecting "${candidate.title}" will form a closed dependency loop: ${candidate.cycleString}. Tasks in a cycle can never be marked as Done.`
      )
    } else {
      setCycleAlert(null)
    }
  }

  const handleAddBlocker = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedBlockerId) return

    setSubmitting(true)
    setActionError(null)
    setCycleAlert(null)

    const res = await addDependencyWithCycleCheck(taskId, selectedBlockerId)

    if (res.error) {
      setActionError(res.error)
      if (res.cycleString) {
        setCycleAlert(`Circular Chain Detected: ${res.cycleString}`)
      }
    } else {
      setSelectedBlockerId('')
      setShowAddForm(false)
      await loadChains()
      onDependenciesChanged?.()
    }
    setSubmitting(false)
  }

  const handleRemoveBlocker = async (blockerId: string) => {
    setActionError(null)
    const res = await removeDependency(taskId, blockerId)
    if (res.error) {
      setActionError(res.error)
    } else {
      await loadChains()
      onDependenciesChanged?.()
    }
  }

  const selectedCandidate = candidates.find(c => c.id === selectedBlockerId)

  return (
    <div className="space-y-3">
      {/* SECTION HEADER */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h4 className="text-[11px] font-bold text-[#5E6C84] uppercase tracking-wider flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-[#FFAB00]" />
            <span>Blocked By ({chains?.directBlockers.length || 0})</span>
          </h4>
          {chains && chains.indirectBlockers.length > 0 && (
            <span className="text-[10px] font-semibold text-[#0052CC] bg-[#DEEBFF] px-1.5 py-0.2 rounded border border-[#B3D4FF]">
              +{chains.indirectBlockers.length} Indirect
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowAddForm(prev => !prev)}
            className="text-xs font-semibold text-[#0052CC] hover:text-[#0747A6] hover:bg-[#DEEBFF] px-2 py-1 rounded-[3px] transition-colors flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3 h-3" />
            <span>Add Blocker</span>
          </button>
        </div>
      </div>

      {/* ERROR ALERT */}
      {actionError && (
        <div className="p-3 bg-[#FFEBE6] border-l-4 border-[#DE350B] rounded-[3px] text-xs text-[#BF2600] flex items-start gap-2 animate-fadeIn">
          <AlertTriangle className="w-4 h-4 shrink-0 text-[#DE350B] mt-0.5" />
          <div className="flex-1">
            <div className="font-bold">Dependency Rejected</div>
            <div className="mt-0.5">{actionError}</div>
          </div>
        </div>
      )}

      {/* PRE-SUBMIT CYCLE ALERT */}
      {cycleAlert && (
        <div className="p-3 bg-[#FFF0B3] border border-[#FFE380] rounded-[4px] text-xs text-[#172B4D] flex items-start gap-2.5 shadow-2xs animate-fadeIn">
          <ShieldAlert className="w-4 h-4 shrink-0 text-[#DE350B] mt-0.5" />
          <div className="flex-1 leading-relaxed">
            <div className="font-bold text-[#DE350B]">Multi-Hop Circular Dependency Detected</div>
            <div className="mt-1 font-mono text-[11px] text-[#BF2600] bg-white/70 p-1.5 rounded border border-[#FFE380]/60">
              {cycleAlert}
            </div>
            <div className="text-[11px] text-[#5E6C84] mt-1.5">
              To resolve, break one of the existing dependencies in the chain before linking these tasks.
            </div>
          </div>
        </div>
      )}

      {/* ADD BLOCKER FORM */}
      {showAddForm && (
        <form
          onSubmit={handleAddBlocker}
          className="p-3 bg-[#FAFBFC] border border-[#DFE1E6] rounded-[4px] space-y-2.5 transition-all shadow-2xs"
        >
          <div className="text-xs font-semibold text-[#172B4D] flex items-center justify-between">
            <span>Link a Blocker (Must finish before this task can move to Done)</span>
            <span className="text-[10px] text-[#5E6C84] font-normal">Real-Time Cycle Detection Active</span>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedBlockerId}
              onChange={e => handleCandidateSelect(e.target.value)}
              className="flex-1 h-8 px-2.5 bg-white border border-[#DFE1E6] rounded-[3px] text-xs text-[#172B4D] focus:border-[#0052CC] focus:ring-1 focus:ring-[#0052CC] outline-none"
            >
              <option value="">-- Select a blocking task from project --</option>
              {candidates.map(c => (
                <option
                  key={c.id}
                  value={c.id}
                  disabled={c.wouldCauseCycle}
                >
                  {c.wouldCauseCycle ? '⛔ [CIRCULAR LOOP] ' : ''}
                  {c.projectKey ? `[${c.projectKey}] ` : ''}
                  {c.title} ({c.status})
                </option>
              ))}
            </select>

            <button
              type="submit"
              disabled={submitting || !selectedBlockerId || selectedCandidate?.wouldCauseCycle}
              className="h-8 px-3 bg-[#0052CC] hover:bg-[#0747A6] active:bg-[#0047B3] text-white text-xs font-semibold rounded-[3px] shadow-2xs transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
            >
              {submitting ? 'Linking...' : 'Link Blocker'}
            </button>
          </div>

          {candidates.length === 0 && (
            <p className="text-[11px] text-[#5E6C84] italic">
              No other tasks available in this project to link as blockers.
            </p>
          )}
        </form>
      )}

      {/* LOADING INDICATOR */}
      {loading ? (
        <div className="p-4 bg-[#FAFBFC] rounded-[3px] border border-[#DFE1E6] flex items-center justify-center gap-2 text-xs text-[#5E6C84]">
          <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#0052CC]" />
          <span>Analyzing dependency graph & cycle health...</span>
        </div>
      ) : (
        <>
          {/* 1. DIRECT BLOCKERS LIST */}
          {chains?.directBlockers.length === 0 ? (
            <div className="p-3 bg-[#FAFBFC] rounded-[3px] border border-[#DFE1E6] text-xs text-[#5E6C84] italic flex items-center justify-between">
              <span>No blocking dependencies. This issue is free to progress.</span>
              <span className="text-[11px] text-[#00875A] font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Unblocked
              </span>
            </div>
          ) : (
            <div className="space-y-1.5">
              {chains?.directBlockers.map(blocker => {
                const isFinished = blocker.status === 'Done'
                return (
                  <div
                    key={blocker.id}
                    className={`flex items-center justify-between p-2 rounded-[3px] border text-xs transition-colors ${
                      isFinished
                        ? 'bg-[#FAFBFC] border-[#DFE1E6] text-[#5E6C84]'
                        : 'bg-white border-[#FFE380] shadow-2xs'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {isFinished ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#00875A] shrink-0" />
                      ) : (
                        <Lock className="w-3.5 h-3.5 text-[#DE350B] shrink-0" />
                      )}
                      <span className="font-semibold text-[#172B4D] truncate">
                        {blocker.title}
                      </span>
                      <BusyLozenge status={blocker.status} size="sm" />
                      <span className="text-[10px] text-[#5E6C84] bg-[#EBECF0] px-1.5 py-0.2 rounded shrink-0">
                        Direct Blocker
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveBlocker(blocker.id)}
                      className="text-[#5E6C84] hover:text-[#DE350B] p-1 rounded hover:bg-[#FFEBE6] transition-colors cursor-pointer shrink-0 ml-2"
                      title="Remove dependency"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )
              })}
            </div>
          )}

          {/* 2. TRANSITIVE / DEEP BLOCKERS TREE */}
          {chains && chains.indirectBlockers.length > 0 && (
            <div className="mt-2 pt-2 border-t border-[#EBECF0]">
              <button
                type="button"
                onClick={() => setShowTransitiveTree(prev => !prev)}
                className="w-full flex items-center justify-between text-xs text-[#5E6C84] hover:text-[#172B4D] p-1 rounded transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-1.5 font-semibold">
                  <GitFork className="w-3.5 h-3.5 text-[#0052CC]" />
                  <span>Transitive Dependency Chains ({chains.indirectBlockers.length} Deep Blocker{chains.indirectBlockers.length === 1 ? '' : 's'})</span>
                </div>
                {showTransitiveTree ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {showTransitiveTree && (
                <div className="mt-1.5 space-y-1.5 pl-3 border-l-2 border-[#DFE1E6]">
                  {chains.indirectBlockers.map(indirect => (
                    <div
                      key={indirect.id}
                      className="flex items-center justify-between p-2 rounded-[3px] bg-[#FAFBFC] border border-[#EBECF0] text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <ArrowRight className="w-3 h-3 text-[#5E6C84] shrink-0" />
                        <span className="text-[#172B4D] font-medium truncate">
                          {indirect.title}
                        </span>
                        <BusyLozenge status={indirect.status} size="sm" />
                      </div>
                      <span className="text-[10px] font-mono text-[#5E6C84] shrink-0">
                        Level {indirect.depth} (via {indirect.via})
                      </span>
                    </div>
                  ))}
                  <p className="text-[10px] text-[#5E6C84] pt-1 italic">
                    Chain order: Indirect blockers must finish before direct blockers can finish, unlocking this task.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* 3. DOWNSTREAM DEPENDENTS (Tasks waiting on this task) */}
          {chains && (chains.directDependents.length > 0 || chains.indirectDependents.length > 0) && (
            <div className="mt-3 pt-3 border-t border-[#EBECF0]">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#5E6C84] uppercase tracking-wider mb-2">
                <Unlock className="w-3.5 h-3.5 text-[#0052CC]" />
                <span>Blocks Other Issues ({chains.directDependents.length + chains.indirectDependents.length})</span>
              </div>
              <div className="space-y-1">
                {chains.directDependents.map(dep => (
                  <div
                    key={dep.id}
                    className="flex items-center justify-between p-1.5 rounded-[3px] bg-[#FAFBFC] border border-[#EBECF0] text-xs"
                  >
                    <span className="text-[#172B4D] font-medium truncate">{dep.title}</span>
                    <BusyLozenge status={dep.status} size="sm" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
