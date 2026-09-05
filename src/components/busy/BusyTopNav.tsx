'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { 
  Search, 
  Plus,
  ShieldCheck,
  User,
  UserCheck,
  FolderKanban,
  Users,
  LogOut,
  Keyboard,
  Sparkles,
  Mail
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { logout } from '@/app/login/actions'
import OverdueAlerts, { OverdueAlert } from '@/components/OverdueAlerts'
import CreateTaskDialog from '@/components/CreateTaskDialog'
import BusyAvatar from './BusyAvatar'
import { useKeyboardShortcuts } from '@/components/keyboard/KeyboardShortcutsProvider'

interface BusyTopNavProps {
  alerts: OverdueAlert[]
  userEmail?: string
  userFullName?: string
  userRole?: string
}

export default function BusyTopNav({
  alerts,
  userEmail,
  userFullName,
  userRole
}: BusyTopNavProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [searchQuery, setSearchQuery] = useState('')
  const { openCommandPalette, openShortcutsModal, openEmailDigest } = useKeyboardShortcuts()

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/tasks?q=${encodeURIComponent(searchQuery.trim())}`)
    }
  }

  return (
    <header className="h-[52px] bg-white border-b border-[#DFE1E6] flex items-center justify-between px-3 z-30 shrink-0 select-none shadow-2xs">
      {/* LEFT SECTION: Logo + Nav items + Create Button */}
      <div className="flex items-center gap-2 md:gap-4 h-full">
        {/* Busy Brand Logo */}
        <Link href="/" className="flex items-center gap-2 group mr-1">
          <div className="w-6 h-6 rounded-[3px] bg-[#0052CC] flex items-center justify-center text-white shadow-2xs group-hover:bg-[#0747A6] transition-colors">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
              <path d="M11.53 2c0 2.4-1.97 4.35-4.4 4.35H2.8v4.35h4.33c4.8 0 8.7-3.9 8.7-8.7V2h-4.3z" />
              <path d="M11.53 9.87c0 2.4-1.97 4.35-4.4 4.35H2.8v4.35h4.33c4.8 0 8.7-3.9 8.7-8.7v-.01h-4.3z" opacity=".75" />
              <path d="M11.53 17.74c0 2.4-1.97 4.35-4.4 4.35H2.8v.01h8.73c2.4 0 4.35-1.95 4.35-4.36h-4.35z" opacity=".5" />
            </svg>
          </div>
          <span className="font-bold text-[15px] tracking-tight text-[#172B4D] group-hover:text-[#0052CC] transition-colors">
            Busy
          </span>
          <span className="hidden lg:inline-block text-[11px] font-semibold text-[#5E6C84] bg-[#EBECF0] px-1.5 py-0.5 rounded-[3px]">
            Workspace
          </span>
        </Link>

        {/* Top Nav Menus */}
        <nav className="hidden md:flex items-center space-x-1 h-full text-[13px] font-medium text-[#42526E]">
          <Link
            href="/projects"
            className={`px-2.5 py-1.5 rounded-[3px] transition-colors ${
              pathname.startsWith('/projects') ? 'text-[#0052CC] font-semibold bg-[#EBECF0]' : 'hover:bg-[#EBECF0] hover:text-[#172B4D]'
            }`}
          >
            Projects
          </Link>

          <Link
            href="/tasks"
            className={`px-2.5 py-1.5 rounded-[3px] transition-colors ${
              pathname.startsWith('/tasks') ? 'text-[#0052CC] font-semibold bg-[#EBECF0]' : 'hover:bg-[#EBECF0] hover:text-[#172B4D]'
            }`}
          >
            Filters
          </Link>

          <Link
            href="/"
            className={`px-2.5 py-1.5 rounded-[3px] transition-colors ${
              pathname === '/' ? 'text-[#0052CC] font-semibold bg-[#EBECF0]' : 'hover:bg-[#EBECF0] hover:text-[#172B4D]'
            }`}
          >
            Dashboards
          </Link>

          <Link
            href="/teams"
            className={`px-2.5 py-1.5 rounded-[3px] transition-colors ${
              pathname.startsWith('/teams') ? 'text-[#0052CC] font-semibold bg-[#EBECF0]' : 'hover:bg-[#EBECF0] hover:text-[#172B4D]'
            }`}
          >
            Teams
          </Link>
        </nav>

        {/* Blue "+ Create" Button */}
        <div className="ml-1">
          <CreateTaskDialog 
            trigger={
              <button className="bg-[#0052CC] hover:bg-[#0747A6] active:bg-[#0047B3] text-white font-medium text-[13px] px-3 py-1.5 rounded-[3px] shadow-2xs transition-colors flex items-center gap-1 cursor-pointer">
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>Create</span>
              </button>
            } 
          />
        </div>
      </div>

      {/* RIGHT SECTION: Search Bar + Alerts + Help + User Profile */}
      <div className="flex items-center gap-2 md:gap-3">
        {/* Search Input */}
        <form onSubmit={handleSearchSubmit} className="relative hidden sm:block">
          <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-[#5E6C84]" />
          <input
            id="global-search-input"
            type="search"
            placeholder="Search Busy"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-48 lg:w-64 h-8 pl-8 pr-7 bg-[#FAFBFC] hover:bg-[#EBECF0] focus:bg-white border border-[#DFE1E6] focus:border-[#0052CC] focus:ring-1 focus:ring-[#0052CC] rounded-[3px] text-xs text-[#172B4D] placeholder:text-[#5E6C84] transition-all outline-none"
          />
          <kbd 
            title="Quick search (/)"
            className="absolute right-2 top-2 text-[10px] font-mono text-[#5E6C84] bg-white px-1 border border-[#DFE1E6] rounded-[2px] leading-tight select-none pointer-events-none"
          >
            /
          </kbd>
        </form>

        {/* Overdue Alerts */}
        <OverdueAlerts initialAlerts={alerts} userRole={userRole} />



        {/* User Profile Dropdown Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger className="group relative flex items-center p-0.5 rounded-full hover:ring-2 hover:ring-[#0052CC]/40 transition-all cursor-pointer outline-none">
            <BusyAvatar 
              name={userFullName} 
              email={userEmail} 
              size="sm"
            />
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-72 p-0 rounded-[4px] border border-[#DFE1E6] bg-white shadow-xl overflow-hidden z-50">
            {/* User Profile Header */}
            <div className="p-4 bg-[#FAFBFC] border-b border-[#DFE1E6]">
              <div className="flex items-start gap-3">
                <BusyAvatar 
                  name={userFullName} 
                  email={userEmail} 
                  size="md" 
                />
                <div className="overflow-hidden flex-1 leading-tight">
                  <div className="font-bold text-sm text-[#172B4D] truncate">
                    {userFullName || 'User'}
                  </div>
                  <div className="text-xs text-[#5E6C84] truncate mt-0.5">
                    {userEmail || 'No email provided'}
                  </div>
                  <div className="mt-2">
                    {userRole === 'manager' ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-[3px] bg-[#E3FCEF] text-[#006644] border border-[#ABF5D1]">
                        <ShieldCheck className="w-3 h-3" />
                        <span>Workspace Manager</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-[3px] bg-[#EBECF0] text-[#42526E]">
                        <User className="w-3 h-3" />
                        <span>Team Member</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Links */}
            <div className="p-1.5 text-xs text-[#172B4D]">
              <Link
                href="/tasks?assignedToMe=true"
                className="flex items-center gap-2.5 px-3 py-2 rounded-[3px] hover:bg-[#EBECF0] hover:text-[#0052CC] transition-colors"
              >
                <UserCheck className="w-4 h-4 text-[#5E6C84]" />
                <span className="font-medium">My Assigned Tasks</span>
              </Link>
              <Link
                href="/projects"
                className="flex items-center gap-2.5 px-3 py-2 rounded-[3px] hover:bg-[#EBECF0] hover:text-[#0052CC] transition-colors"
              >
                <FolderKanban className="w-4 h-4 text-[#5E6C84]" />
                <span className="font-medium">My Projects</span>
              </Link>
              <Link
                href="/teams"
                className="flex items-center gap-2.5 px-3 py-2 rounded-[3px] hover:bg-[#EBECF0] hover:text-[#0052CC] transition-colors"
              >
                <Users className="w-4 h-4 text-[#5E6C84]" />
                <span className="font-medium">Teams & People</span>
              </Link>

              <button
                type="button"
                onClick={openEmailDigest}
                className="w-full flex items-center justify-between px-3 py-2 rounded-[3px] hover:bg-[#EBECF0] hover:text-[#0052CC] transition-colors text-left cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Mail className="w-4 h-4 text-[#5E6C84]" />
                  <span className="font-medium">Overdue Email Digest</span>
                </div>
                <div className="flex items-center gap-1 text-[10px] font-mono text-[#5E6C84]">
                  <kbd className="px-1.5 py-0.5 bg-white border border-[#DFE1E6] rounded text-[10px]">g</kbd>
                  <kbd className="px-1.5 py-0.5 bg-white border border-[#DFE1E6] rounded text-[10px]">e</kbd>
                </div>
              </button>

              <button
                type="button"
                onClick={openCommandPalette}
                className="w-full flex items-center justify-between px-3 py-2 rounded-[3px] hover:bg-[#EBECF0] hover:text-[#0052CC] transition-colors text-left cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Sparkles className="w-4 h-4 text-[#5E6C84]" />
                  <span className="font-medium">Command Palette</span>
                </div>
                <div className="flex items-center gap-1 text-[10px] font-mono text-[#5E6C84]">
                  <kbd className="px-1.5 py-0.5 bg-white border border-[#DFE1E6] rounded text-[10px]">Ctrl</kbd>
                  <kbd className="px-1.5 py-0.5 bg-white border border-[#DFE1E6] rounded text-[10px]">K</kbd>
                </div>
              </button>

              <button
                type="button"
                onClick={openShortcutsModal}
                className="w-full flex items-center justify-between px-3 py-2 rounded-[3px] hover:bg-[#EBECF0] hover:text-[#0052CC] transition-colors text-left cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Keyboard className="w-4 h-4 text-[#5E6C84]" />
                  <span className="font-medium">Keyboard Shortcuts</span>
                </div>
                <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-white border border-[#DFE1E6] rounded text-[#5E6C84]">?</kbd>
              </button>
            </div>

            {/* Sign Out Action */}
            <div className="p-1.5 border-t border-[#DFE1E6] bg-[#FAFBFC]">
              <form action={logout}>
                <button
                  type="submit"
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-[3px] text-xs font-semibold text-[#DE350B] hover:bg-[#FFEBE6] transition-colors cursor-pointer text-left"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Log out</span>
                </button>
              </form>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
