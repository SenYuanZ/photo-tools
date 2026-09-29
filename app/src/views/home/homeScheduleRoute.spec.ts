import { describe, expect, it } from 'vitest'
import {
  getHomeTabForDate,
  getHomeTransitionFeedback,
  parseHomeTab,
} from '@/views/home/homeScheduleRoute'

describe('home schedule route helpers', () => {
  it('accepts only supported home tabs', () => {
    expect(parseHomeTab('stored')).toBe('stored')
    expect(parseHomeTab('unknown')).toBeUndefined()
    expect(parseHomeTab(['today'])).toBeUndefined()
  })

  it('maps a restored date to the list where the order will appear', () => {
    expect(getHomeTabForDate('2026-09-29', '2026-09-29')).toBe('today')
    expect(getHomeTabForDate('2026-09-30', '2026-09-29')).toBe('tomorrow')
    expect(getHomeTabForDate('2026-10-03', '2026-09-29')).toBe('future')
  })

  it('describes where the changed order was moved', () => {
    expect(getHomeTransitionFeedback('stored', 'stored')).toBe('订单已暂存，已移至暂存订单。')
    expect(getHomeTransitionFeedback('restored', 'tomorrow')).toBe('订单已恢复，已移至明日排单。')
    expect(getHomeTransitionFeedback('unknown', 'today')).toBe('')
  })
})
