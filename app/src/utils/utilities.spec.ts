import { describe, expect, it } from 'vitest'
import type { Customer } from '@/api/customers/types'
import type { ProfileData } from '@/api/profile/types'
import type { Schedule } from '@/api/schedules/types'
import { normalizeCustomer, normalizeProfile, normalizeSchedule } from '@/utils/normalizers'
import { storage } from '@/utils/storage'
import { isAfterTime, isTimeOverlap, toMinutes } from '@/utils/time'

describe('time utilities', () => {
  it('converts and compares time ranges', () => {
    expect(toMinutes('10:30')).toBe(630)
    expect(isAfterTime('09:00', '10:00')).toBe(true)
    expect(isTimeOverlap('09:00', '10:00', '09:30', '11:00')).toBe(true)
    expect(isTimeOverlap('09:00', '10:00', '10:00', '11:00')).toBe(false)
  })
})

describe('storage utilities', () => {
  it('reads typed JSON and falls back for malformed values', () => {
    storage.setJson('valid', { count: 2 })
    localStorage.setItem('invalid', '{')
    expect(storage.getJson('valid', { count: 0 })).toEqual({ count: 2 })
    expect(storage.getJson('invalid', { count: 0 })).toEqual({ count: 0 })
  })
})

describe('domain normalizers', () => {
  it('normalizes optional customer, schedule and profile fields', () => {
    const customer = normalizeCustomer({ id: 'c1', isLongTerm: 0 } as unknown as Customer)
    expect(customer.isLongTerm).toBe(false)

    const schedule = normalizeSchedule({ id: 's1' } as Schedule)
    expect(schedule.status).toBe('normal')
    expect(schedule.serviceTypeCode).toBe('photography')
    expect(schedule.referenceImages).toEqual([])

    const profile = normalizeProfile(
      {
        id: 'u1',
        account: 'user',
        nickname: '',
        role: '',
        roles: [],
        avatarUrl: '',
        bio: '',
        portfolioImages: [],
        portfolioPublic: false,
      } as ProfileData,
      'photographer',
    )
    expect(profile.roles).toEqual(['photographer'])
  })
})
