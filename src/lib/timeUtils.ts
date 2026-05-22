export function getRelativeTime(ms: number): string {
  const diff = Date.now() - ms
  const secs  = Math.floor(diff / 1000)
  const mins  = Math.floor(secs / 60)
  const hours = Math.floor(mins / 60)
  const days  = Math.floor(hours / 24)

  if (secs  <  45) return 'just now'
  if (secs  <  90) return '1 minute ago'
  if (mins  <  60) return `${mins} minutes ago`
  if (hours <   2) return '1 hour ago'
  if (hours <  24) return `${hours} hours ago`
  if (days  ===  1) return 'yesterday'
  return `${days} days ago`
}

// Returns "this hour", "6 minutes ago", "yesterday", etc.
export function getSmartTime(ms: number): string {
  const diff = Date.now() - ms
  const secs  = Math.floor(diff / 1000)
  const mins  = Math.floor(secs / 60)
  const hours = Math.floor(mins / 60)

  if (secs  <  30) return 'just now'
  if (mins  <   1) return `${secs} seconds ago`
  if (mins  <   2) return '1 minute ago'
  if (mins  <  60) return `${mins} minutes ago`
  if (hours <   1) return 'this hour'
  if (hours <   2) return '1 hour ago'
  if (hours <  24) return `${hours} hours ago`
  return getRelativeTime(ms)
}

// Simulated last-updated times per platform (offset from now)
export const PLATFORM_LAST_UPDATED: Record<string, number> = {
  AMZ: Date.now() - 1000 *  90,   // 1.5 min ago
  WMT: Date.now() - 1000 * 210,   // 3.5 min ago
  TGT: Date.now() - 1000 * 480,   // 8 min ago
}
