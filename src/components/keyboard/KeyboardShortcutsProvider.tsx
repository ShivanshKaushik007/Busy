'use client'

import React, { createContext, useContext, useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import KeyboardShortcutsModal from './KeyboardShortcutsModal'
import CommandPalette from './CommandPalette'
import SequenceIndicator from './SequenceIndicator'
import CreateTaskDialog from '@/components/CreateTaskDialog'
import EmailDigestModal from '@/components/busy/EmailDigestModal'
import ProjectDependencyAuditModal from '@/components/busy/ProjectDependencyAuditModal'

interface KeyboardShortcutsContextType {
  openCreateTask: () => void
  openShortcutsModal: () => void
  openCommandPalette: () => void
  openEmailDigest: () => void
  openDependencyAudit: () => void
}

const KeyboardShortcutsContext = createContext<KeyboardShortcutsContextType | null>(null)

export function useKeyboardShortcuts() {
  const context = useContext(KeyboardShortcutsContext)
  if (!context) {
    throw new Error('useKeyboardShortcuts must be used within a KeyboardShortcutsProvider')
  }
  return context
}

export default function KeyboardShortcutsProvider({
  children
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)
  const [createTaskOpen, setCreateTaskOpen] = useState(false)
  const [emailDigestOpen, setEmailDigestOpen] = useState(false)
  const [dependencyAuditOpen, setDependencyAuditOpen] = useState(false)
  const [pendingSequence, setPendingSequence] = useState<string | null>(null)
  const sequenceTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const clearSequence = () => {
    if (sequenceTimeoutRef.current) {
      clearTimeout(sequenceTimeoutRef.current)
      sequenceTimeoutRef.current = null
    }
    setPendingSequence(null)
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      const isInput =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)

      // Handle Escape globally
      if (e.key === 'Escape') {
        if (isInput) {
          target.blur()
          return
        }
        if (pendingSequence) {
          clearSequence()
          return
        }
      }

      // Command Palette: Cmd+K / Ctrl+K (works even if in input or anywhere)
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setCommandPaletteOpen(prev => !prev)
        clearSequence()
        return
      }

      // Ignore all other shortcuts when actively typing in an input
      if (isInput) {
        return
      }

      // Do not trigger single-key hotkeys when modifiers (Ctrl, Alt, Meta) are held
      if (e.ctrlKey || e.metaKey || e.altKey) {
        return
      }

      // If a chord sequence is in progress (e.g. 'g' was pressed)
      if (pendingSequence === 'g') {
        clearSequence()
        const key = e.key.toLowerCase()

        if (key === 'd') {
          e.preventDefault()
          router.push('/')
          return
        }
        if (key === 'b') {
          e.preventDefault()
          router.push('/board')
          return
        }
        if (key === 'i' || key === 'f') {
          e.preventDefault()
          router.push('/tasks')
          return
        }
        if (key === 'p') {
          e.preventDefault()
          router.push('/projects')
          return
        }
        if (key === 't') {
          e.preventDefault()
          router.push('/teams')
          return
        }
        if (key === 'a') {
          e.preventDefault()
          router.push('/activity')
          return
        }
        if (key === 'e') {
          e.preventDefault()
          setEmailDigestOpen(true)
          return
        }
        if (key === 'c') {
          e.preventDefault()
          setDependencyAuditOpen(true)
          return
        }
      }

      // Single-key global shortcuts
      if (e.key === '?') {
        e.preventDefault()
        setShortcutsOpen(prev => !prev)
        return
      }

      if (e.key === '/') {
        e.preventDefault()
        const searchInput = document.getElementById('global-search-input') as HTMLInputElement | null
        if (searchInput) {
          searchInput.focus()
          searchInput.select()
        }
        return
      }

      if (e.key.toLowerCase() === 'c') {
        e.preventDefault()
        setCreateTaskOpen(true)
        return
      }

      if (e.key.toLowerCase() === 'g') {
        e.preventDefault()
        setPendingSequence('g')
        if (sequenceTimeoutRef.current) clearTimeout(sequenceTimeoutRef.current)
        sequenceTimeoutRef.current = setTimeout(() => {
          setPendingSequence(null)
        }, 2200)
        return
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      if (sequenceTimeoutRef.current) clearTimeout(sequenceTimeoutRef.current)
    }
  }, [pendingSequence, router])

  const contextValue: KeyboardShortcutsContextType = {
    openCreateTask: () => setCreateTaskOpen(true),
    openShortcutsModal: () => setShortcutsOpen(true),
    openCommandPalette: () => setCommandPaletteOpen(true),
    openEmailDigest: () => setEmailDigestOpen(true),
    openDependencyAudit: () => setDependencyAuditOpen(true)
  }

  return (
    <KeyboardShortcutsContext.Provider value={contextValue}>
      {children}

      {/* Floating Chord Sequence Indicator */}
      <SequenceIndicator sequence={pendingSequence} onCancel={clearSequence} />

      {/* Keyboard Shortcuts Cheatsheet Modal */}
      <KeyboardShortcutsModal
        open={shortcutsOpen}
        onOpenChange={setShortcutsOpen}
      />

      {/* Command Palette Jump Dialog */}
      <CommandPalette
        open={commandPaletteOpen}
        onOpenChange={setCommandPaletteOpen}
        onOpenCreateTask={() => setCreateTaskOpen(true)}
        onOpenShortcuts={() => setShortcutsOpen(true)}
        onOpenEmailDigest={() => setEmailDigestOpen(true)}
        onOpenDependencyAudit={() => setDependencyAuditOpen(true)}
      />

      {/* Globally Accessible Create Task Dialog (Controlled) */}
      <CreateTaskDialog
        open={createTaskOpen}
        onOpenChange={setCreateTaskOpen}
      />

      {/* Overdue Work Email Digest Center Modal */}
      <EmailDigestModal
        open={emailDigestOpen}
        onOpenChange={setEmailDigestOpen}
      />

      {/* Project Dependency Graph & Multi-Hop Cycle Auditor Modal */}
      <ProjectDependencyAuditModal
        open={dependencyAuditOpen}
        onOpenChange={setDependencyAuditOpen}
      />
    </KeyboardShortcutsContext.Provider>
  )
}

