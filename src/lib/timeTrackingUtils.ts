/**
 * Time Tracking Utilities
 * Supports Atlassian Jira time conventions:
 * 1w = 5d = 40h
 * 1d = 8h = 480m
 * 1h = 60m = 3600s
 * 1m = 60s
 */

export interface WorklogRecord {
  id: string
  task_id: string
  actor_id: string
  actor_name?: string
  actor_email?: string
  time_spent_seconds: number
  time_spent_formatted: string
  started_at: string
  description?: string
  remaining_seconds?: number
  remaining_formatted?: string
  created_at: string
}

export interface TimeTrackingSummary {
  originalEstimateSeconds: number
  originalEstimateFormatted: string
  totalLoggedSeconds: number
  totalLoggedFormatted: string
  remainingSeconds: number
  remainingFormatted: string
  percentSpent: number
  isOverEstimate: boolean
  hasTrackingData: boolean
  worklogs: WorklogRecord[]
}

const SECONDS_PER_MINUTE = 60
const SECONDS_PER_HOUR = 60 * SECONDS_PER_MINUTE
const SECONDS_PER_DAY = 8 * SECONDS_PER_HOUR       // 8h workday
const SECONDS_PER_WEEK = 5 * SECONDS_PER_DAY      // 5d workweek = 40h

/**
 * Parse human time notation string (e.g. "2w 3d 4h 30m", "1d 2h", "45m", "1.5h", "8")
 * into total seconds. Returns null if invalid.
 */
export function parseTimeToSeconds(input: string): number | null {
  if (!input || !input.trim()) return null
  const cleaned = input.trim().toLowerCase()

  // Pure number defaults to hours (e.g., "4" -> 4h, "1.5" -> 1.5h)
  if (/^\d+(\.\d+)?$/.test(cleaned)) {
    const hours = parseFloat(cleaned)
    return Math.round(hours * SECONDS_PER_HOUR)
  }

  // Regex to match components: w/weeks, d/days, h/hours, m/minutes
  // Supports e.g. "1w", "2d", "3h", "30m", "1.5h", "0.5d"
  const tokens = cleaned.match(/(\d+(?:\.\d+)?)\s*([wdhm]|weeks?|days?|hours?|hrs?|minutes?|mins?)/g)
  if (!tokens || tokens.length === 0) return null

  let totalSeconds = 0
  let matchedAny = false

  for (const token of tokens) {
    const match = token.match(/^(\d+(?:\.\d+)?)\s*([a-z]+)$/)
    if (!match) continue

    const val = parseFloat(match[1])
    const unit = match[2]

    if (unit.startsWith('w')) {
      totalSeconds += val * SECONDS_PER_WEEK
      matchedAny = true
    } else if (unit.startsWith('d')) {
      totalSeconds += val * SECONDS_PER_DAY
      matchedAny = true
    } else if (unit.startsWith('h')) {
      totalSeconds += val * SECONDS_PER_HOUR
      matchedAny = true
    } else if (unit.startsWith('m')) {
      totalSeconds += val * SECONDS_PER_MINUTE
      matchedAny = true
    }
  }

  return matchedAny ? Math.round(totalSeconds) : null
}

/**
 * Format total seconds into Jira-style shorthand string (e.g. "1w 2d 4h 30m" or "2h 15m")
 */
export function formatSecondsToTime(seconds: number): string {
  if (!seconds || seconds <= 0) return '0m'

  let remaining = Math.round(seconds)
  const weeks = Math.floor(remaining / SECONDS_PER_WEEK)
  remaining %= SECONDS_PER_WEEK

  const days = Math.floor(remaining / SECONDS_PER_DAY)
  remaining %= SECONDS_PER_DAY

  const hours = Math.floor(remaining / SECONDS_PER_HOUR)
  remaining %= SECONDS_PER_HOUR

  const minutes = Math.floor(remaining / SECONDS_PER_MINUTE)

  const parts: string[] = []
  if (weeks > 0) parts.push(`${weeks}w`)
  if (days > 0) parts.push(`${days}d`)
  if (hours > 0) parts.push(`${hours}h`)
  if (minutes > 0) parts.push(`${minutes}m`)

  return parts.length > 0 ? parts.join(' ') : '0m'
}

/**
 * Describe parsed seconds in long-form English for realtime input preview (e.g. "2 hours 30 minutes")
 */
export function describeSeconds(seconds: number): string {
  if (!seconds || seconds <= 0) return '0 minutes'

  let remaining = Math.round(seconds)
  const weeks = Math.floor(remaining / SECONDS_PER_WEEK)
  remaining %= SECONDS_PER_WEEK

  const days = Math.floor(remaining / SECONDS_PER_DAY)
  remaining %= SECONDS_PER_DAY

  const hours = Math.floor(remaining / SECONDS_PER_HOUR)
  remaining %= SECONDS_PER_HOUR

  const minutes = Math.floor(remaining / SECONDS_PER_MINUTE)

  const parts: string[] = []
  if (weeks > 0) parts.push(`${weeks} ${weeks === 1 ? 'week' : 'weeks'}`)
  if (days > 0) parts.push(`${days} ${days === 1 ? 'day' : 'days'}`)
  if (hours > 0) parts.push(`${hours} ${hours === 1 ? 'hour' : 'hours'}`)
  if (minutes > 0) parts.push(`${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`)

  return parts.join(' ')
}

/**
 * Calculate full TimeTrackingSummary from task history items.
 * Uses event sourcing: scans for estimate_updated and worklog events.
 */
export function getTimeTrackingSummary(historyItems: any[] = []): TimeTrackingSummary {
  let originalEstimateSeconds = 0
  let explicitRemainingSeconds: number | null = null
  let totalLoggedSeconds = 0
  const worklogs: WorklogRecord[] = []

  // Items are usually in descending order of created_at
  // Process in chronological order (ascending) to reconstruct state correctly
  const sorted = [...historyItems].sort((a, b) => {
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  })

  for (const h of sorted) {
    if (h.action_type === 'estimate_updated') {
      try {
        const parsed = typeof h.new_value === 'string' && h.new_value.startsWith('{')
          ? JSON.parse(h.new_value)
          : null
        if (parsed?.estimateSeconds !== undefined) {
          originalEstimateSeconds = Number(parsed.estimateSeconds) || 0
        } else if (typeof h.new_value === 'string') {
          // Fallback if raw text
          const s = parseTimeToSeconds(h.new_value)
          if (s !== null) originalEstimateSeconds = s
        }
      } catch (e) {
        // ignore parse errors
      }
    } else if (h.action_type === 'worklog') {
      try {
        const payload = typeof h.new_value === 'string' && h.new_value.startsWith('{')
          ? JSON.parse(h.new_value)
          : null

        if (payload) {
          const spent = Number(payload.timeSpentSeconds) || 0
          totalLoggedSeconds += spent

          if (payload.remainingSeconds !== undefined && payload.remainingSeconds !== null) {
            explicitRemainingSeconds = Number(payload.remainingSeconds)
          }

          const authorName = h.profiles?.full_name || h.profiles?.email || 'Teammate'

          worklogs.unshift({
            id: h.id,
            task_id: h.task_id,
            actor_id: h.actor_id,
            actor_name: authorName,
            actor_email: h.profiles?.email,
            time_spent_seconds: spent,
            time_spent_formatted: payload.timeSpentFormatted || formatSecondsToTime(spent),
            started_at: payload.startedAt || h.created_at,
            description: payload.description || '',
            remaining_seconds: payload.remainingSeconds,
            remaining_formatted: payload.remainingFormatted,
            created_at: h.created_at
          })
        }
      } catch (e) {
        // ignore parse errors
      }
    }
  }

  // Determine remaining:
  // If explicit remaining was set in last worklog, use that.
  // Otherwise default to Math.max(0, originalEstimate - totalLogged).
  let remainingSeconds = 0
  if (explicitRemainingSeconds !== null) {
    remainingSeconds = Math.max(0, explicitRemainingSeconds)
  } else if (originalEstimateSeconds > 0) {
    remainingSeconds = Math.max(0, originalEstimateSeconds - totalLoggedSeconds)
  }

  const baseForPercent = originalEstimateSeconds > 0 ? originalEstimateSeconds : totalLoggedSeconds
  const percentSpent = baseForPercent > 0 
    ? Math.min(100, Math.round((totalLoggedSeconds / baseForPercent) * 100))
    : 0

  const isOverEstimate = originalEstimateSeconds > 0 && totalLoggedSeconds > originalEstimateSeconds
  const hasTrackingData = originalEstimateSeconds > 0 || totalLoggedSeconds > 0

  return {
    originalEstimateSeconds,
    originalEstimateFormatted: formatSecondsToTime(originalEstimateSeconds),
    totalLoggedSeconds,
    totalLoggedFormatted: formatSecondsToTime(totalLoggedSeconds),
    remainingSeconds,
    remainingFormatted: formatSecondsToTime(remainingSeconds),
    percentSpent,
    isOverEstimate,
    hasTrackingData,
    worklogs
  }
}
