'use client'

import React, { useState } from 'react'
import BusyAvatar from './BusyAvatar'
import { ShieldCheck, User } from 'lucide-react'

export interface MentionUser {
  id: string
  full_name?: string
  email?: string
  role?: string
}

interface CommentRendererProps {
  content: string
  currentUserId?: string
  members?: MentionUser[]
}

// Helper to check if a comment mentions a specific user ID or name
export function containsUserMention(content: string, userId?: string, userName?: string): boolean {
  if (!content) return false
  if (userId && content.includes(`](${userId})`)) return true
  if (userName && new RegExp(`@\\[?${userName}\\]?`, 'i').test(content)) return true
  return false
}

// Helper to check if a comment has any @-mentions
export function containsAnyMention(content: string): boolean {
  if (!content) return false
  return /@\[([^\]]+)\]\(([a-f0-9-]+)\)/.test(content) || /@[a-zA-Z0-9_]+/.test(content)
}

export default function CommentRenderer({
  content,
  currentUserId,
  members = []
}: CommentRendererProps) {
  if (!content) return null

  // Structured mention format: @[Full Name](uuid)
  const structuredMentionRegex = /@\[([^\]]+)\]\(([a-f0-9-]+)\)/g

  const elements: React.ReactNode[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = structuredMentionRegex.exec(content)) !== null) {
    const matchStart = match.index
    const matchEnd = match.index + match[0].length

    // Push preceding text if any
    if (matchStart > lastIndex) {
      elements.push(content.substring(lastIndex, matchStart))
    }

    const name = match[1]
    const userId = match[2]
    const isMe = currentUserId && userId === currentUserId
    const member = members.find(m => m.id === userId || m.full_name?.toLowerCase() === name.toLowerCase())

    elements.push(
      <MentionBadge
        key={`mention-${matchStart}-${userId}`}
        name={name}
        userId={userId}
        isMe={Boolean(isMe)}
        member={member}
      />
    )

    lastIndex = matchEnd
  }

  // Push remaining text
  if (lastIndex < content.length) {
    elements.push(content.substring(lastIndex))
  }

  return (
    <div className="whitespace-pre-wrap leading-relaxed break-words text-xs text-[#172B4D]">
      {elements}
    </div>
  )
}

function MentionBadge({
  name,
  userId,
  isMe,
  member
}: {
  name: string
  userId: string
  isMe: boolean
  member?: MentionUser
}) {
  const [hovered, setHovered] = useState(false)

  return (
    <span 
      className="relative inline-block mx-0.5 align-baseline group/badge"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <span
        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[11px] font-semibold border transition-all cursor-pointer ${
          isMe
            ? 'bg-[#0052CC] text-white border-[#0052CC] hover:bg-[#0747A6] shadow-2xs'
            : 'bg-[#DEEBFF] text-[#0052CC] border-[#B3D4FF] hover:bg-[#B3D4FF]/60 hover:border-[#4C9AFF]'
        }`}
      >
        <span 
          className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] font-bold ${
            isMe ? 'bg-white text-[#0052CC]' : 'bg-[#0052CC] text-white'
          }`}
        >
          @
        </span>
        <span className="max-w-[140px] truncate">{name}</span>
        {isMe && (
          <span className="text-[9px] bg-white/20 text-white px-1 rounded-full font-normal">
            you
          </span>
        )}
      </span>

      {/* Hover Profile Tooltip Card */}
      {hovered && (
        <div className="absolute left-0 bottom-full mb-1.5 z-40 w-60 bg-white border border-[#DFE1E6] rounded-md shadow-xl p-3 text-left animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-start gap-2.5">
            <BusyAvatar
              name={member?.full_name || name}
              email={member?.email}
              size="sm"
            />
            <div className="min-w-0 flex-1 leading-tight">
              <div className="font-bold text-xs text-[#172B4D] truncate">
                {member?.full_name || name}
              </div>
              <div className="text-[11px] text-[#5E6C84] truncate mt-0.5">
                {member?.email || 'Project member'}
              </div>
              <div className="mt-1.5">
                {member?.role === 'manager' ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-[#E3FCEF] text-[#006644] border border-[#ABF5D1]">
                    <ShieldCheck className="w-2.5 h-2.5" />
                    <span>Manager</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-[#EBECF0] text-[#42526E]">
                    <User className="w-2.5 h-2.5" />
                    <span>Member</span>
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </span>
  )
}
