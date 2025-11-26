import { toZonedTime, fromZonedTime } from 'date-fns-tz'
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
  const startUTC = fromZonedTime(startDate, timezone)
  const endUTC = fromZonedTime(endDate, timezone)

  return {
    start: startUTC.toISOString(),
    end: endUTC.toISOString()
  }
}

/**
 * Convert UTC timestamp to user's local date string (YYYY-MM-DD)
 *
 * @param utcTimestamp - ISO timestamp in UTC
 * @param timezone - User's timezone (default: Asia/Seoul)
 * @returns Date string in YYYY-MM-DD format
 */
export function utcToUserDate(
  utcTimestamp: string,
  timezone: string = DEFAULT_TIMEZONE
): string {
  const date = new Date(utcTimestamp)
  const zonedDate = toZonedTime(date, timezone)

  const year = zonedDate.getFullYear()
  const month = String(zonedDate.getMonth() + 1).padStart(2, '0')
  const day = String(zonedDate.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

/**
 * Get today's date string in user's timezone (YYYY-MM-DD)
 *
 * @param timezone - User's timezone (default: Asia/Seoul)
 * @returns Today's date in YYYY-MM-DD format
 */
export function getUserToday(timezone: string = DEFAULT_TIMEZONE): string {
  const now = new Date()
  const zonedNow = toZonedTime(now, timezone)

  const year = zonedNow.getFullYear()
  const month = String(zonedNow.getMonth() + 1).padStart(2, '0')
  const day = String(zonedNow.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

/**
 * Format UTC timestamp for display in user's timezone
 *
 * @param utcTimestamp - ISO timestamp in UTC
 * @param timezone - User's timezone (default: Asia/Seoul)
 * @returns Object with formatted date and time strings
 */
export function formatUserDateTime(
  utcTimestamp: string,
  timezone: string = DEFAULT_TIMEZONE
): { date: string; time: string } {
  const date = new Date(utcTimestamp)
  const zonedDate = toZonedTime(date, timezone)

  // Format date as YYYY.MM.DD
  const dateStr = format(zonedDate, 'yyyy.MM.dd')

  // Format time as 오전/오후 HH:MM
  const hours = zonedDate.getHours()
  const minutes = String(zonedDate.getMinutes()).padStart(2, '0')
  const period = hours < 12 ? '오전' : '오후'
  const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours
  const timeStr = `${period} ${String(displayHours).padStart(2, '0')}:${minutes}`

  return { date: dateStr, time: timeStr }
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
 * Convert user's local date + time to UTC for database insertion
 *
 * @param dateString - Date in YYYY-MM-DD format
 * @param hours - Hour (0-23)
 * @param minutes - Minute (0-59)
 * @param seconds - Second (0-59)
 * @param timezone - User's timezone (default: Asia/Seoul)
 * @returns UTC timestamp in ISO format
 */
export function userDateTimeToUTC(
  dateString: string,
  hours: number = 0,
  minutes: number = 0,
  seconds: number = 0,
  timezone: string = DEFAULT_TIMEZONE
): string {
  const [year, month, day] = dateString.split('-').map(Number)
  const localDate = new Date(year, month - 1, day, hours, minutes, seconds, 0)
  const utcDate = fromZonedTime(localDate, timezone)

  return utcDate.toISOString()
}
