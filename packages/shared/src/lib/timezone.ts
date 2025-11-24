import { utcToZonedTime, zonedTimeToUtc } from 'date-fns-tz'
import { format } from 'date-fns'

/**
 * Default timezone for the application
 */
export const DEFAULT_TIMEZONE = 'Asia/Seoul'

/**
 * Get UTC boundaries for a given date string in the user's timezone
 *
 * Example: '2025-11-12' in Asia/Seoul
 * - Start: 2025-11-12 00:00:00 KST → 2025-11-11 15:00:00 UTC
 * - End: 2025-11-13 00:00:00 KST → 2025-11-12 15:00:00 UTC
 *
 * @param dateString - Date in YYYY-MM-DD format
 * @param timezone - User's timezone (default: Asia/Seoul)
 * @returns Object with start and end UTC timestamps in ISO format
 */
export function getDayBoundsUTC(
  dateString: string,
  timezone: string = DEFAULT_TIMEZONE
): { start: string; end: string } {
  // Parse date string as YYYY-MM-DD
  const [year, month, day] = dateString.split('-').map(Number)

  // Create date at midnight in user's timezone
  const startDate = new Date(year, month - 1, day, 0, 0, 0, 0)
  const endDate = new Date(year, month - 1, day + 1, 0, 0, 0, 0)

  // Convert to UTC timestamps
  const startUTC = zonedTimeToUtc(startDate, timezone)
  const endUTC = zonedTimeToUtc(endDate, timezone)

  return {
    start: startUTC.toISOString(),
    end: endUTC.toISOString()
  }
}

/**
 * Get current UTC timestamp for database insertion
 * This ensures the timestamp is always in UTC regardless of system timezone
 *
 * @returns Current UTC timestamp in ISO format
 */
export function getCurrentUTC(): string {
  return new Date().toISOString()
}

/**
 * Get today's date string in user's timezone (YYYY-MM-DD)
 *
 * @param timezone - User's timezone (default: Asia/Seoul)
 * @returns Today's date in YYYY-MM-DD format
 */
export function getUserToday(timezone: string = DEFAULT_TIMEZONE): string {
  const now = new Date()
  const zonedNow = utcToZonedTime(now, timezone)

  const year = zonedNow.getFullYear()
  const month = String(zonedNow.getMonth() + 1).padStart(2, '0')
  const day = String(zonedNow.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

/**
 * Format date to YYYY-MM-DD
 */
export function formatDateString(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
