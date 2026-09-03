const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/**
 * Format a date deterministically to avoid Next.js server/client hydration mismatches.
 * Formats as "Sep 17"
 */
export function formatShortDate(dateStr?: string | null): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return ''
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`
}

/**
 * Format a date deterministically as "Sep 17, 2026"
 */
export function formatFullDate(dateStr?: string | null): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return ''
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`
}

/**
 * Format a date and time deterministically as "Sep 4, 01:25 AM"
 */
export function formatDateTime(dateStr?: string | null): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return ''
  const hours = d.getUTCHours()
  const mins = d.getUTCMinutes().toString().padStart(2, '0')
  const ampm = hours >= 12 ? 'PM' : 'AM'
  const displayHours = (hours % 12 || 12).toString().padStart(2, '0')
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${displayHours}:${mins} ${ampm}`
}
