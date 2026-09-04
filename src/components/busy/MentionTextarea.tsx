'use client'

import React, { useState, useRef, useEffect } from 'react'
import BusyAvatar from './BusyAvatar'
import { AtSign, ShieldCheck, User, Users } from 'lucide-react'
import { MentionUser } from './CommentRenderer'

interface MentionTextareaProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  members: MentionUser[]
  projectMembers?: MentionUser[]
  disabled?: boolean
  rows?: number
  onSubmit?: () => void
}

export default function MentionTextarea({
  value,
  onChange,
  placeholder = 'Add a comment or update... (type @ to mention a teammate)',
  members = [],
  projectMembers = [],
  disabled = false,
  rows = 3,
  onSubmit
}: MentionTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const popupRef = useRef<HTMLDivElement>(null)

  const [cursorPos, setCursorPos] = useState<number>(0)
  const [mentionQuery, setMentionQuery] = useState<string | null>(null)
  const [mentionStartIndex, setMentionStartIndex] = useState<number>(-1)
  const [selectedIndex, setSelectedIndex] = useState<number>(0)
  const [isDismissed, setIsDismissed] = useState<boolean>(false)

  // Deduplicate and prioritize project members first
  const candidateMembers = React.useMemo(() => {
    const projectMemberIds = new Set(projectMembers.map(m => m.id))
    const uniqueMap = new Map<string, MentionUser & { isProjectMember: boolean }>()

    for (const pm of projectMembers) {
      if (pm.id) uniqueMap.set(pm.id, { ...pm, isProjectMember: true })
    }
    for (const m of members) {
      if (m.id && !uniqueMap.has(m.id)) {
        uniqueMap.set(m.id, { ...m, isProjectMember: projectMemberIds.has(m.id) })
      }
    }
    return Array.from(uniqueMap.values())
  }, [members, projectMembers])

  // Detect when cursor is inside an @mention query
  const checkMentionTrigger = (text: string, pos: number) => {
    if (isDismissed) return

    const textBeforeCursor = text.slice(0, pos)
    const lastAtPos = textBeforeCursor.lastIndexOf('@')

    if (lastAtPos !== -1) {
      const charBeforeAt = lastAtPos > 0 ? textBeforeCursor[lastAtPos - 1] : ' '
      const textBetween = textBeforeCursor.slice(lastAtPos + 1)

      // Only trigger if @ is at start of line or preceded by whitespace, and no newlines/brackets in between
      if ((/\s/.test(charBeforeAt) || lastAtPos === 0) && !textBetween.includes('\n') && !textBetween.includes(']')) {
        setMentionStartIndex(lastAtPos)
        setMentionQuery(textBetween)
        setSelectedIndex(0)
        return
      }
    }

    setMentionQuery(null)
    setMentionStartIndex(-1)
  }

  // Filtered members matching query
  const filteredCandidates = React.useMemo(() => {
    if (mentionQuery === null) return []
    const q = mentionQuery.toLowerCase().trim()
    if (!q) return candidateMembers.slice(0, 7) // Show top 7 members when just '@'

    return candidateMembers.filter(m => {
      const name = m.full_name?.toLowerCase() || ''
      const email = m.email?.toLowerCase() || ''
      return name.includes(q) || email.includes(q)
    }).slice(0, 7)
  }, [candidateMembers, mentionQuery])

  const insertMention = (member: MentionUser) => {
    if (mentionStartIndex === -1 || !textareaRef.current) return

    const before = value.slice(0, mentionStartIndex)
    const after = value.slice(cursorPos)
    const mentionTag = `@[${member.full_name || member.email || 'User'}](${member.id}) `
    const newValue = `${before}${mentionTag}${after}`
    const newCursor = before.length + mentionTag.length

    onChange(newValue)
    setMentionQuery(null)
    setMentionStartIndex(-1)
    setIsDismissed(false)

    // Set cursor position after inserted mention
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus()
        textareaRef.current.setSelectionRange(newCursor, newCursor)
        setCursorPos(newCursor)
      }
    }, 10)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // If mention popup is open
    if (mentionQuery !== null && filteredCandidates.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex(prev => (prev + 1) % filteredCandidates.length)
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex(prev => (prev - 1 + filteredCandidates.length) % filteredCandidates.length)
        return
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault()
        const selected = filteredCandidates[selectedIndex]
        if (selected) {
          insertMention(selected)
        }
        return
      }
      if (e.key === 'Escape') {
        e.preventDefault()
        setMentionQuery(null)
        setIsDismissed(true)
        return
      }
    }

    // Ctrl+Enter or Cmd+Enter to submit
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && onSubmit) {
      e.preventDefault()
      onSubmit()
    }
  }

  const handleTriggerAt = () => {
    if (!textareaRef.current) return
    const pos = textareaRef.current.selectionStart || value.length
    const before = value.slice(0, pos)
    const after = value.slice(pos)
    const needsSpace = pos > 0 && !/\s/.test(before[before.length - 1])
    const insert = `${needsSpace ? ' ' : ''}@`
    const newValue = `${before}${insert}${after}`
    const newPos = pos + insert.length

    onChange(newValue)
    setIsDismissed(false)

    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus()
        textareaRef.current.setSelectionRange(newPos, newPos)
        setCursorPos(newPos)
        checkMentionTrigger(newValue, newPos)
      }
    }, 10)
  }

  // Close popup if clicked outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        popupRef.current &&
        !popupRef.current.contains(e.target as Node) &&
        textareaRef.current &&
        !textareaRef.current.contains(e.target as Node)
      ) {
        setMentionQuery(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="relative w-full space-y-1.5">
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => {
            onChange(e.target.value)
            setIsDismissed(false)
            const pos = e.target.selectionStart
            setCursorPos(pos)
            checkMentionTrigger(e.target.value, pos)
          }}
          onSelect={(e) => {
            const pos = (e.target as HTMLTextAreaElement).selectionStart
            setCursorPos(pos)
            checkMentionTrigger(value, pos)
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          rows={rows}
          className="w-full p-2.5 text-xs text-[#172B4D] bg-white border border-[#DFE1E6] focus:border-[#0052CC] focus:ring-1 focus:ring-[#0052CC] rounded-[3px] outline-none transition-all resize-y min-h-[72px]"
        />

        {/* Autocomplete Mention Suggestion Dropdown */}
        {mentionQuery !== null && filteredCandidates.length > 0 && (
          <div
            ref={popupRef}
            className="absolute left-2 bottom-full mb-1.5 z-50 w-72 max-h-60 overflow-y-auto bg-white border border-[#DFE1E6] rounded-md shadow-2xl divide-y divide-[#EBECF0] animate-in fade-in slide-in-from-bottom-2 duration-150"
          >
            <div className="px-3 py-1.5 bg-[#FAFBFC] text-[10px] font-bold text-[#5E6C84] uppercase tracking-wider flex items-center justify-between">
              <span className="flex items-center gap-1">
                <AtSign className="w-3 h-3 text-[#0052CC]" />
                <span>Mention teammate</span>
              </span>
              <span className="text-[9px] font-normal lowercase text-[#8993A4]">
                ↑↓ to navigate • ↵ to select
              </span>
            </div>

            <div className="p-1 space-y-0.5">
              {filteredCandidates.map((candidate, idx) => {
                const isSelected = idx === selectedIndex

                return (
                  <button
                    key={candidate.id}
                    type="button"
                    onClick={() => insertMention(candidate)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`w-full text-left px-2.5 py-1.5 rounded-[3px] flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-[#DEEBFF] text-[#0052CC]'
                        : 'hover:bg-[#F4F5F7] text-[#172B4D]'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <BusyAvatar
                        name={candidate.full_name}
                        email={candidate.email}
                        size="xs"
                      />
                      <div className="min-w-0 truncate leading-tight">
                        <div className="text-xs font-semibold truncate">
                          {candidate.full_name || 'User'}
                        </div>
                        <div className="text-[10px] text-[#5E6C84] truncate">
                          {candidate.email}
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-1">
                      {candidate.isProjectMember && (
                        <span className="text-[9px] font-semibold bg-[#E3FCEF] text-[#006644] px-1 py-0.5 rounded border border-[#ABF5D1]">
                          Project
                        </span>
                      )}
                      {candidate.role === 'manager' && (
                        <span title="Workspace Manager">
                          <ShieldCheck className="w-3 h-3 text-[#006644]" />
                        </span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Mention helper toolbar */}
      <div className="flex items-center justify-between text-[11px] text-[#5E6C84]">
        <button
          type="button"
          onClick={handleTriggerAt}
          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-[#EBECF0] hover:text-[#0052CC] transition-colors cursor-pointer font-medium"
          title="Type @ to mention a team member"
        >
          <AtSign className="w-3.5 h-3.5 text-[#0052CC]" />
          <span>Mention member</span>
        </button>

        <span className="text-[10px] text-[#8993A4] hidden sm:inline">
          Type <kbd className="bg-white border border-[#DFE1E6] px-1 py-0.2 rounded font-mono text-[9px]">@</kbd> to notify teammates
        </span>
      </div>
    </div>
  )
}
