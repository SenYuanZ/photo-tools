import type { TimeRange } from '@/views/modelBooking/types'

export const BOOKING_START = 7 * 60
export const BOOKING_END = 22 * 60
export const START_STEP = 10
export const toMinutes = (time: string) => {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}
export const toTime = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`

export function freeRangesFromBusy(busy: TimeRange[]): TimeRange[] {
  const ranges = busy
    .map(
      (range) =>
        [
          Math.max(BOOKING_START, toMinutes(range.startTime)),
          Math.min(BOOKING_END, toMinutes(range.endTime)),
        ] as const,
    )
    .filter(([start, end]) => Number.isFinite(start) && Number.isFinite(end) && end > start)
    .sort((a, b) => a[0] - b[0])
  const result: TimeRange[] = []
  let cursor = BOOKING_START
  for (const [start, end] of ranges) {
    if (start > cursor) result.push({ startTime: toTime(cursor), endTime: toTime(start) })
    cursor = Math.max(cursor, end)
  }
  if (cursor < BOOKING_END) result.push({ startTime: toTime(cursor), endTime: toTime(BOOKING_END) })
  return result
}

export function fitsRange(ranges: TimeRange[], start: string, duration: number) {
  const value = toMinutes(start)
  return (
    !!start &&
    Number.isInteger(duration) &&
    duration > 0 &&
    ranges.some(
      (range) =>
        value >= toMinutes(range.startTime) && value + duration <= toMinutes(range.endTime),
    )
  )
}

export function availableStarts(ranges: TimeRange[], duration: number) {
  return Array.from({ length: (BOOKING_END - BOOKING_START) / START_STEP }, (_, index) =>
    toTime(BOOKING_START + index * START_STEP),
  ).filter((time) => fitsRange(ranges, time, duration))
}

export function durationLabel(minutes: number) {
  if (minutes < 60) return `${minutes} 分钟`
  return minutes % 60 === 0
    ? `${minutes / 60} 小时`
    : `${Math.floor(minutes / 60)} 小时 ${minutes % 60} 分钟`
}
