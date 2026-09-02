'use client'

import { Bell, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { dismissAlert } from '@/app/actions/alertActions'
import { useState } from 'react'

export type OverdueAlert = {
  id: string;
  title: string;
  due_date: string;
}

export default function OverdueAlerts({ initialAlerts }: { initialAlerts: OverdueAlert[] }) {
  // We keep local state for optimistic UI updates (so it disappears instantly when clicked)
  const [alerts, setAlerts] = useState(initialAlerts)

  const handleDismiss = async (e: React.MouseEvent, alert: OverdueAlert) => {
    e.preventDefault() // Stop dropdown from closing if we just want to dismiss one
    e.stopPropagation()
    
    // Optimistic UI Update
    setAlerts(current => current.filter(a => a.id !== alert.id))
    
    // Call server action to permanently record the dismissal
    await dismissAlert(alert.id, alert.due_date)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-gray-100 relative" />}>
        <Bell className="h-5 w-5" />
        {alerts.length > 0 && (
          <span className="absolute top-0 right-0 h-4 w-4 rounded-full bg-red-600 flex items-center justify-center text-[10px] font-bold text-white shadow-sm ring-2 ring-white border border-red-700">
            {alerts.length}
          </span>
        )}
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="font-semibold text-gray-900 flex justify-between items-center">
          Overdue Tasks
          <span className="text-xs font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{alerts.length}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {alerts.length === 0 ? (
          <div className="p-4 text-sm text-gray-500 text-center">
            You have no overdue tasks. Great job!
          </div>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            {alerts.map(alert => (
              <DropdownMenuItem key={alert.id} className="flex flex-col items-start p-3 focus:bg-gray-50 cursor-default">
                <div className="flex justify-between items-start w-full gap-2">
                  <div className="flex flex-col">
                    <span className="font-medium text-sm text-gray-900 leading-tight mb-1">{alert.title}</span>
                    <span className="text-xs text-red-600 font-semibold">
                      Due: {new Date(alert.due_date).toLocaleDateString()}
                    </span>
                  </div>
                  
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6 text-gray-400 hover:text-gray-900 hover:bg-gray-200 shrink-0" 
                    onClick={(e) => handleDismiss(e, alert)}
                    title="Dismiss alert"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </DropdownMenuItem>
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
