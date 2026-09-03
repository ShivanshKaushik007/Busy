'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { motion } from 'framer-motion'
import { CheckCircle2, AlertCircle, CalendarClock, Target, User, BarChart3 } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

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

const COLORS = ['#0052CC', '#FF991F', '#00875A', '#DE350B', '#6554C0'];

export default function DashboardCharts({ metrics, chartData, statusData, assigneeData = [] }: DashboardDataProps) {
  const totalTasks = metrics.openTasks + metrics.completedThisWeek || 1;

  return (
    <div className="space-y-6">
      {/* 1. Headline Numbers (Requirement 8) */}
      <motion.div 
        className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, staggerChildren: 0.1 }}
      >
        <Card className="border-gray-200 shadow-xs hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-gray-600">Open Tasks</CardTitle>
            <Target className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{metrics.openTasks}</div>
            <p className="text-xs text-gray-400 mt-1">Active backlog & sprint items</p>
          </CardContent>
        </Card>
        
        <Card className="border-gray-200 shadow-xs hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-gray-600">Overdue</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{metrics.overdueTasks}</div>
            <p className="text-xs text-red-500 mt-1">Tasks past their due date</p>
          </CardContent>
        </Card>

        <Card className="border-gray-200 shadow-xs hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-gray-600">Due This Week</CardTitle>
            <CalendarClock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{metrics.dueThisWeek}</div>
            <p className="text-xs text-orange-600 mt-1">Expiring within 7 days</p>
          </CardContent>
        </Card>

        <Card className="border-gray-200 shadow-xs hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-gray-600">Completed This Week</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{metrics.completedThisWeek}</div>
            <p className="text-xs text-green-600 mt-1">Moved to Done this cycle</p>
          </CardContent>
        </Card>
      </motion.div>

      {/* 2. Charts: 8-Week Completions & Status Pie Chart */}
      <motion.div 
        className="grid gap-4 md:grid-cols-2 lg:grid-cols-7"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15 }}
      >
        <Card className="col-span-4 border-gray-200 shadow-xs">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-gray-800">Completions over last 8 weeks</CardTitle>
          </CardHeader>
          <CardContent className="h-[280px] w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12}} dx={-10} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Line type="monotone" dataKey="completed" stroke="var(--primary)" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6, strokeWidth: 0 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        
        <Card className="col-span-3 border-gray-200 shadow-xs">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-gray-800">Tasks by Status</CardTitle>
          </CardHeader>
          <CardContent className="h-[280px] flex items-center justify-center border-t border-gray-100 pt-2">
            {statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
               <p className="text-sm text-gray-500">No tasks found</p>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* 3. Detailed Breakdown: By Assignee & By Status (Requirement 8) */}
      <motion.div
        className="grid gap-4 md:grid-cols-2"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.25 }}
      >
        {/* Breakdown by Assignee */}
        <Card className="border-gray-200 shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-gray-800 flex items-center gap-2">
              <User className="h-4 w-4 text-primary" />
              Tasks by Assignee
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            {assigneeData.length === 0 ? (
              <p className="text-sm text-gray-500">No tasks assigned yet.</p>
            ) : (
              assigneeData.map((item) => {
                const pct = Math.min(100, Math.round((item.count / totalTasks) * 100));
                return (
                  <div key={item.name} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-medium text-gray-700">
                      <span className="truncate">{item.name}</span>
                      <span className="text-gray-500">{item.count} task{item.count === 1 ? '' : 's'} ({pct}%)</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(pct, 6)}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Breakdown by Status */}
        <Card className="border-gray-200 shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-gray-800 flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-blue-600" />
              Status Distribution Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            {statusData.length === 0 ? (
              <p className="text-sm text-gray-500">No tasks available.</p>
            ) : (
              statusData.map((item, idx) => {
                const total = statusData.reduce((acc, curr) => acc + curr.value, 0) || 1;
                const pct = Math.round((item.value / total) * 100);
                return (
                  <div key={item.name} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-medium text-gray-700">
                      <span className="flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                        {item.name}
                      </span>
                      <span className="text-gray-500">{item.value} ({pct}%)</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div
                        className="h-2 rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(pct, 6)}%`, backgroundColor: COLORS[idx % COLORS.length] }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
