import { defineComponent, nextTick } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@/test/mount'
import { publicBookingApi } from '@/api/public-booking'
import type { PublicAvailability, PublicProvider } from '@/api/public-booking/types'
import { useModelBooking } from './useModelBooking'

const { push } = vi.hoisted(() => ({ push: vi.fn() }))
vi.mock('vue-router', () => ({ useRouter: () => ({ push }) }))
vi.mock('@/api/public-booking', () => ({
  publicBookingApi: {
    listProviders: vi.fn(),
    listCustomerTypes: vi.fn(),
    getAvailability: vi.fn(),
    create: vi.fn(),
  },
}))
vi.mock('@/api/roles', () => ({
  rolesApi: {
    list: vi.fn().mockResolvedValue([
      { code: 'photographer', name: '摄影' },
      { code: 'makeup_artist', name: '妆造' },
    ]),
  },
}))

const providers: PublicProvider[] = [
  {
    id: 'p1',
    nickname: '小鹿',
    account: 'deer',
    role: 'photographer',
    roles: ['photographer'],
    avatarUrl: '',
    bio: '人像',
    portfolioPublic: false,
    portfolioImages: [],
  },
  {
    id: 'p2',
    nickname: '桃子',
    account: 'peach',
    role: 'makeup_artist',
    roles: ['makeup_artist'],
    avatarUrl: '',
    bio: '角色妆',
    portfolioPublic: false,
    portfolioImages: [],
  },
]
const availability = (
  providerId = 'p1',
  date = '2026-10-16',
  busyRanges: PublicAvailability['busyRanges'] = [],
): PublicAvailability => ({
  providerId,
  date,
  stepMinutes: 30,
  busyRanges,
  blockedSlots: [],
  availableSlots: [],
  freeRanges: [],
})

describe('model booking workflow', () => {
  let page: ReturnType<typeof useModelBooking>
  let wrapper: ReturnType<typeof mount>
  beforeEach(async () => {
    vi.clearAllMocks()
    localStorage.clear()
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
    vi.mocked(publicBookingApi.listProviders).mockResolvedValue(providers)
    vi.mocked(publicBookingApi.listCustomerTypes).mockResolvedValue([
      { id: 'personal', code: 'personal', name: '个人写真', sortOrder: 1, isActive: true },
    ])
    vi.mocked(publicBookingApi.getAvailability).mockImplementation(async (id, date) =>
      availability(id, date),
    )
    wrapper = mount(
      defineComponent({
        setup() {
          page = useModelBooking()
          return () => null
        },
      }),
    )
    await flushPromises()
  })
  afterEach(() => {
    wrapper.unmount()
    vi.useRealTimers()
    vi.restoreAllMocks()
  })
  const selectProvider = async () => {
    page.chooseProvider('slot-1', 'p1')
    await flushPromises()
  }

  it('selects the earliest full duration and preserves manual choices until duration changes', async () => {
    await selectProvider()
    page.setDuration('slot-1', 10)
    expect(page.serviceDrafts['slot-1']).toMatchObject({ startTime: '07:00', endTime: '07:10' })
    expect(page.setStartTime('slot-1', '21:50')).toBe(true)
    expect(page.serviceDrafts['slot-1'].endTime).toBe('22:00')
    page.chooseProvider('slot-1', 'p1')
    expect(page.serviceDrafts['slot-1'].startTime).toBe('21:50')
    await page.navigateStep(2)
    await page.navigateStep(1)
    expect(page.serviceDrafts['slot-1'].startTime).toBe('21:50')
    page.setDuration('slot-1', 30)
    expect(page.serviceDrafts['slot-1']).toMatchObject({
      startTime: '07:00',
      endTime: '07:30',
      timeSource: 'auto',
    })
  })
  it('matches long custom durations and blocks a fully occupied date', async () => {
    vi.mocked(publicBookingApi.getAvailability).mockImplementation(async (id, date) =>
      availability(id, date, [{ startTime: '11:00', endTime: '16:00' }]),
    )
    await selectProvider()
    page.setDuration('slot-1', 300, true)
    expect(page.serviceDrafts['slot-1']).toMatchObject({ startTime: '16:00', endTime: '21:00' })
    page.setDuration('slot-1', 420, true)
    expect(page.serviceDrafts['slot-1'].startTime).toBe('')
    await page.navigateStep(3)
    expect(page.step.value).toBe(1)
    expect(page.error.value).toBeTruthy()
  })
  it('rejects stale responses after switching dates', async () => {
    await selectProvider()
    let resolveOld!: (value: PublicAvailability) => void
    vi.mocked(publicBookingApi.getAvailability).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveOld = resolve
        }),
    )
    page.availabilityByService['slot-1'].lastKey = ''
    const old = page.loadAvailability('slot-1')
    page.form.date = '2027-01-02'
    await flushPromises()
    resolveOld(availability('p1', '2026-10-16', [{ startTime: '07:00', endTime: '22:00' }]))
    await old
    expect(page.availabilityByService['slot-1'].lastKey).toContain('2027-01-02')
    expect(page.serviceDrafts['slot-1'].startTime).toBe('07:00')
  })
  it('does not reuse old times while availability fails and supports retry', async () => {
    await selectProvider()
    vi.mocked(publicBookingApi.getAvailability).mockRejectedValueOnce(new Error('network'))
    page.availabilityByService['slot-1'].lastKey = ''
    await page.loadAvailability('slot-1')
    expect(page.serviceDrafts['slot-1'].startTime).toBe('')
    expect(page.setStartTime('slot-1', '07:00')).toBe(false)
    await page.loadAvailability('slot-1')
    expect(page.serviceDrafts['slot-1'].startTime).toBe('07:00')
  })
  it('filters by role without clearing the selected provider and searches by role label', async () => {
    page.selectedRoleCode.value = 'makeup_artist'
    expect(page.commonProvidersOfPicker.value.map((item) => item.id)).toEqual(['p2'])
    await selectProvider()
    page.selectedRoleCode.value = 'makeup_artist'
    expect(page.commonProvidersOfPicker.value.map((item) => item.id)).toEqual(['p2'])
    expect(page.recentProvidersOfPicker.value).toEqual([])
    expect(page.serviceDrafts['slot-1'].providerId).toBe('p1')
    page.selectedRoleCode.value = 'photographer'
    expect(page.commonProvidersOfPicker.value).toEqual([])
    expect(page.recentProvidersOfPicker.value.map((item) => item.id)).toEqual(['p1'])
    page.selectedRoleCode.value = 'all'
    expect(page.recentProvidersOfPicker.value.map((item) => item.id)).toEqual(['p1'])
    page.providerKeywordInput.value = '妆造'
    await new Promise((resolve) => window.setTimeout(resolve, 300))
    expect(page.commonProvidersOfPicker.value.map((item) => item.id)).toEqual(['p2'])
  })
  it('validates custom location before advancing and prevents duplicate providers', async () => {
    page.locationMode.value = '工作室'
    await nextTick()
    await page.navigateStep(1)
    expect(page.step.value).toBe(0)
    page.locationText.value = '已约定的工作室'
    await nextTick()
    await selectProvider()
    page.addServiceSlot()
    await flushPromises()
    const second = page.activeServices.value[1].code
    page.chooseProvider(second, 'p1')
    expect(page.serviceDrafts[second].providerId).toBe('')
  })
  it('submits a 10-minute booking with text preferences and navigates to its receipt', async () => {
    await selectProvider()
    page.setDuration('slot-1', 10)
    page.togglePreference('styles', '电影氛围')
    page.togglePreference('poses', '需要动作引导')
    page.form.modelName = ' 小明 '
    page.form.modelPhone = '13800000000'
    vi.mocked(publicBookingApi.create).mockResolvedValue({
      success: true,
      bookingGroupId: 'group1',
      bookings: [],
    })
    vi.useFakeTimers()
    await page.submit()
    expect(publicBookingApi.create).toHaveBeenCalledWith(
      expect.objectContaining({
        modelName: '小明',
        location: '待商议',
        aiBrief: expect.objectContaining({ workName: '电影氛围', visualGoal: '需要动作引导' }),
        items: [
          expect.objectContaining({ startTime: '07:00', endTime: '07:10', referenceImages: [] }),
        ],
      }),
    )
    await vi.advanceTimersByTimeAsync(500)
    expect(push).toHaveBeenCalledWith({
      name: 'public-order-detail',
      params: { bookingGroupId: 'group1' },
    })
  })
  it('does not submit missing contact data', async () => {
    await page.submit()
    expect(publicBookingApi.create).not.toHaveBeenCalled()
    expect(page.error.value).toBeTruthy()
  })
})
