'use client'

import React from 'react'

export type BusyStatusType = 'Backlog' | 'In Progress' | 'In Review' | 'Done' | 'Blocked' | string

interface BusyLozengeProps {
  status: BusyStatusType
  isBlocked?: boolean
  className?: string
  size?: 'sm' | 'md'
}

export default function BusyLozenge({
  status,
  isBlocked = false,
  className = '',
  size = 'md'
}: BusyLozengeProps) {
  if (isBlocked) {
    return (
      <span
        className={`inline-flex items-center font-bold uppercase tracking-wider rounded-[3px] transition-colors select-none ${
          size === 'sm' ? 'text-[10px] px-1.5 py-0.2' : 'text-[11px] px-2 py-0.5'
        } bg-[#FFEBE6] text-[#DE350B] border border-[#FFBDAD]/40 ${className}`}
        title="Task is currently blocked"
      >
        BLOCKED
      </span>
    )
  }

  const normalized = status?.trim()

  switch (normalized) {
    case 'In Progress':
      return (
        <span
          className={`inline-flex items-center font-bold uppercase tracking-wider rounded-[3px] transition-colors select-none ${
            size === 'sm' ? 'text-[10px] px-1.5 py-0.2' : 'text-[11px] px-2 py-0.5'
          } bg-[#DEEBFF] text-[#0052CC] border border-[#B3D4FF]/50 ${className}`}
        >
          IN PROGRESS
        </span>
      )

    case 'In Review':
      return (
        <span
          className={`inline-flex items-center font-bold uppercase tracking-wider rounded-[3px] transition-colors select-none ${
            size === 'sm' ? 'text-[10px] px-1.5 py-0.2' : 'text-[11px] px-2 py-0.5'
          } bg-[#FFF0B3] text-[#172B4D] border border-[#FFE380]/60 ${className}`}
        >
          IN REVIEW
        </span>
      )

    case 'Done':
      return (
        <span
          className={`inline-flex items-center font-bold uppercase tracking-wider rounded-[3px] transition-colors select-none ${
            size === 'sm' ? 'text-[10px] px-1.5 py-0.2' : 'text-[11px] px-2 py-0.5'
          } bg-[#E3FCEF] text-[#006644] border border-[#ABF5D1]/60 ${className}`}
        >
          DONE
        </span>
      )

    case 'Backlog':
    default:
      return (
        <span
          className={`inline-flex items-center font-bold uppercase tracking-wider rounded-[3px] transition-colors select-none ${
            size === 'sm' ? 'text-[10px] px-1.5 py-0.2' : 'text-[11px] px-2 py-0.5'
          } bg-[#DFE1E6] text-[#42526E] border border-[#C1C7D0]/50 ${className}`}
        >
          {normalized?.toUpperCase() || 'BACKLOG'}
        </span>
      )
  }
}
