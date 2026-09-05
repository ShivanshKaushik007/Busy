'use client'

import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Keyboard, Search, X } from 'lucide-react'

interface ShortcutItem {
  keys: string[]
  description: string
}

interface ShortcutCategory {
  title: string
  items: ShortcutItem[]
}

const SHORTCUT_CATEGORIES: ShortcutCategory[] = [
  {
    title: 'Global Actions',
    items: [
      { keys: ['c'], description: 'Create a new task from anywhere' },
      { keys: ['/'], description: 'Focus quick search bar' },
      { keys: ['Ctrl', 'K'], description: 'Open Command Palette / Jump' },
      { keys: ['?'], description: 'Open this keyboard shortcuts cheatsheet' },
      { keys: ['Esc'], description: 'Close active modal, cancel sequence, or blur' },
    ]
  },
  {
    title: 'Navigation ("Go to" Sequences)',
    items: [
      { keys: ['g', 'd'], description: 'Go to Headline Metrics Dashboard' },
      { keys: ['g', 'b'], description: 'Go to Kanban Board' },
      { keys: ['g', 'i'], description: 'Go to Issues & Filters list' },
      { keys: ['g', 'p'], description: 'Go to Projects list' },
      { keys: ['g', 't'], description: 'Go to Teams & People' },
      { keys: ['g', 'a'], description: 'Go to Activity Feed' },
      { keys: ['g', 'e'], description: 'Go to Overdue Email Digest' },
    ]
  },
  {
    title: 'Kanban Board Navigation (/board)',
    items: [
      { keys: ['j', '↓'], description: 'Move focus to next card' },
      { keys: ['k', '↑'], description: 'Move focus to previous card' },
      { keys: ['h', '←'], description: 'Move focus to column on the left' },
      { keys: ['l', '→'], description: 'Move focus to column on the right' },
      { keys: [']'], description: 'Advance focused card status to next column' },
      { keys: ['['], description: 'Regress focused card status to previous column' },
      { keys: ['Enter', 'o'], description: 'Open focused task details' },
    ]
  },
  {
    title: 'Issues List Navigation (/tasks)',
    items: [
      { keys: ['j', '↓'], description: 'Move row focus down' },
      { keys: ['k', '↑'], description: 'Move row focus up' },
      { keys: ['x'], description: 'Toggle row checkbox for bulk actions' },
      { keys: ['Enter', 'o'], description: 'Open focused task details' },
    ]
  }
]

export default function KeyboardShortcutsModal({
  open,
  onOpenChange
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [filterQuery, setFilterQuery] = useState('')

  const filteredCategories = SHORTCUT_CATEGORIES.map(category => {
    const matchingItems = category.items.filter(item =>
      item.description.toLowerCase().includes(filterQuery.toLowerCase()) ||
      item.keys.some(k => k.toLowerCase().includes(filterQuery.toLowerCase()))
    )
    return { ...category, items: matchingItems }
  }).filter(cat => cat.items.length > 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] p-0 flex flex-col overflow-hidden bg-white border border-[#DFE1E6] rounded-lg shadow-2xl">
        {/* Header */}
        <DialogHeader className="p-5 border-b border-[#DFE1E6] bg-[#FAFBFC] shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-md bg-[#DEEBFF] text-[#0052CC] flex items-center justify-center">
                <Keyboard className="w-4 h-4" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-[#172B4D]">
                  Keyboard Shortcuts
                </DialogTitle>
                <p className="text-xs text-[#5E6C84] mt-0.5">
                  Navigate, create, and manage tasks across Busy with your keyboard
                </p>
              </div>
            </div>
          </div>

          {/* Quick Filter Search */}
          <div className="relative mt-4">
            <Search className="w-3.5 h-3.5 text-[#5E6C84] absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search shortcuts (e.g. create, board, move)..."
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              className="w-full h-8 pl-8 pr-3 text-xs bg-white border border-[#DFE1E6] rounded-[3px] focus:outline-none focus:border-[#0052CC] focus:ring-1 focus:ring-[#0052CC] text-[#172B4D]"
            />
            {filterQuery && (
              <button
                onClick={() => setFilterQuery('')}
                className="absolute right-2.5 top-2 text-[#5E6C84] hover:text-[#172B4D]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </DialogHeader>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-6">
          {filteredCategories.length === 0 ? (
            <div className="py-8 text-center text-xs text-[#5E6C84]">
              No shortcuts found matching &ldquo;{filterQuery}&rdquo;
            </div>
          ) : (
            filteredCategories.map((category) => (
              <div key={category.title} className="space-y-2.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#5E6C84] px-1">
                  {category.title}
                </h3>
                <div className="bg-[#FAFBFC] border border-[#DFE1E6] rounded-[4px] divide-y divide-[#EBECF0]">
                  {category.items.map((item, idx) => (
                    <div
                      key={idx}
                      className="px-3 py-2 flex items-center justify-between gap-4 hover:bg-[#F4F5F7] transition-colors"
                    >
                      <span className="text-xs text-[#172B4D] font-medium">
                        {item.description}
                      </span>
                      <div className="flex items-center gap-1 shrink-0">
                        {item.keys.map((key, kIdx) => (
                          <React.Fragment key={kIdx}>
                            <kbd className="min-w-5 h-5 px-1.5 flex items-center justify-center bg-white text-[#172B4D] border border-[#C1C7D0] rounded-[3px] text-[11px] font-mono font-semibold shadow-2xs">
                              {key}
                            </kbd>
                            {kIdx < item.keys.length - 1 && (
                              <span className="text-[10px] text-[#8993A4] font-mono">+</span>
                            )}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-[#DFE1E6] bg-[#FAFBFC] flex items-center justify-between text-[11px] text-[#5E6C84] shrink-0">
          <span>
            Press <kbd className="bg-white border border-[#DFE1E6] px-1 py-0.5 rounded text-[10px] font-mono">?</kbd> anywhere to open this dialog
          </span>
          <span>
            Press <kbd className="bg-white border border-[#DFE1E6] px-1 py-0.5 rounded text-[10px] font-mono">Esc</kbd> to close
          </span>
        </div>
      </DialogContent>
    </Dialog>
  )
}
