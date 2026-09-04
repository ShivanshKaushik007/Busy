'use client'

import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog'
import { Clock, AlertCircle, CheckCircle2, Loader2, Calendar, FileText } from 'lucide-react'
import { 
  parseTimeToSeconds, 
  describeSeconds, 
  formatSecondsToTime, 
  TimeTrackingSummary 
} from '@/lib/timeTrackingUtils'
import { logTaskWork } from '@/app/actions/timeTrackingActions'

interface LogWorkModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  taskId: string
  issueKey?: string
  taskTitle?: string
  currentSummary: TimeTrackingSummary
  onWorkLogged: () => void
}

export default function LogWorkModal({
  open,
  onOpenChange,
  taskId,
  issueKey,
  taskTitle,
  currentSummary,
  onWorkLogged
}: LogWorkModalProps) {
  const [timeSpent, setTimeSpent] = useState('')
  const [startedAt, setStartedAt] = useState('')
  const [remainingType, setRemainingType] = useState<'auto' | 'leave' | 'set'>('auto')
  const [customRemaining, setCustomRemaining] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Initialize date on open
  useEffect(() => {
    if (open) {
      const now = new Date()
      // format YYYY-MM-DDTHH:mm
      const localIso = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
      setStartedAt(localIso)
      setTimeSpent('')
      setDescription('')
      setError(null)
      setRemainingType('auto')
      setCustomRemaining('')
    }
  }, [open])

  // Real-time parsing of time spent
  const parsedSpentSeconds = parseTimeToSeconds(timeSpent)
  const parsedSpentDescription = parsedSpentSeconds ? describeSeconds(parsedSpentSeconds) : null

  // Calculate preview of new remaining estimate
  const projectedRemainingSeconds = React.useMemo(() => {
    if (!parsedSpentSeconds) return currentSummary.remainingSeconds
    if (remainingType === 'auto') {
      return Math.max(0, currentSummary.remainingSeconds - parsedSpentSeconds)
    }
    if (remainingType === 'leave') {
      return currentSummary.remainingSeconds
    }
    if (remainingType === 'set') {
      const s = parseTimeToSeconds(customRemaining)
      return s !== null ? Math.max(0, s) : currentSummary.remainingSeconds
    }
    return currentSummary.remainingSeconds
  }, [parsedSpentSeconds, remainingType, customRemaining, currentSummary.remainingSeconds])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!parsedSpentSeconds || parsedSpentSeconds <= 0) {
      setError('Please enter a valid time spent (e.g. 2h 30m, 1d 4h, 45m)')
      return
    }

    setLoading(true)
    setError(null)

    const res = await logTaskWork({
      taskId,
      timeSpentStr: timeSpent,
      startedAt: startedAt ? new Date(startedAt).toISOString() : new Date().toISOString(),
      description,
      remainingType,
      customRemainingStr: customRemaining
    })

    setLoading(false)

    if (res.error) {
      setError(res.error)
    } else {
      onWorkLogged()
      onOpenChange(false)
    }
  }

  const handleQuickAdd = (amount: string) => {
    setTimeSpent(amount)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden bg-white rounded-[4px] border border-[#DFE1E6] shadow-xl">
        <DialogHeader className="px-6 py-4 border-b border-[#DFE1E6] bg-[#FAFBFC]">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#0052CC]" />
            <DialogTitle className="text-base font-bold text-[#172B4D]">Log Work</DialogTitle>
          </div>
          {issueKey && (
            <DialogDescription className="text-xs text-[#5E6C84]">
              <span className="font-mono font-semibold text-[#0052CC]">{issueKey}</span>
              {taskTitle && <span> — {taskTitle}</span>}
            </DialogDescription>
          )}
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {error && (
            <div className="p-2.5 text-xs text-[#DE350B] bg-[#FFEBE6] border border-[#FFBDAD] rounded-[3px] flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-[#DE350B]" />
              <span>{error}</span>
            </div>
          )}

          {/* 1. Time Spent Input */}
          <div className="space-y-1.5">
            <label className="font-bold text-[#172B4D] flex items-center justify-between">
              <span>Time Spent <span className="text-[#DE350B]">*</span></span>
              {parsedSpentDescription && (
                <span className="text-[#006644] font-normal flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>{parsedSpentDescription}</span>
                </span>
              )}
            </label>
            <input
              type="text"
              placeholder="e.g. 2h 30m, 1d 4h, 45m, 3h"
              value={timeSpent}
              onChange={(e) => setTimeSpent(e.target.value)}
              autoFocus
              className="w-full p-2 bg-white border border-[#DFE1E6] focus:border-[#0052CC] focus:ring-1 focus:ring-[#0052CC] rounded-[3px] text-[#172B4D] outline-none text-xs font-medium"
            />
            
            {/* Quick Chips & Format Tip */}
            <div className="flex items-center justify-between pt-0.5 text-[11px]">
              <div className="flex items-center gap-1">
                <span className="text-[#5E6C84]">Quick add:</span>
                {['30m', '1h', '2h', '4h', '1d'].map(val => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => handleQuickAdd(val)}
                    className="px-1.5 py-0.5 bg-[#EBECF0] hover:bg-[#DFE1E6] text-[#172B4D] rounded text-[10px] font-mono cursor-pointer"
                  >
                    +{val}
                  </button>
                ))}
              </div>
              <span className="text-[#5E6C84]">1d = 8h, 1w = 5d</span>
            </div>
          </div>

          {/* 2. Date Started */}
          <div className="space-y-1.5">
            <label className="font-bold text-[#172B4D] flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#5E6C84]" />
              <span>Date Started</span>
            </label>
            <input
              type="datetime-local"
              value={startedAt}
              onChange={(e) => setStartedAt(e.target.value)}
              className="w-full p-2 bg-white border border-[#DFE1E6] focus:border-[#0052CC] focus:ring-1 focus:ring-[#0052CC] rounded-[3px] text-[#172B4D] outline-none text-xs cursor-pointer"
            />
          </div>

          {/* 3. Remaining Estimate Options */}
          <div className="space-y-2 pt-2 border-t border-[#DFE1E6]">
            <label className="font-bold text-[#172B4D] block">
              Remaining Estimate
            </label>

            <div className="space-y-2 bg-[#FAFBFC] p-2.5 rounded-[3px] border border-[#DFE1E6]">
              {/* Option A: Auto Adjust */}
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="remainingType"
                  value="auto"
                  checked={remainingType === 'auto'}
                  onChange={() => setRemainingType('auto')}
                  className="mt-0.5 cursor-pointer accent-[#0052CC]"
                />
                <div className="flex-1">
                  <div className="font-medium text-[#172B4D]">Adjust automatically</div>
                  <div className="text-[11px] text-[#5E6C84]">
                    Reduces remaining from {currentSummary.remainingFormatted} to{' '}
                    <strong className="text-[#172B4D]">
                      {formatSecondsToTime(projectedRemainingSeconds)}
                    </strong>
                  </div>
                </div>
              </label>

              {/* Option B: Leave unchanged */}
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="remainingType"
                  value="leave"
                  checked={remainingType === 'leave'}
                  onChange={() => setRemainingType('leave')}
                  className="mt-0.5 cursor-pointer accent-[#0052CC]"
                />
                <div className="flex-1">
                  <div className="font-medium text-[#172B4D]">Leave estimate unchanged</div>
                  <div className="text-[11px] text-[#5E6C84]">
                    Stays at {currentSummary.remainingFormatted}
                  </div>
                </div>
              </label>

              {/* Option C: Set custom */}
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="remainingType"
                  value="set"
                  checked={remainingType === 'set'}
                  onChange={() => setRemainingType('set')}
                  className="mt-0.5 cursor-pointer accent-[#0052CC]"
                />
                <div className="flex-1 space-y-1">
                  <div className="font-medium text-[#172B4D]">Set to custom value</div>
                  {remainingType === 'set' && (
                    <input
                      type="text"
                      placeholder="e.g. 3h, 1d 2h"
                      value={customRemaining}
                      onChange={(e) => setCustomRemaining(e.target.value)}
                      className="w-full p-1.5 bg-white border border-[#DFE1E6] rounded-[3px] text-xs outline-none focus:border-[#0052CC]"
                    />
                  )}
                </div>
              </label>
            </div>
          </div>

          {/* 4. Work Description */}
          <div className="space-y-1.5 pt-1">
            <label className="font-bold text-[#172B4D] flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-[#5E6C84]" />
              <span>Work Description <span className="text-[#5E6C84] font-normal">(optional)</span></span>
            </label>
            <textarea
              rows={3}
              placeholder="Describe what was accomplished..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-2 bg-white border border-[#DFE1E6] focus:border-[#0052CC] focus:ring-1 focus:ring-[#0052CC] rounded-[3px] text-[#172B4D] outline-none text-xs"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex justify-end gap-2 pt-3 border-t border-[#DFE1E6]">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="px-3 py-1.5 rounded-[3px] text-xs font-medium text-[#42526E] hover:bg-[#EBECF0] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !timeSpent.trim()}
              className="px-3.5 py-1.5 rounded-[3px] text-xs font-medium bg-[#0052CC] hover:bg-[#0747A6] active:bg-[#0047B3] text-white shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{loading ? 'Logging...' : 'Log work'}</span>
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
