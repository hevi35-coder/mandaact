/**
 * Timezone utility functions test
 * Tests boundary cases for UTC timezone handling
 */

import { getDayBoundsUTC, utcToUserDate, getUserToday, formatUserDateTime, getCurrentUTC, userDateTimeToUTC } from '../timezone'

describe('timezone utilities', () => {
  describe('getDayBoundsUTC', () => {
    it('should convert 2025-11-12 in Asia/Seoul to correct UTC bounds', () => {
      const { start, end } = getDayBoundsUTC('2025-11-12', 'Asia/Seoul')

      // 2025-11-12 00:00:00 KST (UTC+9) = 2025-11-11 15:00:00 UTC
      // 2025-11-13 00:00:00 KST (UTC+9) = 2025-11-12 15:00:00 UTC

      const startDate = new Date(start)
      const endDate = new Date(end)

      console.log('Start:', start, '→', startDate.toISOString())
      console.log('End:', end, '→', endDate.toISOString())

      // Verify dates are correct
      expect(startDate.getUTCDate()).toBe(11)
      expect(startDate.getUTCHours()).toBe(15)
      expect(endDate.getUTCDate()).toBe(12)
      expect(endDate.getUTCHours()).toBe(15)
    })

    it('should handle date at midnight boundary (00:00)', () => {
      const { start, end } = getDayBoundsUTC('2025-11-12', 'Asia/Seoul')

      // Check that a UTC timestamp just before midnight KST (14:59 UTC) falls before start
      const beforeMidnight = new Date('2025-11-11T14:59:59.999Z')
      const startDate = new Date(start)
      expect(beforeMidnight.getTime()).toBeLessThan(startDate.getTime())

      // Check that a UTC timestamp at midnight KST (15:00 UTC) equals start
      const atMidnight = new Date('2025-11-11T15:00:00.000Z')
      expect(atMidnight.getTime()).toEqual(startDate.getTime())
    })

    it('should handle date at end of day boundary (23:59)', () => {
      const { start, end } = getDayBoundsUTC('2025-11-12', 'Asia/Seoul')

      // Check that a UTC timestamp just before next midnight (14:59 UTC) falls before end
      const beforeEndOfDay = new Date('2025-11-12T14:59:59.999Z')
      const endDate = new Date(end)
      expect(beforeEndOfDay.getTime()).toBeLessThan(endDate.getTime())

      // Check that a UTC timestamp at next midnight (15:00 UTC) equals end
      const atEndOfDay = new Date('2025-11-12T15:00:00.000Z')
      expect(atEndOfDay.getTime()).toEqual(endDate.getTime())
    })
  })

  describe('utcToUserDate', () => {
    it('should convert UTC timestamp to Asia/Seoul date', () => {
      // 2025-11-11 23:00:00 UTC = 2025-11-12 08:00:00 KST
      const dateStr = utcToUserDate('2025-11-11T23:00:00.000Z', 'Asia/Seoul')
      expect(dateStr).toBe('2025-11-12')
    })

    it('should handle midnight boundary correctly', () => {
      // 2025-11-11 14:59:59 UTC = 2025-11-11 23:59:59 KST (still Nov 11)
      const beforeMidnight = utcToUserDate('2025-11-11T14:59:59.999Z', 'Asia/Seoul')
      expect(beforeMidnight).toBe('2025-11-11')

      // 2025-11-11 15:00:00 UTC = 2025-11-12 00:00:00 KST (Nov 12)
      const atMidnight = utcToUserDate('2025-11-11T15:00:00.000Z', 'Asia/Seoul')
      expect(atMidnight).toBe('2025-11-12')
    })
  })

  describe('getUserToday', () => {
    it('should return today in Asia/Seoul timezone', () => {
      const today = getUserToday('Asia/Seoul')

      // Should be in YYYY-MM-DD format
      expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/)

      console.log('Today in Asia/Seoul:', today)
    })
  })

  describe('formatUserDateTime', () => {
    it('should format UTC timestamp for display in Asia/Seoul', () => {
      // 2025-11-11 16:51:00 UTC = 2025-11-12 01:51:00 KST
      const { date, time } = formatUserDateTime('2025-11-11T16:51:00.000Z', 'Asia/Seoul')

      expect(date).toBe('2025.11.12')
      expect(time).toBe('오전 01:51')
    })

    it('should handle PM times correctly', () => {
      // 2025-11-12 05:10:00 UTC = 2025-11-12 14:10:00 KST
      const { date, time } = formatUserDateTime('2025-11-12T05:10:00.000Z', 'Asia/Seoul')

      expect(date).toBe('2025.11.12')
      expect(time).toBe('오후 02:10')
    })

    it('should handle noon boundary correctly', () => {
      // 2025-11-12 02:59:59 UTC = 2025-11-12 11:59:59 KST (AM)
      const { time: beforeNoon } = formatUserDateTime('2025-11-12T02:59:59.999Z', 'Asia/Seoul')
      expect(beforeNoon).toBe('오전 11:59')

      // 2025-11-12 03:00:00 UTC = 2025-11-12 12:00:00 KST (PM)
      const { time: atNoon } = formatUserDateTime('2025-11-12T03:00:00.000Z', 'Asia/Seoul')
      expect(atNoon).toBe('오후 12:00')
    })
  })

  describe('getCurrentUTC', () => {
    it('should return current UTC timestamp', () => {
      const now = getCurrentUTC()

      // Should be in ISO format
      expect(now).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/)

      // Should be within 1 second of now
      const diff = Math.abs(new Date(now).getTime() - Date.now())
      expect(diff).toBeLessThan(1000)
    })
  })

  describe('userDateTimeToUTC', () => {
    it('should convert Asia/Seoul date-time to UTC', () => {
      // 2025-11-12 01:51:00 KST = 2025-11-11 16:51:00 UTC
      const utc = userDateTimeToUTC('2025-11-12', 1, 51, 0, 'Asia/Seoul')

      const date = new Date(utc)
      expect(date.getUTCFullYear()).toBe(2025)
      expect(date.getUTCMonth()).toBe(10) // November (0-indexed)
      expect(date.getUTCDate()).toBe(11)
      expect(date.getUTCHours()).toBe(16)
      expect(date.getUTCMinutes()).toBe(51)
    })

    it('should handle midnight correctly', () => {
      // 2025-11-12 00:00:00 KST = 2025-11-11 15:00:00 UTC
      const utc = userDateTimeToUTC('2025-11-12', 0, 0, 0, 'Asia/Seoul')

      const date = new Date(utc)
      expect(date.getUTCDate()).toBe(11)
      expect(date.getUTCHours()).toBe(15)
    })

    it('should handle 23:59:59 correctly', () => {
      // 2025-11-12 23:59:59 KST = 2025-11-12 14:59:59 UTC
      const utc = userDateTimeToUTC('2025-11-12', 23, 59, 59, 'Asia/Seoul')

      const date = new Date(utc)
      expect(date.getUTCDate()).toBe(12)
      expect(date.getUTCHours()).toBe(14)
      expect(date.getUTCMinutes()).toBe(59)
      expect(date.getUTCSeconds()).toBe(59)
    })
  })

  describe('boundary case integration tests', () => {
    it('should handle check at 00:00 KST correctly', () => {
      // User checks action at 2025-11-12 00:00:00 KST
      const checkTime = userDateTimeToUTC('2025-11-12', 0, 0, 0, 'Asia/Seoul')

      // Get day bounds for 2025-11-12
      const { start, end } = getDayBoundsUTC('2025-11-12', 'Asia/Seoul')

      // Check should fall within the bounds
      const checkDate = new Date(checkTime)
      const startDate = new Date(start)
      const endDate = new Date(end)

      expect(checkDate.getTime()).toBeGreaterThanOrEqual(startDate.getTime())
      expect(checkDate.getTime()).toBeLessThan(endDate.getTime())
    })

    it('should handle check at 23:59 KST correctly', () => {
      // User checks action at 2025-11-12 23:59:59 KST
      const checkTime = userDateTimeToUTC('2025-11-12', 23, 59, 59, 'Asia/Seoul')

      // Get day bounds for 2025-11-12
      const { start, end } = getDayBoundsUTC('2025-11-12', 'Asia/Seoul')

      // Check should fall within the bounds
      const checkDate = new Date(checkTime)
      const startDate = new Date(start)
      const endDate = new Date(end)

      expect(checkDate.getTime()).toBeGreaterThanOrEqual(startDate.getTime())
      expect(checkDate.getTime()).toBeLessThan(endDate.getTime())
    })

    it('should correctly identify UTC timestamp as Korean date', () => {
      // UTC timestamp during the 9-hour shift period
      const utcTimestamp = '2025-11-11T16:00:00.000Z' // 2025-11-12 01:00:00 KST

      const koreanDate = utcToUserDate(utcTimestamp, 'Asia/Seoul')
      expect(koreanDate).toBe('2025-11-12')

      // Verify this falls within Nov 12 bounds
      const { start, end } = getDayBoundsUTC('2025-11-12', 'Asia/Seoul')
      const timestamp = new Date(utcTimestamp)
      const startDate = new Date(start)
      const endDate = new Date(end)

      expect(timestamp.getTime()).toBeGreaterThanOrEqual(startDate.getTime())
      expect(timestamp.getTime()).toBeLessThan(endDate.getTime())
    })
  })
})
