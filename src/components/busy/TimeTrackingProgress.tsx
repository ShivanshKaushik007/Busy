'use client'

import React from 'react'
import { Clock, Plus, Edit3, AlertTriangle } from 'lucide-react'
import { TimeTrackingSummary } from '@/lib/timeTrackingUtils'

interface TimeTrackingProgressProps {
  summary: TimeTrackingSummary
  onOpenLogWork?: () => void
  onOpenEstimate?: () => void
  compact?: boolean
}

export default function TimeTrackingProgress({
  summary,
  onOpenLogWork,
  onOpenEstimate,
  compact = false
}: TimeTrackingProgressProps) {
  const {
    originalEstimateSeconds,
    originalEstimateFormatted,
    totalLoggedSeconds,
    totalLoggedFormatted,
    remainingSeconds,
    remainingFormatted,
    percentSpent,
    isOverEstimate,
    hasTrackingData
  } = summary

  // Compact View for Kanban Card or Table Row
  if (compact) {
    if (!hasTrackingData) return null

    return (
      <div 
        className="inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded-[3px] bg-[#FAFBFC] border border-[#DFE1E6] text-[11px] text-[#42526E]"
        title={`Logged: ${totalLoggedFormatted} | Remaining: ${remainingFormatted} | Original Estimate: ${originalEstimateFormatted}`}
      >
        <Clock className={`w-3 h-3 ${isOverEstimate ? 'text-[#DE350B]' : 'text-[#0052CC]'}`} />
        <span className={`font-mono font-medium ${isOverEstimate ? 'text-[#DE350B] font-semibold' : ''}`}>
          {totalLoggedFormatted}
          {originalEstimateSeconds > 0 && ` / ${originalEstimateFormatted}`}
        </span>
        {/* Mini progress strip */}
        <div className="w-8 h-1.5 bg-[#EBECF0] rounded-full overflow-hidden flex">
          <div 
            className={`h-full ${isOverEstimate ? 'bg-[#DE350B]' : 'bg-[#0052CC]'}`} 
            style={{ width: `${Math.min(100, percentSpent)}%` }} 
          />
        </div>
      </div>
    )
  }

  // Full Widget for Task Details Sidebar
  const maxTime = Math.max(originalEstimateSeconds, totalLoggedSeconds + remainingSeconds, 1)
  const loggedRatio = Math.min(100, (totalLoggedSeconds / maxTime) * 100)
  const remainingRatio = Math.min(100 - loggedRatio, (remainingSeconds / maxTime) * 100)

  return (
    <div className="space-y-2.5">
      {/* Visual Multi-Segment Progress Bar */}
      <div className="space-y-1">
        <div 
          className="h-2 w-full bg-[#EBECF0] rounded-full overflow-hidden flex cursor-pointer transition-all"
          onClick={onOpenLogWork}
          title={`Time Tracking:\n• Logged: ${totalLoggedFormatted}\n• Remaining: ${remainingFormatted}\n• Original Estimate: ${originalEstimateFormatted}`}
        >
          {/* 1. Logged Work (Blue or Red if Over) */}
          <div 
            className={`h-full transition-all ${isOverEstimate ? 'bg-[#DE350B]' : 'bg-[#0052CC]'}`} 
            style={{ width: `${loggedRatio}%` }}
          />

          {/* 2. Remaining Estimate (Slate Blue/Gray) */}
          {remainingRatio > 0 && !isOverEstimate && (
            <div 
              className="h-full bg-[#B3D4FF]/60 transition-all" 
              style={{ width: `${remainingRatio}%` }}
            />
          )}
        </div>

        {/* Legend / Metrics Line */}
        <div className="flex items-center justify-between text-[11px] text-[#5E6C84]">
          <span className="flex items-center gap-1 font-medium">
            <span className={`w-2 h-2 rounded-full ${isOverEstimate ? 'bg-[#DE350B]' : 'bg-[#0052CC]'}`} />
            <span>Logged: <strong className="text-[#172B4D]">{totalLoggedFormatted}</strong></span>
          </span>

          <span className="flex items-center gap-1 font-medium">
            <span className="w-2 h-2 rounded-full bg-[#B3D4FF]" />
            <span>Remaining: <strong className="text-[#172B4D]">{remainingFormatted}</strong></span>
          </span>
        </div>
      </div>

      {/* Over-estimate alert badge */}
      {isOverEstimate && (
        <div className="flex items-center gap-1.5 p-1.5 bg-[#FFEBE6] border border-[#FFBDAD] rounded-[3px] text-[11px] text-[#DE350B]">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          <span>Logged time exceeds original estimate</span>
        </div>
      )}

      {/* Original Estimate display & edit link */}
      <div className="flex items-center justify-between text-xs pt-0.5">
        <div className="flex items-center gap-1 text-[#5E6C84]">
          <span>Original Estimate:</span>
          <button
            type="button"
            onClick={onOpenEstimate}
            className="font-semibold text-[#172B4D] hover:text-[#0052CC] hover:underline cursor-pointer flex items-center gap-1"
          >
            <span>{originalEstimateSeconds > 0 ? originalEstimateFormatted : 'None'}</span>
            <Edit3 className="w-3 h-3 text-[#5E6C84]" />
          </button>
        </div>

        {/* Quick Log Work Button */}
        <button
          type="button"
          onClick={onOpenLogWork}
          className="px-2 py-1 bg-white hover:bg-[#EBECF0] text-[#0052CC] hover:text-[#0747A6] font-semibold text-xs rounded-[3px] border border-[#DFE1E6] shadow-2xs transition-colors flex items-center gap-1 cursor-pointer"
        >
          <Clock className="w-3 h-3 text-[#0052CC]" />
          <span>Log work</span>
        </button>
      </div>
    </div>
  )
}
