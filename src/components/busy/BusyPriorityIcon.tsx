'use client'

import React from 'react'

export type PriorityLevel = 'Urgent' | 'High' | 'Medium' | 'Low' | string

interface BusyPriorityIconProps {
  priority: PriorityLevel
  className?: string
  size?: number
  showLabel?: boolean
}

export default function BusyPriorityIcon({
  priority,
  className = '',
  size = 14,
  showLabel = false
}: BusyPriorityIconProps) {
  const norm = priority?.toLowerCase()

  let icon = null
  let label = priority || 'Medium'
  let colorClass = 'text-gray-500'

  if (norm === 'urgent') {
    // Urgent: Double Chevron Up (Red)
    colorClass = 'text-[#DE350B]'
    icon = (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="shrink-0"
      >
        <path d="m18 11-6-6-6 6" />
        <path d="m18 19-6-6-6 6" />
      </svg>
    )
  } else if (norm === 'high') {
    // High: Single Chevron Up (Orange/Red)
    colorClass = 'text-[#FF5630]'
    icon = (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="shrink-0"
      >
        <path d="m18 15-6-6-6 6" />
      </svg>
    )
  } else if (norm === 'medium') {
    // Medium: Equal bars (Amber/Yellow)
    colorClass = 'text-[#FFAB00]'
    icon = (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="round"
        className="shrink-0"
      >
        <line x1="5" y1="9" x2="19" y2="9" />
        <line x1="5" y1="15" x2="19" y2="15" />
      </svg>
    )
  } else {
    // Low: Single Chevron Down (Green)
    colorClass = 'text-[#36B37E]'
    icon = (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="shrink-0"
      >
        <path d="m6 9 6 6 6-6" />
      </svg>
    )
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium ${colorClass} ${className}`}
      title={`Priority: ${label}`}
    >
      {icon}
      {showLabel && <span className="text-xs text-[#172B4D]">{label}</span>}
    </span>
  )
}
