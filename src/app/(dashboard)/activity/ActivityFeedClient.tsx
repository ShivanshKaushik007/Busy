'use client'

import React, { useState, useTransition, useMemo } from 'react'
import { 
  Activity, 
  MessageSquare, 
  ArrowRightLeft, 
  UserCheck, 
  ShieldAlert, 
  PlusCircle, 
  RotateCw, 
  Clock, 
  Search, 
  FolderKanban, 
  Users, 
  ChevronRight,
  Sparkles,
  Layers,
  ArrowRight,
  Calendar,
  AlertCircle
} from 'lucide-react'
import BusyAvatar from '@/components/busy/BusyAvatar'
import BusyLozenge from '@/components/busy/BusyLozenge'
import BusyPriorityIcon from '@/components/busy/BusyPriorityIcon'
import BusyIssueTypeIcon from '@/components/busy/BusyIssueTypeIcon'
import CommentRenderer from '@/components/busy/CommentRenderer'
import TaskDetailModal from '@/components/TaskDetailModal'
import { 
  ActivityFeedItem, 
  ActivityFeedStats, 
  ActivityActionCategory, 
  getActivityFeed 
} from '@/app/actions/activityActions'
import { TaskPriority, TaskStatus } from '@/lib/types'
import { formatDateTime } from '@/lib/dateUtils'

interface ActivityFeedClientProps {
  initialItems: ActivityFeedItem[]
  initialStats: ActivityFeedStats
  initialTotal: number
  initialHasMore: boolean
  projects: Array<{ id: string; name: string; key: string }>
  members: Array<{ id: string; full_name?: string; email?: string; role?: string }>
  currentUserId?: string
}

export default function ActivityFeedClient({
  initialItems,
  initialStats,
  initialTotal,
  initialHasMore,
  projects,
  members,
  currentUserId
}: ActivityFeedClientProps) {
  const [items, setItems] = useState<ActivityFeedItem[]>(initialItems)
  const [stats, setStats] = useState<ActivityFeedStats>(initialStats)
  const [total, setTotal] = useState<number>(initialTotal)
  const [hasMore, setHasMore] = useState<boolean>(initialHasMore)

  // Filters state
  const [selectedCategory, setSelectedCategory] = useState<ActivityActionCategory>('all')
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all')
  const [selectedActorId, setSelectedActorId] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')

  // Interactive Task Modal state
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)

  // Loading states
  const [isPending, startTransition] = useTransition()
  const [loadingMore, setLoadingMore] = useState(false)

  // Trigger query refetch when filter dropdowns or categories change
  const fetchFilteredData = (newCategory = selectedCategory, newProj = selectedProjectId, newActor = selectedActorId, newSearch = searchQuery) => {
    startTransition(async () => {
      const res = await getActivityFeed({
        actionCategory: newCategory,
        projectId: newProj,
        actorId: newActor,
        searchQuery: newSearch,
        limit: 40,
        offset: 0
      })
      if (!res.error) {
        setItems(res.items)
        setStats(res.stats)
        setTotal(res.total)
        setHasMore(res.hasMore)
      }
    })
  }

  const handleCategoryChange = (cat: ActivityActionCategory) => {
    setSelectedCategory(cat)
    fetchFilteredData(cat, selectedProjectId, selectedActorId, searchQuery)
  }

  const handleProjectChange = (projId: string) => {
    setSelectedProjectId(projId)
    fetchFilteredData(selectedCategory, projId, selectedActorId, searchQuery)
  }

  const handleActorChange = (actorId: string) => {
    setSelectedActorId(actorId)
    fetchFilteredData(selectedCategory, selectedProjectId, actorId, searchQuery)
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    fetchFilteredData(selectedCategory, selectedProjectId, selectedActorId, searchQuery)
  }

  const handleRefresh = () => {
    fetchFilteredData()
  }

  const handleLoadMore = async () => {
    if (loadingMore || !hasMore) return
    setLoadingMore(true)
    const res = await getActivityFeed({
      actionCategory: selectedCategory,
      projectId: selectedProjectId,
      actorId: selectedActorId,
      searchQuery: searchQuery,
      limit: 30,
      offset: items.length
    })
    setLoadingMore(false)
    if (!res.error) {
      setItems(prev => [...prev, ...res.items])
      setHasMore(res.hasMore)
    }
  }

  // Group events chronologically into Today, Yesterday, This Week, and Older
  const groupedEvents = useMemo(() => {
    const groups: { [label: string]: ActivityFeedItem[] } = {
      Today: [],
      Yesterday: [],
      'This Week': [],
      Older: []
    }

    const now = new Date()
    const todayStr = now.toDateString()
    const yesterday = new Date(now)
    yesterday.setDate(now.getDate() - 1)
    const yesterdayStr = yesterday.toDateString()

    const oneWeekAgo = new Date(now)
    oneWeekAgo.setDate(now.getDate() - 7)

    items.forEach(item => {
      const itemDate = new Date(item.created_at)
      const dateStr = itemDate.toDateString()

      if (dateStr === todayStr) {
        groups['Today'].push(item)
      } else if (dateStr === yesterdayStr) {
        groups['Yesterday'].push(item)
      } else if (itemDate > oneWeekAgo) {
        groups['This Week'].push(item)
      } else {
        groups['Older'].push(item)
      }
    })

    return Object.entries(groups).filter(([_, list]) => list.length > 0)
  }, [items])

  return (
    <div className="space-y-5 select-none pb-12">
      {/* 1. Header & Navigation Breadcrumb */}
      <div>
        <nav className="text-xs text-[#5E6C84] mb-1 flex items-center gap-1.5 font-medium">
          <span>Workspace</span>
          <span>/</span>
          <span>Cross-Project Activity</span>
          <span>/</span>
          <span className="text-[#172B4D] font-semibold">Feed</span>
        </nav>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-[#172B4D] tracking-tight">Activity Feed</h1>
              <span className="flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#E3FCEF] text-[#006644] border border-[#ABF5D1]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00875A] animate-pulse" />
                Live Stream
              </span>
            </div>
            <p className="text-xs text-[#5E6C84] mt-0.5">
              Real-time audit trail of task creations, status moves, comments, @-mentions, and dependencies across all projects.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={isPending}
              className="h-8 px-2.5 text-xs font-medium rounded-[3px] border border-[#DFE1E6] bg-white hover:bg-[#FAFBFC] text-[#42526E] hover:text-[#172B4D] transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs disabled:opacity-60"
              title="Refresh activity feed"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isPending ? 'animate-spin text-[#0052CC]' : ''}`} />
              <span>{isPending ? 'Refreshing...' : 'Refresh'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Top Summary Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-[#DFE1E6] rounded-[3px] p-3 shadow-2xs">
          <div className="flex items-center justify-between text-[#5E6C84] text-[11px] font-medium">
            <span>Total Updates</span>
            <Activity className="w-3.5 h-3.5 text-[#0052CC]" />
          </div>
          <div className="text-xl font-bold text-[#172B4D] mt-1">{stats.totalEvents}</div>
          <div className="text-[10px] text-[#5E6C84] mt-0.5">Logged in audit trail</div>
        </div>

        <div className="bg-white border border-[#DFE1E6] rounded-[3px] p-3 shadow-2xs">
          <div className="flex items-center justify-between text-[#5E6C84] text-[11px] font-medium">
            <span>Discussions & Comments</span>
            <MessageSquare className="w-3.5 h-3.5 text-[#006644]" />
          </div>
          <div className="text-xl font-bold text-[#172B4D] mt-1">{stats.commentsCount}</div>
          <div className="text-[10px] text-[#5E6C84] mt-0.5">Collaborative notes & mentions</div>
        </div>

        <div className="bg-white border border-[#DFE1E6] rounded-[3px] p-3 shadow-2xs">
          <div className="flex items-center justify-between text-[#5E6C84] text-[11px] font-medium">
            <span>Status Transitions</span>
            <ArrowRightLeft className="w-3.5 h-3.5 text-[#6554C0]" />
          </div>
          <div className="text-xl font-bold text-[#172B4D] mt-1">{stats.statusChangesCount}</div>
          <div className="text-[10px] text-[#5E6C84] mt-0.5">Workflow movements</div>
        </div>

        <div className="bg-white border border-[#DFE1E6] rounded-[3px] p-3 shadow-2xs">
          <div className="flex items-center justify-between text-[#5E6C84] text-[11px] font-medium">
            <span>Active Contributors</span>
            <Users className="w-3.5 h-3.5 text-[#FF8B00]" />
          </div>
          <div className="text-xl font-bold text-[#172B4D] mt-1">{stats.activeContributors}</div>
          <div className="text-[10px] text-[#5E6C84] mt-0.5">Teammates logged activity</div>
        </div>
      </div>

      {/* 3. Jira Filter Toolbar */}
      <div className="bg-[#FAFBFC] border border-[#DFE1E6] rounded-[3px] p-3 space-y-3">
        {/* Quick Action Category Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs border-b border-[#DFE1E6]/80">
          <span className="text-[11px] font-bold text-[#5E6C84] uppercase tracking-wider mr-1 shrink-0">Filter:</span>
          
          <button
            onClick={() => handleCategoryChange('all')}
            className={`px-2.5 py-1 rounded-[3px] font-medium transition-colors cursor-pointer shrink-0 flex items-center gap-1.5 ${
              selectedCategory === 'all'
                ? 'bg-[#0052CC] text-white font-semibold shadow-2xs'
                : 'text-[#42526E] hover:bg-[#EBECF0] hover:text-[#172B4D]'
            }`}
          >
            <Activity className="w-3 h-3" />
            <span>All Updates</span>
          </button>

          <button
            onClick={() => handleCategoryChange('comment')}
            className={`px-2.5 py-1 rounded-[3px] font-medium transition-colors cursor-pointer shrink-0 flex items-center gap-1.5 ${
              selectedCategory === 'comment'
                ? 'bg-[#0052CC] text-white font-semibold shadow-2xs'
                : 'text-[#42526E] hover:bg-[#EBECF0] hover:text-[#172B4D]'
            }`}
          >
            <MessageSquare className="w-3 h-3" />
            <span>Comments</span>
          </button>

          <button
            onClick={() => handleCategoryChange('status_change')}
            className={`px-2.5 py-1 rounded-[3px] font-medium transition-colors cursor-pointer shrink-0 flex items-center gap-1.5 ${
              selectedCategory === 'status_change'
                ? 'bg-[#0052CC] text-white font-semibold shadow-2xs'
                : 'text-[#42526E] hover:bg-[#EBECF0] hover:text-[#172B4D]'
            }`}
          >
            <ArrowRightLeft className="w-3 h-3" />
            <span>Status Moves</span>
          </button>

          <button
            onClick={() => handleCategoryChange('assignment')}
            className={`px-2.5 py-1 rounded-[3px] font-medium transition-colors cursor-pointer shrink-0 flex items-center gap-1.5 ${
              selectedCategory === 'assignment'
                ? 'bg-[#0052CC] text-white font-semibold shadow-2xs'
                : 'text-[#42526E] hover:bg-[#EBECF0] hover:text-[#172B4D]'
            }`}
          >
            <UserCheck className="w-3 h-3" />
            <span>Assignments</span>
          </button>

          <button
            onClick={() => handleCategoryChange('blocked')}
            className={`px-2.5 py-1 rounded-[3px] font-medium transition-colors cursor-pointer shrink-0 flex items-center gap-1.5 ${
              selectedCategory === 'blocked'
                ? 'bg-[#0052CC] text-white font-semibold shadow-2xs'
                : 'text-[#42526E] hover:bg-[#EBECF0] hover:text-[#172B4D]'
            }`}
          >
            <ShieldAlert className="w-3 h-3" />
            <span>Blockers</span>
          </button>

          <button
            onClick={() => handleCategoryChange('created')}
            className={`px-2.5 py-1 rounded-[3px] font-medium transition-colors cursor-pointer shrink-0 flex items-center gap-1.5 ${
              selectedCategory === 'created'
                ? 'bg-[#0052CC] text-white font-semibold shadow-2xs'
                : 'text-[#42526E] hover:bg-[#EBECF0] hover:text-[#172B4D]'
            }`}
          >
            <PlusCircle className="w-3 h-3" />
            <span>New Issues</span>
          </button>
        </div>

        {/* Dropdowns & Search Bar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Project Filter */}
            <div className="flex items-center gap-1.5 bg-white border border-[#DFE1E6] rounded-[3px] px-2 py-1 shadow-2xs">
              <FolderKanban className="w-3.5 h-3.5 text-[#5E6C84]" />
              <select
                value={selectedProjectId}
                onChange={(e) => handleProjectChange(e.target.value)}
                className="bg-transparent text-xs text-[#172B4D] font-medium outline-none cursor-pointer pr-1"
              >
                <option value="all">All Projects ({projects.length})</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>
                    [{p.key}] {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Contributor Filter */}
            <div className="flex items-center gap-1.5 bg-white border border-[#DFE1E6] rounded-[3px] px-2 py-1 shadow-2xs">
              <Users className="w-3.5 h-3.5 text-[#5E6C84]" />
              <select
                value={selectedActorId}
                onChange={(e) => handleActorChange(e.target.value)}
                className="bg-transparent text-xs text-[#172B4D] font-medium outline-none cursor-pointer pr-1"
              >
                <option value="all">All Contributors</option>
                {members.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.full_name || m.email} {m.role === 'manager' ? '(Manager)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {(selectedCategory !== 'all' || selectedProjectId !== 'all' || selectedActorId !== 'all' || searchQuery) && (
              <button
                onClick={() => {
                  setSelectedCategory('all')
                  setSelectedProjectId('all')
                  setSelectedActorId('all')
                  setSearchQuery('')
                  fetchFilteredData('all', 'all', 'all', '')
                }}
                className="text-[11px] text-[#0052CC] hover:underline px-1 font-medium cursor-pointer"
              >
                Clear filters
              </button>
            )}
          </div>

          {/* Quick Search */}
          <form onSubmit={handleSearchSubmit} className="relative w-full md:w-64">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#5E6C84]" />
            <input
              type="text"
              placeholder="Search feed by key or text..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1 text-xs bg-white border border-[#DFE1E6] rounded-[3px] text-[#172B4D] placeholder-[#5E6C84] focus:outline-none focus:border-[#0052CC] focus:ring-1 focus:ring-[#0052CC]"
            />
          </form>
        </div>
      </div>

      {/* 4. Grouped Chronological Stream */}
      <div className="space-y-6">
        {groupedEvents.length === 0 ? (
          <div className="bg-white border border-[#DFE1E6] rounded-[4px] p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-[#FAFBFC] border border-[#DFE1E6] flex items-center justify-center mx-auto text-[#5E6C84]">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#172B4D]">No activity found</h3>
              <p className="text-xs text-[#5E6C84] max-w-sm mx-auto mt-1">
                No events match your current filter criteria. Try clearing some filters or searching for different keywords.
              </p>
            </div>
            <button
              onClick={() => {
                setSelectedCategory('all')
                setSelectedProjectId('all')
                setSelectedActorId('all')
                setSearchQuery('')
                fetchFilteredData('all', 'all', 'all', '')
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0052CC] text-white text-xs font-medium rounded-[3px] shadow-2xs hover:bg-[#0747A6] cursor-pointer"
            >
              Reset all filters
            </button>
          </div>
        ) : (
          groupedEvents.map(([dateGroup, groupItems]) => (
            <div key={dateGroup} className="space-y-3">
              {/* Date Group Heading */}
              <div className="flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-[#5E6C84]" />
                <h2 className="text-xs font-bold text-[#5E6C84] uppercase tracking-wider">{dateGroup}</h2>
                <div className="flex-1 h-px bg-[#DFE1E6]" />
                <span className="text-[11px] text-[#5E6C84] font-medium">{groupItems.length} updates</span>
              </div>

              {/* Event Cards */}
              <div className="space-y-2.5">
                {groupItems.map(item => {
                  const actorName = item.profiles?.full_name || item.profiles?.email || 'User'
                  const projectKey = item.tasks?.projects?.key || 'TASK'
                  const issueKey = item.tasks?.id ? `${projectKey}-${item.tasks.id.slice(0, 4).toUpperCase()}` : projectKey
                  const isComment = item.action_type === 'comment'
                  const isStatus = item.action_type === 'status_change'
                  const isBlocked = item.action_type === 'blocked_change' || item.action_type === 'added_blocker' || item.action_type === 'removed_blocker'
                  const isCreated = item.action_type === 'created'
                  const isAssignment = item.action_type === 'assignment' || item.action_type === 'unassignment'

                  return (
                    <div
                      key={item.id}
                      className="bg-white border border-[#DFE1E6] rounded-[4px] p-3.5 shadow-2xs hover:border-[#B3D4FF] hover:shadow-xs transition-all flex flex-col sm:flex-row gap-3.5 items-start"
                    >
                      {/* Actor Avatar */}
                      <div className="shrink-0 mt-0.5">
                        <BusyAvatar
                          name={item.profiles?.full_name}
                          email={item.profiles?.email}
                          size="md"
                        />
                      </div>

                      {/* Content details */}
                      <div className="flex-1 min-w-0 space-y-1.5 w-full">
                        {/* Top Line: Actor + Action verb + Target Issue + Project badge + Timestamp */}
                        <div className="flex flex-wrap items-center gap-1.5 text-xs">
                          <span className="font-bold text-[#172B4D]">{actorName}</span>
                          
                          {/* Action badge label */}
                          {isComment && (
                            <span className="text-[#5E6C84]">commented on</span>
                          )}
                          {isStatus && (
                            <span className="text-[#5E6C84]">transitioned</span>
                          )}
                          {isCreated && (
                            <span className="text-[#5E6C84]">created issue</span>
                          )}
                          {isBlocked && (
                            <span className="text-[#5E6C84]">updated blocker status on</span>
                          )}
                          {isAssignment && (
                            <span className="text-[#5E6C84]">updated assignment for</span>
                          )}
                          {!isComment && !isStatus && !isCreated && !isBlocked && !isAssignment && (
                            <span className="text-[#5E6C84]">updated details on</span>
                          )}

                          {/* Clickable Issue Key */}
                          {item.tasks && (
                            <button
                              onClick={() => setSelectedTaskId(item.task_id)}
                              className="font-mono font-semibold text-[#0052CC] hover:underline flex items-center gap-1 cursor-pointer bg-[#DEEBFF]/40 px-1 py-0.5 rounded border border-[#B3D4FF]/60"
                              title="Click to view issue details"
                            >
                              <BusyIssueTypeIcon type="task" size={13} />
                              <span>{issueKey}</span>
                            </button>
                          )}

                          {/* Task Title */}
                          {item.tasks && (
                            <button
                              onClick={() => setSelectedTaskId(item.task_id)}
                              className="font-medium text-[#172B4D] hover:text-[#0052CC] hover:underline truncate max-w-xs cursor-pointer text-left"
                            >
                              {item.tasks.title}
                            </button>
                          )}

                          {/* Project Tag */}
                          {item.tasks?.projects && (
                            <span className="text-[10px] font-semibold text-[#42526E] bg-[#EBECF0] px-1.5 py-0.5 rounded flex items-center gap-1">
                              <FolderKanban className="w-2.5 h-2.5 text-[#5E6C84]" />
                              <span>{item.tasks.projects.name}</span>
                            </span>
                          )}

                          {/* Timestamp */}
                          <span
                            suppressHydrationWarning
                            className="text-[11px] text-[#5E6C84] ml-auto shrink-0"
                            title={new Date(item.created_at).toLocaleString()}
                          >
                            {formatDateTime(item.created_at)}
                          </span>
                        </div>

                        {/* Action Details Body */}
                        {isComment ? (
                          <div className="p-2.5 bg-[#FAFBFC] border border-[#DFE1E6] rounded-[3px] text-xs text-[#172B4D] leading-relaxed">
                            <CommentRenderer
                              content={item.new_value || ''}
                              currentUserId={currentUserId}
                              members={members}
                            />
                          </div>
                        ) : isStatus ? (
                          <div className="flex items-center gap-2 text-xs py-0.5">
                            <span className="text-[#5E6C84] text-[11px]">Changed status from</span>
                            <BusyLozenge status={(item.old_value as TaskStatus) || 'Backlog'} size="sm" />
                            <ArrowRight className="w-3 h-3 text-[#5E6C84]" />
                            <BusyLozenge status={(item.new_value as TaskStatus) || 'In Progress'} size="sm" />
                          </div>
                        ) : isBlocked ? (
                          <div className="flex items-center gap-1.5 text-xs py-0.5">
                            <BusyLozenge status="Blocked" isBlocked={true} size="sm" />
                            <span className="text-[#DE350B] font-medium text-xs">
                              {item.new_value === 'true'
                                ? 'Issue marked as BLOCKED by dependencies'
                                : item.new_value === 'false'
                                ? 'Issue was unblocked'
                                : item.new_value || 'Dependency updated'}
                            </span>
                          </div>
                        ) : isCreated ? (
                          <div className="flex items-center gap-2 text-xs text-[#5E6C84] py-0.5">
                            <span className="text-[11px]">Priority:</span>
                            <BusyPriorityIcon priority={(item.tasks?.priority as TaskPriority) || 'Medium'} />
                            <span className="font-semibold text-[#172B4D] text-xs">{item.tasks?.priority}</span>
                          </div>
                        ) : isAssignment ? (
                          <div className="text-xs text-[#5E6C84] py-0.5 flex items-center gap-1.5">
                            <UserCheck className="w-3.5 h-3.5 text-[#00875A]" />
                            <span>{item.action_type === 'assignment' ? 'Assigned teammate to issue' : 'Removed assignee from issue'}</span>
                          </div>
                        ) : (
                          <div className="text-xs text-[#5E6C84] py-0.5">
                            <span className="text-[11px] font-mono text-[#172B4D] bg-[#EBECF0] px-1 py-0.5 rounded">{item.action_type}</span>
                            {item.new_value && <span className="ml-1.5">: {item.new_value}</span>}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* 5. Pagination / Load More */}
      {hasMore && (
        <div className="text-center pt-4">
          <button
            onClick={handleLoadMore}
            disabled={loadingMore}
            className="px-4 py-2 text-xs font-semibold text-[#0052CC] bg-white border border-[#B3D4FF] hover:bg-[#DEEBFF]/50 rounded-[3px] shadow-2xs transition-colors cursor-pointer disabled:opacity-50 inline-flex items-center gap-2"
          >
            {loadingMore ? (
              <>
                <RotateCw className="w-3.5 h-3.5 animate-spin" />
                <span>Loading more activity...</span>
              </>
            ) : (
              <span>Load earlier activity</span>
            )}
          </button>
        </div>
      )}

      {/* 6. Interactive Task Detail Modal */}
      {selectedTaskId && (
        <TaskDetailModal
          taskId={selectedTaskId}
          onClose={() => setSelectedTaskId(null)}
          onTaskUpdated={() => {
            fetchFilteredData()
          }}
        />
      )}
    </div>
  )
}
