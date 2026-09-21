import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import type { ScheduleRequest } from '@/api/schedules/types'
import { useScheduleStore } from '@/stores/schedules'

const request: ScheduleRequest = {
  customerId: 'customer-1',
  date: '2026-09-21',
  startTime: '10:30',
  endTime: '11:30',
  location: 'studio',
  note: '',
  referenceImages: [],
  depositStatus: 'unpaid',
  amount: 0,
  reminders: [],
}

describe('schedule store conflict fallback', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('finds overlaps and allows adjacent schedules', () => {
    const store = useScheduleStore()
    store.schedules = [
      {
        ...request,
        id: 'schedule-1',
        customerId: 'customer-1',
        serviceTypeCode: 'photography',
        serviceRoleCodes: [],
        bookingGroupId: null,
        serviceMeta: null,
        status: 'normal',
        startTime: '10:00',
        endTime: '11:00',
      },
    ]

    expect(store.getConflict(request)?.id).toBe('schedule-1')
    expect(store.getConflict({ ...request, startTime: '11:00', endTime: '12:00' })).toBeUndefined()
  })
})
