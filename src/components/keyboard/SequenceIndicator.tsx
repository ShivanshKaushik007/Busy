'use client'

import React from 'react'
import { Navigation } from 'lucide-react'

interface SequenceIndicatorProps {
  sequence: string | null
  onCancel: () => void
}

export default function SequenceIndicator({ sequence, onCancel }: SequenceIndicatorProps) {
  if (!sequence) return null

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-3 duration-200">
      <div className="bg-[#172B4D] text-white shadow-2xl rounded-full px-5 py-2.5 flex items-center gap-3 text-xs font-medium border border-[#253858]">
        <div className="flex items-center gap-1.5 text-[#4C9AFF]">
          <Navigation className="w-3.5 h-3.5" />
          <span className="font-semibold uppercase tracking-wider text-[11px]">Go to</span>
        </div>

        <div className="h-3.5 w-[1px] bg-[#42526E]" />

        <div className="flex items-center gap-3 text-[#EBECF0]">
          <span className="flex items-center gap-1">
            <kbd className="bg-[#253858] text-[#DEEBFF] px-1.5 py-0.5 rounded text-[11px] font-mono border border-[#42526E]">
              d
            </kbd>
            <span>Dashboard</span>
          </span>

          <span className="flex items-center gap-1">
            <kbd className="bg-[#253858] text-[#DEEBFF] px-1.5 py-0.5 rounded text-[11px] font-mono border border-[#42526E]">
              b
            </kbd>
            <span>Board</span>
          </span>

          <span className="flex items-center gap-1">
            <kbd className="bg-[#253858] text-[#DEEBFF] px-1.5 py-0.5 rounded text-[11px] font-mono border border-[#42526E]">
              i
            </kbd>
            <span>Issues</span>
          </span>

          <span className="flex items-center gap-1">
            <kbd className="bg-[#253858] text-[#DEEBFF] px-1.5 py-0.5 rounded text-[11px] font-mono border border-[#42526E]">
              p
            </kbd>
            <span>Projects</span>
          </span>

          <span className="flex items-center gap-1">
            <kbd className="bg-[#253858] text-[#DEEBFF] px-1.5 py-0.5 rounded text-[11px] font-mono border border-[#42526E]">
              t
            </kbd>
            <span>Teams</span>
          </span>
        </div>

        <div className="h-3.5 w-[1px] bg-[#42526E]" />

        <button
          onClick={onCancel}
          className="text-[#97A0AF] hover:text-white transition-colors text-[11px] flex items-center gap-1 cursor-pointer"
        >
          <kbd className="bg-[#253858] text-[#A5B2C6] px-1 py-0.5 rounded text-[10px] font-mono">
            Esc
          </kbd>
          <span>cancel</span>
        </button>
      </div>
    </div>
  )
}
