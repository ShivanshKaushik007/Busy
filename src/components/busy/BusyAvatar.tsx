'use client'

import React from 'react'

interface BusyAvatarProps {
  name?: string
  email?: string
  size?: 'xs' | 'sm' | 'md' | 'lg'
  className?: string
  showTooltip?: boolean
}

const AVATAR_COLORS = [
  'bg-[#0052CC] text-white',
  'bg-[#00875A] text-white',
  'bg-[#FFAB00] text-[#172B4D]',
  'bg-[#6554C0] text-white',
  'bg-[#00B8D9] text-white',
  'bg-[#FF5630] text-white',
  'bg-[#403294] text-white',
  'bg-[#253858] text-white',
]

function getInitials(name?: string, email?: string): string {
  if (name && name.trim()) {
    const parts = name.trim().split(/\s+/)
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    }
    return name.slice(0, 2).toUpperCase()
  }
  if (email && email.trim()) {
    return email.slice(0, 2).toUpperCase()
  }
  return 'U'
}

function getColorIndex(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  return Math.abs(hash) % AVATAR_COLORS.length
}

export default function BusyAvatar({
  name,
  email,
  size = 'sm',
  className = '',
  showTooltip = true
}: BusyAvatarProps) {
  const displayName = name || email || 'Unassigned'
  const initials = getInitials(name, email)
  const colorClass = AVATAR_COLORS[getColorIndex(displayName)]

  const sizeClasses = {
    xs: 'w-5 h-5 text-[9px]',
    sm: 'w-6 h-6 text-[10px]',
    md: 'w-8 h-8 text-xs',
    lg: 'w-10 h-10 text-sm'
  }[size]

  return (
    <div
      className={`inline-flex items-center justify-center rounded-full font-semibold shrink-0 ring-2 ring-white shadow-2xs select-none ${sizeClasses} ${colorClass} ${className}`}
      title={showTooltip ? displayName : undefined}
    >
      {initials}
    </div>
  )
}
