import { defineComponent, nextTick, reactive } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@/test/mount'
import { publicBookingApi } from '@/api/public-booking'
import type { PublicAvailability, PublicProvider } from '@/api/public-booking/types'
import { useModelBooking } from './useModelBooking'
import { ApiError } from '@/api/core/error'

const { push, replace } = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }))
const route = reactive<{ query: Record<string, string | string[] | null> }>({ query: {} })
vi.mock('vue-router', () => ({ useRouter: () => ({ push, replace }), useRoute: () => route }))
vi.mock('@/api/public-booking', () => ({
  publicBookingApi: {
    listProviders: vi.fn(),
    getProvider: vi.fn(),
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
    route.query = {}
    replace.mockImplementation(async ({ query }) => {
      route.query = query
    })
    vi.mocked(publicBookingApi.getProvider).mockImplementation(async (id) =>
      providers.find((item) => item.id === id)!,
    )
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

  it('preselects a link provider and its only role without requiring customer login', async () => {
    route.query = { provider: 'p2' }
    await flushPromises()
    expect(page.providerLinkState.value).toBe('ready')
    expect(page.serviceDrafts['slot-1']).toMatchObject({
      providerId: 'p2',
      selectedRoleCode: 'makeup_artist',
    })
    expect(page.providerLinkMessage.value).toContain('桃子')
  })

  it('leaves multiple roles empty and requires an explicit role before advancing or submitting', async () => {
    const multiple = { ...providers[0]!, roles: ['photographer', 'makeup_artist'] }
    vi.mocked(publicBookingApi.getProvider).mockResolvedValueOnce(multiple)
    route.query = { provider: 'p1' }
    await flushPromises()
    expect(page.serviceDrafts['slot-1'].selectedRoleCode).toBe('')
    await page.navigateStep(2)
    expect(page.step.value).toBe(1)
    page.form.modelName = '客户'
    page.form.modelPhone = '13800000000'
    await page.submit()
    expect(publicBookingApi.create).not.toHaveBeenCalled()
    page.setDraftRoleCode('slot-1', 'makeup_artist')
    vi.mocked(publicBookingApi.create).mockResolvedValue({
      success: true,
      bookingGroupId: 'g',
      bookings: [],
    })
    vi.useFakeTimers()
    await page.submit()
    expect(publicBookingApi.create).toHaveBeenCalledWith(
      expect.objectContaining({
        items: [
          expect.objectContaining({
            providerId: 'p1',
            serviceTypeCode: 'makeup',
            serviceRoleCodes: ['makeup_artist'],
          }),
        ],
      }),
    )
  })

  it('keeps a manual provider change after reload and submits to the final user', async () => {
    route.query = { provider: 'p1' }
    await flushPromises()
    page.chooseProvider('slot-1', 'p2')
    await flushPromises()
    await page.loadProvidersForService('slot-1')
    expect(page.serviceDrafts['slot-1']).toMatchObject({
      providerId: 'p2',
      selectedRoleCode: 'makeup_artist',
    })
    expect(route.query.provider).toBeUndefined()
    page.form.modelName = '客户'
    page.form.modelPhone = '13800000000'
    vi.mocked(publicBookingApi.create).mockResolvedValue({
      success: true,
      bookingGroupId: 'g',
      bookings: [],
    })
    vi.useFakeTimers()
    await page.submit()
    expect(publicBookingApi.create).toHaveBeenCalledWith(
      expect.objectContaining({ items: [expect.objectContaining({ providerId: 'p2' })] }),
    )
  })

  it('ignores old link responses after a different link or a manual choice', async () => {
    let resolveOld!: (value: PublicProvider) => void
    vi.mocked(publicBookingApi.getProvider).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveOld = resolve
        }),
    )
    route.query = { provider: 'p1' }
    await nextTick()
    expect(page.providerLinkBlocked.value).toBe(true)
    route.query = { provider: 'p2' }
    await flushPromises()
    resolveOld(providers[0]!)
    await flushPromises()
    expect(page.serviceDrafts['slot-1'].providerId).toBe('p2')
    vi.mocked(publicBookingApi.getProvider).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveOld = resolve
        }),
    )
    route.query = { provider: 'p1' }
    await nextTick()
    page.chooseProvider('slot-1', 'p2')
    resolveOld(providers[0]!)
    await flushPromises()
    expect(page.serviceDrafts['slot-1'].providerId).toBe('p2')
  })

  it('shows an unavailable link without silently selecting someone and supports manual recovery', async () => {
    vi.mocked(publicBookingApi.getProvider).mockRejectedValueOnce(new ApiError(404, 'hidden'))
    route.query = { provider: 'missing' }
    await flushPromises()
    expect(page.providerLinkState.value).toBe('unavailable')
    expect(page.serviceDrafts['slot-1'].providerId).toBe('')
    await page.submit()
    expect(publicBookingApi.create).not.toHaveBeenCalled()
    page.dismissProviderLink()
    await flushPromises()
    expect(page.providerLinkBlocked.value).toBe(false)
    await selectProvider()
    expect(page.serviceDrafts['slot-1'].providerId).toBe('p1')
  })

  it('supports retry after a network error and rejects duplicate query parameters', async () => {
    vi.mocked(publicBookingApi.getProvider).mockRejectedValueOnce(new Error('offline'))
    route.query = { provider: 'p1' }
    await flushPromises()
    expect(page.providerLinkState.value).toBe('error')
    await page.retryProviderLink()
    expect(page.serviceDrafts['slot-1'].providerId).toBe('p1')
    route.query = { provider: ['p1', 'p2'] }
    await flushPromises()
    expect(page.providerLinkState.value).toBe('unavailable')
    expect(page.serviceDrafts['slot-1'].providerId).toBe('')
  })

  it('waits for an in-flight list before applying the link and keeps the detail available', async () => {
    let finishList!: (value: PublicProvider[]) => void
    vi.mocked(publicBookingApi.listProviders).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finishList = resolve
        }),
    )
    const pendingList = page.loadProvidersForService('slot-1')
    route.query = { provider: 'p2' }
    await nextTick()
    expect(page.providerLinkBlocked.value).toBe(true)
    finishList([providers[0]!])
    await pendingList
    await flushPromises()
    expect(page.serviceDrafts['slot-1'].providerId).toBe('p2')
    expect(page.selectedProvider('slot-1')?.id).toBe('p2')
  })

  it('clears the previous role when manually choosing a different multi-role user', async () => {
    await selectProvider()
    page.providersByService['slot-1'].push({
      ...providers[0]!,
      id: 'multi',
      roles: ['photographer', 'makeup_artist'],
    })
    page.chooseProvider('slot-1', 'multi')
    expect(page.serviceDrafts['slot-1'].selectedRoleCode).toBe('')
    page.setDraftRoleCode('slot-1', 'makeup_artist')
    page.chooseProvider('slot-1', 'multi')
    expect(page.serviceDrafts['slot-1'].selectedRoleCode).toBe('makeup_artist')
  })
})
