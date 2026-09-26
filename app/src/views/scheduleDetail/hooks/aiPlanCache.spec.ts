import { describe, expect, it } from 'vitest'
import { formatSavedShootPlanTime, readSavedShootPlan } from './aiPlanCache'

describe('aiPlanCache', () => {
  it('reads a valid saved shoot plan', () => {
    expect(
      readSavedShootPlan({
        aiPlan: {
          scene: 'shoot_plan',
          generatedAt: '2026-09-26T10:20:00.000Z',
          result: { title: '胡桃拍摄方案', summary: '灵动感' },
        },
      }),
    ).toEqual({
      scene: 'shoot_plan',
      generatedAt: '2026-09-26T10:20:00.000Z',
      result: { title: '胡桃拍摄方案', summary: '灵动感' },
    })
  })

  it('ignores missing or malformed cached plans', () => {
    expect(readSavedShootPlan(null)).toBeNull()
    expect(readSavedShootPlan({ aiPlan: { scene: 'chat', result: { title: 'x' } } })).toBeNull()
    expect(readSavedShootPlan({ aiPlan: { scene: 'shoot_plan', result: [] } })).toBeNull()
  })

  it('formats valid timestamps and ignores invalid ones', () => {
    expect(formatSavedShootPlanTime('not-a-date')).toBe('')
    const formatted = formatSavedShootPlanTime('2026-09-26T10:20:00.000Z')
    expect(formatted).toMatch(/9/)
    expect(formatted).toMatch(/26/)
  })
})
