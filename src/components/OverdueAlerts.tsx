'use client'

import React, { useState } from 'react'
import { Bell, X, AlertCircle } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { dismissAlert } from '@/app/actions/alertActions'
import { formatShortDate } from '@/lib/dateUtils'

export type OverdueAlert = {
  id: string;
  title: string;
  due_date: string;
}

export default function OverdueAlerts({ initialAlerts }: { initialAlerts: OverdueAlert[] }) {
  const [alerts, setAlerts] = useState(initialAlerts)

  const handleDismiss = async (e: React.MouseEvent, alert: OverdueAlert) => {
    e.preventDefault()
    e.stopPropagation()
    setAlerts(current => current.filter(a => a.id !== alert.id))
    await dismissAlert(alert.id, alert.due_date)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="relative flex items-center justify-center w-8 h-8 rounded-full hover:bg-[#EBECF0] text-[#42526E] hover:text-[#172B4D] transition-colors cursor-pointer outline-none">
        <Bell className="w-4 h-4" />
        {alerts.length > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-[#DE350B] flex items-center justify-center text-[10px] font-bold text-white shadow-2xs ring-2 ring-white">
            {alerts.length}
          </span>
        )}
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-80 p-0 rounded-[4px] border border-[#DFE1E6] bg-white shadow-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-[#DFE1E6] bg-[#FAFBFC] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#172B4D]">Notifications</span>
            <span className="text-[10px] font-semibold text-[#DE350B] bg-[#FFEBE6] px-1.5 py-0.2 rounded-full border border-[#FFBDAD]/60">
              {alerts.length} Overdue
            </span>
          </div>
          <span className="text-[11px] text-[#5E6C84]">Assigned to you</span>
        </div>
        
        {alerts.length === 0 ? (
          <div className="p-6 text-xs text-[#5E6C84] text-center">
            No overdue issues assigned to you. Keep up the momentum!
          </div>
        ) : (
          <div className="max-h-80 overflow-y-auto divide-y divide-[#DFE1E6]">
            {alerts.map(alert => (
              <div 
                key={alert.id} 
                className="flex items-start justify-between p-3 hover:bg-[#F4F5F7] transition-colors gap-2"
              >
                <div className="flex gap-2.5 flex-1 min-w-0">
                  <AlertCircle className="w-3.5 h-3.5 text-[#DE350B] shrink-0 mt-0.5" />
                  <div className="flex flex-col min-w-0">
                    <span className="font-semibold text-xs text-[#172B4D] leading-tight truncate">
                      {alert.title}
                    </span>
                    <span 
                      suppressHydrationWarning
                      className="text-[11px] text-[#DE350B] font-medium mt-0.5"
                    >
                      Deadline: {formatShortDate(alert.due_date)}
                    </span>
                  </div>
                </div>
                
                <button 
                  onClick={(e) => handleDismiss(e, alert)}
                  className="text-[#5E6C84] hover:text-[#172B4D] hover:bg-[#EBECF0] p-1 rounded-[3px] transition-colors shrink-0 cursor-pointer" 
                  title="Dismiss notification"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
