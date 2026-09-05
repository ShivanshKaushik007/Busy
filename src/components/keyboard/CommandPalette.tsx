'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog'
import {
  Search,
  LayoutDashboard,
  Kanban,
  CheckSquare,
  FolderKanban,
  Users,
  Plus,
  UserCheck,
  AlertCircle,
  Keyboard,
  ArrowRight,
  Sparkles,
  X,
  Activity,
  Mail
} from 'lucide-react'

interface PaletteItem {
  id: string
  title: string
  subtitle?: string
  category: 'Navigation' | 'Actions'
  icon: React.ComponentType<{ className?: string }>
  shortcut?: string[]
  onSelect: () => void
}

interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onOpenCreateTask: () => void
  onOpenShortcuts: () => void
  onOpenEmailDigest?: () => void
}

export default function CommandPalette({
  open,
  onOpenChange,
  onOpenCreateTask,
  onOpenShortcuts,
  onOpenEmailDigest
}: CommandPaletteProps) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // Reset query and selected index on open
  useEffect(() => {
    if (open) {
      setQuery('')
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  const allItems: PaletteItem[] = [
    // Navigation
    {
      id: 'nav-dashboard',
      title: 'Dashboard',
      subtitle: 'Headline metrics, SLA compliance & project health',
      category: 'Navigation',
      icon: LayoutDashboard,
      shortcut: ['g', 'd'],
      onSelect: () => router.push('/')
    },
    {
      id: 'nav-board',
      title: 'Kanban Board',
      subtitle: 'Interactive drag-and-drop workflow board',
      category: 'Navigation',
      icon: Kanban,
      shortcut: ['g', 'b'],
      onSelect: () => router.push('/board')
    },
    {
      id: 'nav-issues',
      title: 'Issues & Filters',
      subtitle: 'Searchable issue list with bulk actions & CSV export',
      category: 'Navigation',
      icon: CheckSquare,
      shortcut: ['g', 'i'],
      onSelect: () => router.push('/tasks')
    },
    {
      id: 'nav-projects',
      title: 'Projects',
      subtitle: 'Software projects portfolio overview',
      category: 'Navigation',
      icon: FolderKanban,
      shortcut: ['g', 'p'],
      onSelect: () => router.push('/projects')
    },
    {
      id: 'nav-teams',
      title: 'Teams & People',
      subtitle: 'Team member directories and project assignments',
      category: 'Navigation',
      icon: Users,
      shortcut: ['g', 't'],
      onSelect: () => router.push('/teams')
    },
    {
      id: 'nav-activity',
      title: 'Activity Feed',
      subtitle: 'Real-time updates, comments & transitions across all projects',
      category: 'Navigation',
      icon: Activity,
      shortcut: ['g', 'a'],
      onSelect: () => router.push('/activity')
    },
    {
      id: 'nav-email-digest',
      title: 'Overdue Email Digest',
      subtitle: 'Preview and dispatch responsive HTML digest of past-due work',
      category: 'Navigation',
      icon: Mail,
      shortcut: ['g', 'e'],
      onSelect: () => {
        onOpenChange(false)
        onOpenEmailDigest?.()
      }
    },

    // Actions
    {
      id: 'action-create',
      title: 'Create new task',
      subtitle: 'Open task creation dialog with priorities and assignees',
      category: 'Actions',
      icon: Plus,
      shortcut: ['c'],
      onSelect: () => onOpenCreateTask()
    },
    {
      id: 'action-email-digest',
      title: 'Send Overdue Email Digest',
      subtitle: 'Preview and trigger simulated overdue digest to your mailbox',
      category: 'Actions',
      icon: Mail,
      onSelect: () => {
        onOpenChange(false)
        onOpenEmailDigest?.()
      }
    },
    {
      id: 'action-my-tasks',
      title: 'My assigned issues',
      subtitle: 'Filter task list to issues assigned to you',
      category: 'Actions',
      icon: UserCheck,
      onSelect: () => router.push('/tasks?assignedToMe=true')
    },
    {
      id: 'action-overdue',
      title: 'Overdue issues',
      subtitle: 'Filter issues past their due date',
      category: 'Actions',
      icon: AlertCircle,
      onSelect: () => router.push('/tasks?status=Backlog&status=In%20Progress&status=In%20Review')
    },
    {
      id: 'action-shortcuts',
      title: 'Keyboard shortcuts help',
      subtitle: 'Show full reference cheatsheet of all keybindings',
      category: 'Actions',
      icon: Keyboard,
      shortcut: ['?'],
      onSelect: () => onOpenShortcuts()
    }
  ]

  const filteredItems = allItems.filter(item => {
    const q = query.toLowerCase().trim()
    if (!q) return true
    return (
      item.title.toLowerCase().includes(q) ||
      (item.subtitle && item.subtitle.toLowerCase().includes(q)) ||
      item.category.toLowerCase().includes(q)
    )
  })

  // Keep selected index within bounds
  useEffect(() => {
    if (selectedIndex >= filteredItems.length) {
      setSelectedIndex(Math.max(0, filteredItems.length - 1))
    }
  }, [filteredItems.length, selectedIndex])

  // Scroll active item into view
  useEffect(() => {
    if (listRef.current) {
      const activeEl = listRef.current.querySelector('[data-active="true"]') as HTMLElement
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' })
      }
    }
  }, [selectedIndex])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(prev => (prev + 1) % Math.max(1, filteredItems.length))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(prev => (prev - 1 + filteredItems.length) % Math.max(1, filteredItems.length))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const selected = filteredItems[selectedIndex]
      if (selected) {
        onOpenChange(false)
        selected.onSelect()
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="sm:max-w-xl p-0 overflow-hidden bg-white border border-[#DFE1E6] rounded-xl shadow-2xl">
        {/* Search Header */}
        <div className="flex items-center px-4 border-b border-[#DFE1E6] bg-white">
          <Search className="w-4 h-4 text-[#5E6C84] shrink-0 mr-3" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a command or search (e.g. board, create, teams)..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setSelectedIndex(0)
            }}
            onKeyDown={handleKeyDown}
            className="w-full py-3.5 text-sm bg-transparent text-[#172B4D] placeholder:text-[#8993A4] focus:outline-none pr-3"
          />
          <div className="flex items-center gap-2 shrink-0 ml-2">
            <kbd className="hidden sm:inline-flex items-center text-[10px] font-mono text-[#5E6C84] bg-[#EBECF0] px-1.5 py-0.5 rounded border border-[#DFE1E6]">
              ESC
            </kbd>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="p-1 rounded text-[#5E6C84] hover:text-[#172B4D] hover:bg-[#EBECF0] transition-colors cursor-pointer"
              title="Close (Esc)"
            >
              <X className="w-4 h-4" />
              <span className="sr-only">Close</span>
            </button>
          </div>
        </div>

        {/* Results List */}
        <div
          ref={listRef}
          className="max-h-[360px] overflow-y-auto p-2 divide-y divide-transparent"
        >
          {filteredItems.length === 0 ? (
            <div className="py-12 text-center text-xs text-[#5E6C84]">
              No matching pages or actions found for &ldquo;{query}&rdquo;
            </div>
          ) : (
            filteredItems.map((item, idx) => {
              const Icon = item.icon
              const isSelected = idx === selectedIndex

              return (
                <button
                  key={item.id}
                  data-active={isSelected}
                  onClick={() => {
                    onOpenChange(false)
                    item.onSelect()
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                    isSelected ? 'bg-[#EBECF0] text-[#0052CC]' : 'hover:bg-[#FAFBFC] text-[#172B4D]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${
                        isSelected
                          ? 'bg-[#DEEBFF] text-[#0052CC]'
                          : 'bg-[#F4F5F7] text-[#5E6C84]'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="truncate">
                      <div className="text-xs font-semibold truncate flex items-center gap-1.5">
                        <span>{item.title}</span>
                        <span className="text-[10px] font-normal text-[#8993A4] uppercase tracking-wider">
                          • {item.category}
                        </span>
                      </div>
                      {item.subtitle && (
                        <div className="text-[11px] text-[#5E6C84] truncate">
                          {item.subtitle}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Shortcut key badges or arrow */}
                  <div className="flex items-center gap-1 shrink-0">
                    {item.shortcut ? (
                      item.shortcut.map((k, kIdx) => (
                        <kbd
                          key={kIdx}
                          className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-white border border-[#DFE1E6] text-[#5E6C84] font-medium"
                        >
                          {k}
                        </kbd>
                      ))
                    ) : (
                      <ArrowRight className={`w-3.5 h-3.5 ${isSelected ? 'text-[#0052CC]' : 'text-[#C1C7D0]'}`} />
                    )}
                  </div>
                </button>
              )
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-[#DFE1E6] bg-[#FAFBFC] flex items-center justify-between text-[11px] text-[#5E6C84]">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="bg-white border border-[#DFE1E6] px-1 rounded text-[10px] font-mono">↑</kbd>
              <kbd className="bg-white border border-[#DFE1E6] px-1 rounded text-[10px] font-mono">↓</kbd>
              <span>navigate</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="bg-white border border-[#DFE1E6] px-1.5 rounded text-[10px] font-mono">↵</kbd>
              <span>select</span>
            </span>
          </div>
          <div className="flex items-center gap-1 text-[#0052CC] font-medium">
            <Sparkles className="w-3 h-3" />
            <span>Busy Command Palette</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
