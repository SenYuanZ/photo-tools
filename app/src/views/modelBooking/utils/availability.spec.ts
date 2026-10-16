import { describe, expect, it } from 'vitest'
import { availableStarts, fitsRange, freeRangesFromBusy } from './availability'

describe('booking continuous availability', () => {
  it('clips and merges unordered, overlapping or adjacent occupied ranges', () => {
    expect(
      freeRangesFromBusy([
        { startTime: '10:20', endTime: '11:00' },
        { startTime: '06:00', endTime: '07:10' },
        { startTime: '10:00', endTime: '10:30' },
        { startTime: '11:00', endTime: '11:40' },
        { startTime: '21:30', endTime: '23:00' },
      ]),
    ).toEqual([
      { startTime: '07:10', endTime: '10:00' },
      { startTime: '11:40', endTime: '21:30' },
    ])
  })
  it('uses exact busy times instead of assuming half-hour availability', () => {
    const free = freeRangesFromBusy([{ startTime: '07:05', endTime: '07:35' }])
    expect(availableStarts(free, 10)[0]).toBe('07:40')
    expect(fitsRange(free, '07:00', 10)).toBe(false)
  })
  it('fits the full duration into one continuous range', () => {
    const free = freeRangesFromBusy([{ startTime: '11:00', endTime: '16:00' }])
    expect(availableStarts(free, 300)[0]).toBe('16:00')
    expect(availableStarts(free, 420)).toEqual([])
  })
  it('accepts an end exactly at closing time and rejects crossing it', () => {
    const free = freeRangesFromBusy([])
    expect(fitsRange(free, '21:50', 10)).toBe(true)
    expect(fitsRange(free, '21:50', 30)).toBe(false)
    expect(fitsRange(free, '06:50', 30)).toBe(false)
    expect(availableStarts(free, 10).at(-1)).toBe('21:50')
  })
  it('returns no availability on a fully occupied day', () => {
    expect(freeRangesFromBusy([{ startTime: '00:00', endTime: '24:00' }])).toEqual([])
  })
})
