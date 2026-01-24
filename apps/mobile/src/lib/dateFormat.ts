import { format } from 'date-fns'
import { enUS, ko } from 'date-fns/locale'
import { formatInTimeZone } from 'date-fns-tz'

type SupportedLanguage = 'en' | 'ko'

function normalizeLanguage(language: string | undefined): SupportedLanguage {
  return language === 'ko' ? 'ko' : 'en'
}

function getDateFnsLocale(language: SupportedLanguage) {
  return language === 'ko' ? ko : enUS
}

function toDate(value: Date | string | number): Date | null {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export interface DateFormatOptions {
  language: string
  timeZone: string
}

export function formatShortDate(
  value: Date | string | number,
  { language, timeZone }: DateFormatOptions
): string {
  const date = toDate(value)
  if (!date) return ''

  const lang = normalizeLanguage(language)
  const locale = getDateFnsLocale(lang)
  const pattern = lang === 'ko' ? 'M월 d일' : 'MMM d'

  return formatInTimeZone(date, timeZone, pattern, { locale })
}

export function formatMonthDay(
  value: Date | string | number,
  { language, timeZone }: DateFormatOptions
): string {
  const date = toDate(value)
  if (!date) return ''

  const lang = normalizeLanguage(language)
  const locale = getDateFnsLocale(lang)
  const pattern = lang === 'ko' ? 'M월 d일' : 'MMMM d'

  return formatInTimeZone(date, timeZone, pattern, { locale })
}

export function formatFullDate(
  value: Date | string | number,
  { language, timeZone }: DateFormatOptions
): string {
  const date = toDate(value)
  if (!date) return ''

  const lang = normalizeLanguage(language)
  const locale = getDateFnsLocale(lang)
  const pattern = lang === 'ko' ? 'yyyy년 M월 d일' : 'MMM d, yyyy'

  return formatInTimeZone(date, timeZone, pattern, { locale })
}

export function formatDateTime(
  value: Date | string | number,
  { language, timeZone }: DateFormatOptions
): string {
  const date = toDate(value)
  if (!date) return ''

  const lang = normalizeLanguage(language)
  const locale = getDateFnsLocale(lang)
  const pattern = lang === 'ko' ? 'yyyy년 M월 d일 HH:mm' : 'MMM d, yyyy HH:mm'

  return formatInTimeZone(date, timeZone, pattern, { locale })
}

export function formatDateRange(
  start: Date | string | number,
  end: Date | string | number,
  options: DateFormatOptions
): string {
  const startDate = toDate(start)
  const endDate = toDate(end)
  if (!startDate || !endDate) return ''

  const left = formatShortDate(startDate, options)
  const right = formatShortDate(endDate, options)
  const separator = normalizeLanguage(options.language) === 'ko' ? ' ~ ' : ' – '
  return `${left}${separator}${right}`
}

export function formatZonedISODate(
  value: Date | string | number,
  timeZone: string
): string {
  const date = toDate(value)
  if (!date) return ''
  return formatInTimeZone(date, timeZone, 'yyyy-MM-dd')
}

export function addDaysZoned(
  value: Date | string | number,
  days: number,
  timeZone: string
): Date | null {
  const date = toDate(value)
  if (!date) return null
  const iso = formatZonedISODate(date, timeZone)
  if (!iso) return null
  const base = new Date(`${iso}T12:00:00`)
  return new Date(base.getTime() + days * 24 * 60 * 60 * 1000)
}

export function formatZonedWeekday(
  value: Date | string | number,
  { language, timeZone }: DateFormatOptions
): string {
  const date = toDate(value)
  if (!date) return ''
  const lang = normalizeLanguage(language)
  const locale = getDateFnsLocale(lang)
  const pattern = lang === 'ko' ? 'EEE' : 'EEE'
  return formatInTimeZone(date, timeZone, pattern, { locale })
}

export function formatMonthLabel(
  value: Date | string | number,
  { language, timeZone }: DateFormatOptions
): string {
  const date = toDate(value)
  if (!date) return ''
  const lang = normalizeLanguage(language)
  const locale = getDateFnsLocale(lang)
  const pattern = lang === 'ko' ? 'yyyy년 M월' : 'MMM yyyy'
  return formatInTimeZone(date, timeZone, pattern, { locale })
}

export function formatDayKeyForTimezone(value: Date | string | number, timeZone: string): string {
  const date = toDate(value)
  if (!date) return ''
  return formatInTimeZone(date, timeZone, 'yyyy-MM-dd')
}

export function formatDayLabel(
  value: Date | string | number,
  { language, timeZone }: DateFormatOptions
): string {
  const date = toDate(value)
  if (!date) return ''
  const lang = normalizeLanguage(language)
  const locale = getDateFnsLocale(lang)
  const pattern = lang === 'ko' ? 'M월 d일 (EEE)' : 'MMM d (EEE)'
  return formatInTimeZone(date, timeZone, pattern, { locale })
}

export function formatRelativeWeekStartLabel(
  date: Date | string | number,
  options: DateFormatOptions
): string {
  const parsed = toDate(date)
  if (!parsed) return ''
  const lang = normalizeLanguage(options.language)
  const locale = getDateFnsLocale(lang)
  const pattern = lang === 'ko' ? 'M월 d일 (EEE)' : 'MMM d (EEE)'
  return formatInTimeZone(parsed, options.timeZone, pattern, { locale })
}

export function formatNumericDate(
  value: Date | string | number,
  { language, timeZone }: DateFormatOptions
): string {
  const date = toDate(value)
  if (!date) return ''
  const lang = normalizeLanguage(language)
  const locale = getDateFnsLocale(lang)
  const pattern = lang === 'ko' ? 'yyyy.MM.dd' : 'MM/dd/yyyy'
  return formatInTimeZone(date, timeZone, pattern, { locale })
}

export function formatNumericDateTime(
  value: Date | string | number,
  { language, timeZone }: DateFormatOptions
): string {
  const date = toDate(value)
  if (!date) return ''
  const lang = normalizeLanguage(language)
  const locale = getDateFnsLocale(lang)
  const pattern = lang === 'ko' ? 'yyyy.MM.dd HH:mm' : 'MM/dd/yyyy HH:mm'
  return formatInTimeZone(date, timeZone, pattern, { locale })
}

export function formatYearlessShortDate(
  value: Date | string | number,
  { language, timeZone }: DateFormatOptions
): string {
  return formatShortDate(value, { language, timeZone })
}

export function formatTime(
  value: Date | string | number,
  { language, timeZone }: DateFormatOptions
): string {
  const date = toDate(value)
  if (!date) return ''
  const lang = normalizeLanguage(language)
  const locale = getDateFnsLocale(lang)
  const pattern = lang === 'ko' ? 'HH:mm' : 'h:mm a'
  return formatInTimeZone(date, timeZone, pattern, { locale })
}

export function formatDayOfMonth(
  value: Date | string | number,
  timeZone: string
): string {
  const date = toDate(value)
  if (!date) return ''
  return formatInTimeZone(date, timeZone, 'd')
}

export function formatDebug(date: Date | string | number, timeZone: string): string {
  const parsed = toDate(date)
  if (!parsed) return ''
  return `${format(parsed, 'yyyy-MM-dd HH:mm:ss')} (tz:${timeZone})`
}
