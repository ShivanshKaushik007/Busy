'use client'

import React from 'react'

export type IssueType = 'task' | 'story' | 'bug' | 'epic' | string

interface BusyIssueTypeIconProps {
  type?: IssueType
  className?: string
  size?: number
}

export default function BusyIssueTypeIcon({
  type = 'task',
  className = '',
  size = 14
}: BusyIssueTypeIconProps) {
  const norm = type?.toLowerCase()

  if (norm === 'bug') {
    return (
      <span
        className={`inline-flex items-center justify-center rounded-[3px] bg-[#E5493A] text-white shrink-0 ${className}`}
        style={{ width: size, height: size }}
        title="Bug"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-white" />
      </span>
    )
  }

  if (norm === 'story') {
    return (
      <span
        className={`inline-flex items-center justify-center rounded-[3px] bg-[#36B37E] text-white shrink-0 ${className}`}
        style={{ width: size, height: size }}
        title="User Story"
      >
        <svg width={size * 0.7} height={size * 0.7} viewBox="0 0 24 24" fill="currentColor">
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
        </svg>
      </span>
    )
  }

  if (norm === 'epic') {
    return (
      <span
        className={`inline-flex items-center justify-center rounded-[3px] bg-[#6554C0] text-white shrink-0 ${className}`}
        style={{ width: size, height: size }}
        title="Epic"
      >
        <svg width={size * 0.7} height={size * 0.7} viewBox="0 0 24 24" fill="currentColor">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
      </span>
    )
  }

  // Default: Blue Task square with checkmark
  return (
    <span
      className={`inline-flex items-center justify-center rounded-[3px] bg-[#4BADE8] text-white shrink-0 ${className}`}
      style={{ width: size, height: size }}
      title="Task"
    >
      <svg
        width={size * 0.75}
        height={size * 0.75}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="20 6 9 17 4 12" />
      </svg>
    </span>
  )
}
