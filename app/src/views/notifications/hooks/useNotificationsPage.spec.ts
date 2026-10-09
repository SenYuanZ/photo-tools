import { mount, flushPromises } from '@/test/mount'
import { createPinia, setActivePinia } from 'pinia'
import { defineComponent } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { notificationsApi } from '@/api/notifications'
import type { NotificationItem } from '@/api/notifications/types'
import { useNotificationsPage } from './useNotificationsPage'
import { useNotificationsStore } from '@/stores/notifications'
import { scheduleApi } from '@/api/schedules'
import { useScheduleStore } from '@/stores/schedules'
import { useCustomerStore } from '@/stores/customers'
import type { ScheduleDetail } from '@/api/schedules/types'

const { push } = vi.hoisted(() => ({ push: vi.fn() }))
vi.mock('vue-router', () => ({ useRouter: () => ({ push }) }))
vi.mock('@/api/schedules', () => ({ scheduleApi: { get: vi.fn() } }))
vi.mock('@/api/notifications', () => ({
  notificationsApi: { list: vi.fn(), summary: vi.fn(), read: vi.fn(), readAll: vi.fn() },
}))
const item = (id: number): NotificationItem => ({
  id,
  scheduleId: 's1',
  type: 'schedule_reminder',
  reminderType: '1h',
  eventStartAt: '2026-10-10T07:00:00Z',
  dueAt: '2026-10-10T06:00:00Z',
  title: '提醒',
  content: '测试棚',
  readAt: null,
  invalidatedAt: null,
  createdAt: '2026-10-10T06:00:00Z',
  scheduleStatus: null,
  canNavigate: false,
  statusLabel: '排单已删除',
})

describe('notification page workflow', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })
  const setup = () => {
    let page!: ReturnType<typeof useNotificationsPage>
    const wrapper = mount(
      defineComponent({
        setup() {
          page = useNotificationsPage()
          return {}
        },
        template: '<div />',
      }),
    )
    return {
      wrapper,
      get page() {
        return page
      },
    }
  }
  it('paginates and resets to page one when the filter changes', async () => {
    vi.mocked(notificationsApi.list)
      .mockResolvedValueOnce({ items: [item(2)], total: 2, page: 1, pageSize: 20 })
      .mockResolvedValueOnce({ items: [item(1)], total: 2, page: 2, pageSize: 20 })
      .mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20 })
    const { wrapper, page } = setup()
    await flushPromises()
    expect(page.hasMore.value).toBe(true)
    await page.load(true)
    expect(page.items.value.map((n) => n.id)).toEqual([2, 1])
    expect(page.hasMore.value).toBe(false)
    page.filter.value = 'unread'
    await flushPromises()
    expect(notificationsApi.list).toHaveBeenLastCalledWith(
      { filter: 'unread', page: 1, pageSize: 20 },
      expect.any(AbortSignal),
    )
    expect(page.items.value).toEqual([])
    wrapper.unmount()
  })
  it('retains unread state on failure and allows read-all to recover', async () => {
    vi.mocked(notificationsApi.list).mockResolvedValue({
      items: [item(1)],
      total: 1,
      page: 1,
      pageSize: 20,
    })
    const { wrapper, page } = setup()
    await flushPromises()
    vi.mocked(notificationsApi.read).mockRejectedValueOnce(new Error('offline'))
    await page.open(page.items.value[0]!)
    expect(page.items.value[0]?.readAt).toBeNull()
    expect(page.error.value).toBe('offline')
    vi.mocked(notificationsApi.readAll).mockResolvedValue({ updatedCount: 1 })
    vi.mocked(notificationsApi.summary).mockResolvedValue({ unreadCount: 0, latestId: null })
    vi.mocked(notificationsApi.list).mockResolvedValue({
      items: [{ ...item(1), readAt: '2026-10-10T07:00:00Z' }],
      total: 1,
      page: 1,
      pageSize: 20,
    })
    await page.readAll()
    expect(page.items.value[0]?.readAt).not.toBeNull()
    expect(page.error.value).toBe('')
    wrapper.unmount()
  })
  it('keeps the loaded range when the polling refreshes the list', async () => {
    vi.mocked(notificationsApi.list)
      .mockResolvedValueOnce({ items: [item(2)], total: 2, page: 1, pageSize: 20 })
      .mockResolvedValueOnce({ items: [item(1)], total: 2, page: 2, pageSize: 20 })
      .mockResolvedValueOnce({ items: [item(2)], total: 2, page: 1, pageSize: 20 })
      .mockResolvedValueOnce({ items: [item(1)], total: 2, page: 2, pageSize: 20 })
    const { wrapper, page } = setup()
    await flushPromises()
    await page.load(true)
    useNotificationsStore().syncVersion++
    await flushPromises()
    expect(page.items.value.map((row) => row.id)).toEqual([2, 1])
    expect(page.hasMore.value).toBe(false)
    wrapper.unmount()
  })
  it('retains successful read-all feedback if the following list refresh fails', async () => {
    vi.mocked(notificationsApi.list).mockResolvedValueOnce({
      items: [item(1)],
      total: 1,
      page: 1,
      pageSize: 20,
    })
    const { wrapper, page } = setup()
    await flushPromises()
    vi.mocked(notificationsApi.readAll).mockResolvedValue({ updatedCount: 1 })
    vi.mocked(notificationsApi.summary).mockRejectedValue(new Error('offline'))
    vi.mocked(notificationsApi.list).mockRejectedValue(new Error('offline'))
    await page.readAll()
    expect(page.items.value[0]?.readAt).not.toBeNull()
    expect(page.store.unreadCount).toBe(0)
    expect(page.error.value).toBe('offline')
    wrapper.unmount()
  })
  it('loads the current schedule and customer before navigating to a new booking', async () => {
    const notification = { ...item(1), canNavigate: true }
    const detail: ScheduleDetail = {
      id: 's1',
      customerId: 'c1',
      date: '2026-10-11',
      startTime: '15:00',
      endTime: '16:00',
      serviceTypeCode: 'photography',
      serviceRoleCodes: [],
      bookingGroupId: null,
      serviceMeta: null,
      location: '新的拍摄地点',
      note: '',
      referenceImages: [],
      reminders: [],
      amount: 0,
      depositStatus: 'unpaid',
      status: 'stored',
      customer: {
        id: 'c1',
        name: '预约客户',
        phone: '13800000000',
        isLongTerm: true,
        type: 'model',
        style: '',
        hobby: '',
        specialNeed: '',
        depositStatus: 'unpaid',
        tailPaymentDate: null,
        outfit: '',
        location: '',
        companions: '',
        tags: [],
      },
    }
    vi.mocked(notificationsApi.list).mockResolvedValue({
      items: [notification],
      total: 1,
      page: 1,
      pageSize: 20,
    })
    vi.mocked(notificationsApi.read).mockResolvedValue({ success: true })
    vi.mocked(notificationsApi.summary).mockResolvedValue({ unreadCount: 0, latestId: null })
    vi.mocked(scheduleApi.get).mockResolvedValue(detail)
    const { wrapper, page } = setup()
    await flushPromises()
    await page.open(notification)
    expect(useScheduleStore().schedules.find((s) => s.id === 's1')?.location).toBe('新的拍摄地点')
    expect(useCustomerStore().customers[0]?.name).toBe('预约客户')
    expect(page.items.value[0]?.readAt).not.toBeNull()
    expect(push).toHaveBeenCalledWith({ name: 'schedule-detail', params: { id: 's1' } })
    wrapper.unmount()
  })
  it('ignores an old list response when the account is reset', async () => {
    let resolve!: (value: Awaited<ReturnType<typeof notificationsApi.list>>) => void
    vi.mocked(notificationsApi.list).mockReturnValueOnce(
      new Promise((done) => {
        resolve = done
      }),
    )
    const { wrapper, page } = setup()
    useNotificationsStore().reset()
    await flushPromises()
    resolve({ items: [item(1)], total: 1, page: 1, pageSize: 20 })
    await flushPromises()
    expect(page.items.value).toEqual([])
    wrapper.unmount()
  })
})
