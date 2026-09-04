'use client'

import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog'
import { Clock, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'
import { parseTimeToSeconds, describeSeconds } from '@/lib/timeTrackingUtils'
import { setTaskEstimate } from '@/app/actions/timeTrackingActions'

interface SetEstimateModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  taskId: string
  issueKey?: string
  taskTitle?: string
  currentEstimateFormatted?: string
  onEstimateSaved: () => void
}

export default function SetEstimateModal({
  open,
  onOpenChange,
  taskId,
  issueKey,
  taskTitle,
  currentEstimateFormatted = '0m',
  onEstimateSaved
}: SetEstimateModalProps) {
  const [estimateStr, setEstimateStr] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setEstimateStr(currentEstimateFormatted !== '0m' ? currentEstimateFormatted : '')
      setError(null)
    }
  }, [open, currentEstimateFormatted])

  const parsedSeconds = parseTimeToSeconds(estimateStr)
  const parsedDescription = parsedSeconds ? describeSeconds(parsedSeconds) : null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (estimateStr.trim() && (parsedSeconds === null || parsedSeconds < 0)) {
      setError('Please enter a valid estimate (e.g. 2w, 1d 4h, 16h, 45m)')
      return
    }

    setLoading(true)
    setError(null)

    const res = await setTaskEstimate(taskId, estimateStr)
    setLoading(false)

    if (res.error) {
      setError(res.error)
    } else {
      onEstimateSaved()
      onOpenChange(false)
    }
  }

  const handleQuickChip = (val: string) => {
    setEstimateStr(val)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm p-0 overflow-hidden bg-white rounded-[4px] border border-[#DFE1E6] shadow-xl">
        <DialogHeader className="px-5 py-3.5 border-b border-[#DFE1E6] bg-[#FAFBFC]">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#0052CC]" />
            <DialogTitle className="text-sm font-bold text-[#172B4D]">Set Original Estimate</DialogTitle>
          </div>
          {issueKey && (
            <DialogDescription className="text-xs text-[#5E6C84]">
              <span className="font-mono font-semibold text-[#0052CC]">{issueKey}</span>
              {taskTitle && <span className="truncate"> — {taskTitle}</span>}
            </DialogDescription>
          )}
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-5 space-y-3.5 text-xs">
          {error && (
            <div className="p-2 text-xs text-[#DE350B] bg-[#FFEBE6] border border-[#FFBDAD] rounded-[3px] flex items-center gap-2">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 text-[#DE350B]" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="font-bold text-[#172B4D] flex items-center justify-between">
              <span>Original Estimate</span>
              {parsedDescription && (
                <span className="text-[#006644] font-normal flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>{parsedDescription}</span>
                </span>
              )}
            </label>
            <input
              type="text"
              placeholder="e.g. 1w, 2d 4h, 16h, 45m"
              value={estimateStr}
              onChange={(e) => setEstimateStr(e.target.value)}
              autoFocus
              className="w-full p-2 bg-white border border-[#DFE1E6] focus:border-[#0052CC] focus:ring-1 focus:ring-[#0052CC] rounded-[3px] text-[#172B4D] outline-none text-xs font-medium"
            />
            
            {/* Quick Chips */}
            <div className="flex items-center justify-between pt-1 text-[11px]">
              <div className="flex items-center gap-1 flex-wrap">
                <span className="text-[#5E6C84]">Presets:</span>
                {['2h', '4h', '1d', '2d', '1w'].map(val => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => handleQuickChip(val)}
                    className="px-1.5 py-0.5 bg-[#EBECF0] hover:bg-[#DFE1E6] text-[#172B4D] rounded text-[10px] font-mono cursor-pointer"
                  >
                    {val}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setEstimateStr('')}
                className="text-[#5E6C84] hover:text-[#DE350B] text-[10px] cursor-pointer"
              >
                Clear
              </button>
            </div>
          </div>

          <div className="text-[11px] text-[#5E6C84] bg-[#FAFBFC] p-2 rounded border border-[#DFE1E6]">
            <strong>Format guide:</strong> 1d = 8 hours, 1w = 5 working days (40h). You can specify e.g. <code className="text-[#172B4D] font-mono">1d 4h</code> or <code className="text-[#172B4D] font-mono">16h</code>.
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-[#DFE1E6]">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="px-3 py-1.5 rounded-[3px] text-xs font-medium text-[#42526E] hover:bg-[#EBECF0] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-3.5 py-1.5 rounded-[3px] text-xs font-medium bg-[#0052CC] hover:bg-[#0747A6] active:bg-[#0047B3] text-white shadow-2xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{loading ? 'Saving...' : 'Save Estimate'}</span>
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
