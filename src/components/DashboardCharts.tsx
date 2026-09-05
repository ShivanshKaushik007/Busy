'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { 
  CheckCircle2, 
  AlertCircle, 
  CalendarClock, 
  Target, 
  User, 
  BarChart3,
  TrendingUp,
  Activity,
  Layers,
  Mail
} from 'lucide-react'
import { useKeyboardShortcuts } from '@/components/keyboard/KeyboardShortcutsProvider'
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts'
import BusyLozenge from '@/components/busy/BusyLozenge'
import BusyAvatar from '@/components/busy/BusyAvatar'

interface DashboardDataProps {
  metrics: {
    openTasks: number;
    overdueTasks: number;
    dueThisWeek: number;
    completedThisWeek: number;
  };
  chartData: { name: string; completed: number }[];
  statusData: { name: string; value: number }[];
  assigneeData?: { name: string; count: number }[];
}

const BUSY_COLORS: Record<string, string> = {
  'Backlog': '#42526E',
  'In Progress': '#0052CC',
  'In Review': '#FFAB00',
  'Done': '#00875A',
  'Blocked': '#DE350B'
}

const FALLBACK_COLORS = ['#0052CC', '#00875A', '#FFAB00', '#DE350B', '#6554C0']

export default function DashboardCharts({ 
  metrics, 
  chartData, 
  statusData, 
  assigneeData = [] 
}: DashboardDataProps) {
  const totalTasks = metrics.openTasks + metrics.completedThisWeek || 1
  const { openEmailDigest } = useKeyboardShortcuts()

  return (
    <div className="space-y-6 select-none">
      {/* 1. Jira Headline Gadgets (Requirement 8) */}
      <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        {/* Open Tasks */}
        <div className="bg-white border border-[#DFE1E6] rounded-[3px] p-4 shadow-2xs relative overflow-hidden border-t-4 border-t-[#0052CC]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#5E6C84] uppercase tracking-wider">
              Open Issues
            </span>
            <Target className="w-4 h-4 text-[#0052CC]" />
          </div>
          <div className="mt-2 text-3xl font-bold text-[#172B4D] tracking-tight">
            {metrics.openTasks}
          </div>
          <p className="text-[11px] text-[#5E6C84] mt-1">Active backlog & sprint items</p>
        </div>

        {/* Overdue Tasks */}
        <div className="bg-white border border-[#DFE1E6] rounded-[3px] p-4 shadow-2xs relative overflow-hidden border-t-4 border-t-[#DE350B]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#DE350B] uppercase tracking-wider">
              Overdue
            </span>
            <AlertCircle className="w-4 h-4 text-[#DE350B]" />
          </div>
          <div className="mt-2 text-3xl font-bold text-[#DE350B] tracking-tight flex items-baseline justify-between">
            <span>{metrics.overdueTasks}</span>
            <button
              type="button"
              onClick={openEmailDigest}
              className="text-[11px] font-semibold text-[#0052CC] hover:text-[#0747A6] bg-[#DEEBFF] hover:bg-[#B3D4FF] px-2 py-0.5 rounded-[3px] transition-colors flex items-center gap-1 cursor-pointer"
              title="Open Overdue Email Digest Center"
            >
              <Mail className="w-3 h-3" />
              <span>Email Digest</span>
            </button>
          </div>
          <p className="text-[11px] text-[#DE350B] mt-1 font-medium">Issues past due date</p>
        </div>

        {/* Due This Week */}
        <div className="bg-white border border-[#DFE1E6] rounded-[3px] p-4 shadow-2xs relative overflow-hidden border-t-4 border-t-[#FFAB00]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#5E6C84] uppercase tracking-wider">
              Due This Week
            </span>
            <CalendarClock className="w-4 h-4 text-[#FFAB00]" />
          </div>
          <div className="mt-2 text-3xl font-bold text-[#172B4D] tracking-tight">
            {metrics.dueThisWeek}
          </div>
          <p className="text-[11px] text-[#5E6C84] mt-1">Expiring within 7 days</p>
        </div>

        {/* Completed This Week */}
        <div className="bg-white border border-[#DFE1E6] rounded-[3px] p-4 shadow-2xs relative overflow-hidden border-t-4 border-t-[#00875A]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#00875A] uppercase tracking-wider">
              Completed
            </span>
            <CheckCircle2 className="w-4 h-4 text-[#00875A]" />
          </div>
          <div className="mt-2 text-3xl font-bold text-[#00875A] tracking-tight">
            {metrics.completedThisWeek}
          </div>
          <p className="text-[11px] text-[#00875A] mt-1 font-medium">Moved to Done this cycle</p>
        </div>
      </div>

      {/* 2. Charts: 8-Week Velocity & Status Distribution */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* Sprint Completion Velocity */}
        <div className="lg:col-span-4 bg-white border border-[#DFE1E6] rounded-[3px] shadow-2xs p-4 flex flex-col">
          <div className="border-b border-[#DFE1E6] pb-3 mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#0052CC]" />
              <h3 className="text-sm font-bold text-[#172B4D]">
                Velocity (Completions Over Last 8 Weeks)
              </h3>
            </div>
            <span className="text-[11px] text-[#5E6C84] font-medium">Sprint trends</span>
          </div>

          <div className="h-[260px] w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EBECF0" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#5E6C84', fontSize: 11, fontWeight: 500 }} 
                  dy={10} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#5E6C84', fontSize: 11 }} 
                  dx={-10} 
                />
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: '3px', 
                    border: '1px solid #DFE1E6', 
                    backgroundColor: '#FFFFFF',
                    boxShadow: '0 4px 8px -2px rgba(9, 30, 66, 0.15)',
                    fontSize: '12px'
                  }} 
                />
                <Line 
                  type="monotone" 
                  dataKey="completed" 
                  stroke="#0052CC" 
                  strokeWidth={2.5} 
                  dot={{ r: 4, stroke: '#0052CC', strokeWidth: 2, fill: '#FFFFFF' }} 
                  activeDot={{ r: 6, stroke: '#0052CC', strokeWidth: 0, fill: '#0052CC' }} 
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        {/* Status Distribution Donut */}
        <div className="lg:col-span-3 bg-white border border-[#DFE1E6] rounded-[3px] shadow-2xs p-4 flex flex-col">
          <div className="border-b border-[#DFE1E6] pb-3 mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#0052CC]" />
              <h3 className="text-sm font-bold text-[#172B4D]">
                Issues by Status
              </h3>
            </div>
            <span className="text-[11px] text-[#5E6C84] font-medium">Distribution</span>
          </div>

          <div className="h-[260px] flex items-center justify-center pt-2">
            {statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => {
                      const color = BUSY_COLORS[entry.name] || FALLBACK_COLORS[index % FALLBACK_COLORS.length]
                      return <Cell key={`cell-${index}`} fill={color} />
                    })}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      borderRadius: '3px', 
                      border: '1px solid #DFE1E6', 
                      backgroundColor: '#FFFFFF',
                      boxShadow: '0 4px 8px -2px rgba(9, 30, 66, 0.15)',
                      fontSize: '12px'
                    }} 
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
               <p className="text-xs text-[#5E6C84] italic">No issues recorded yet</p>
            )}
          </div>
        </div>
      </div>

      {/* 3. Detailed Gadgets: Workload by Assignee & Status Counts */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Assignee Workload */}
        <div className="bg-white border border-[#DFE1E6] rounded-[3px] shadow-2xs p-4">
          <div className="border-b border-[#DFE1E6] pb-3 mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-[#0052CC]" />
              <h3 className="text-sm font-bold text-[#172B4D]">Workload by Assignee</h3>
            </div>
            <span className="text-[11px] text-[#5E6C84]">Team distribution</span>
          </div>

          <div className="space-y-3 pt-1">
            {assigneeData.length === 0 ? (
              <p className="text-xs text-[#5E6C84] italic">No issues assigned yet.</p>
            ) : (
              assigneeData.map((item) => {
                const pct = Math.min(100, Math.round((item.count / totalTasks) * 100))
                return (
                  <div key={item.name} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-medium text-[#172B4D]">
                      <div className="flex items-center gap-2">
                        <BusyAvatar name={item.name} size="xs" />
                        <span className="truncate max-w-[180px]">{item.name}</span>
                      </div>
                      <span className="text-[#5E6C84] font-semibold">{item.count} issues ({pct}%)</span>
                    </div>
                    <div className="w-full bg-[#EBECF0] rounded-full h-1.5">
                      <div
                        className="bg-[#0052CC] h-1.5 rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(pct, 5)}%` }}
                      />
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Status Distribution Summary */}
        <div className="bg-white border border-[#DFE1E6] rounded-[3px] shadow-2xs p-4">
          <div className="border-b border-[#DFE1E6] pb-3 mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-[#0052CC]" />
              <h3 className="text-sm font-bold text-[#172B4D]">Status Summary</h3>
            </div>
            <span className="text-[11px] text-[#5E6C84]">All portfolio issues</span>
          </div>

          <div className="space-y-2.5 pt-1">
            {statusData.length === 0 ? (
              <p className="text-xs text-[#5E6C84] italic">No issues available.</p>
            ) : (
              statusData.map((item, idx) => {
                const total = statusData.reduce((acc, curr) => acc + curr.value, 0) || 1
                const pct = Math.round((item.value / total) * 100)
                const color = BUSY_COLORS[item.name] || FALLBACK_COLORS[idx % FALLBACK_COLORS.length]

                return (
                  <div key={item.name} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-medium text-[#172B4D]">
                      <div className="flex items-center gap-2">
                        <BusyLozenge status={item.name} size="sm" />
                      </div>
                      <span className="text-[#5E6C84] font-semibold">{item.value} ({pct}%)</span>
                    </div>
                    <div className="w-full bg-[#EBECF0] rounded-full h-1.5">
                      <div
                        className="h-1.5 rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(pct, 5)}%`, backgroundColor: color }}
                      />
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
