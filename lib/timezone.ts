export const COMMON_TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'America/Anchorage', label: 'Alaska Time (AKT)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time (HT)' },
  { value: 'Europe/London', label: 'London (GMT/BST)' },
  { value: 'Europe/Paris', label: 'Paris (CET/CEST)' },
  { value: 'Europe/Berlin', label: 'Berlin (CET/CEST)' },
  { value: 'Europe/Madrid', label: 'Madrid (CET/CEST)' },
  { value: 'Europe/Rome', label: 'Rome (CET/CEST)' },
  { value: 'Europe/Amsterdam', label: 'Amsterdam (CET/CEST)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { value: 'Asia/Shanghai', label: 'Shanghai (CST)' },
  { value: 'Asia/Hong_Kong', label: 'Hong Kong (HKT)' },
  { value: 'Asia/Singapore', label: 'Singapore (SGT)' },
  { value: 'Asia/Seoul', label: 'Seoul (KST)' },
  { value: 'Asia/Dubai', label: 'Dubai (GST)' },
  { value: 'Asia/Kolkata', label: 'India (IST)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST/AEDT)' },
  { value: 'Australia/Melbourne', label: 'Melbourne (AEST/AEDT)' },
  { value: 'Pacific/Auckland', label: 'Auckland (NZST/NZDT)' },
  { value: 'America/Sao_Paulo', label: 'São Paulo (BRT)' },
  { value: 'America/Mexico_City', label: 'Mexico City (CST)' },
  { value: 'UTC', label: 'UTC' },
]

export function getUserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone
  } catch {
    return 'UTC'
  }
}

function isValidTimezone(tz: string): boolean {
  if (!tz || typeof tz !== 'string') return false
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz })
    return true
  } catch {
    return false
  }
}

export function formatTimeInTimezone(
  date: Date | string,
  timezone: string,
  options?: Intl.DateTimeFormatOptions
): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const safeTimezone = isValidTimezone(timezone) ? timezone : 'UTC'
  return d.toLocaleString('en-US', {
    timeZone: safeTimezone,
    ...options,
  })
}

export function formatDateForDisplay(
  date: Date | string,
  timezone: string
): string {
  return formatTimeInTimezone(date, timezone, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

export function formatTimeForDisplay(
  date: Date | string,
  timezone: string
): string {
  return formatTimeInTimezone(date, timezone, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

export function formatTimeRangeForDisplay(
  startDate: Date | string,
  durationMinutes: number,
  timezone: string
): string {
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate
  const end = new Date(start.getTime() + durationMinutes * 60 * 1000)
  
  const startStr = formatTimeInTimezone(start, timezone, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
  
  const endStr = formatTimeInTimezone(end, timezone, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
  
  return `${startStr} - ${endStr}`
}

export function getTimezoneOffset(timezone: string): string {
  const safeTimezone = isValidTimezone(timezone) ? timezone : 'UTC'
  const now = new Date()
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: safeTimezone,
    timeZoneName: 'shortOffset',
  })
  const parts = formatter.formatToParts(now)
  const offsetPart = parts.find(p => p.type === 'timeZoneName')
  return offsetPart?.value || ''
}
