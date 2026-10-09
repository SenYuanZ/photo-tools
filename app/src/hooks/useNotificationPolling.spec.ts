import { mount, flushPromises } from '@/test/mount'
import { createPinia, setActivePinia } from 'pinia'
import { defineComponent, nextTick, reactive } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { notificationsApi } from '@/api/notifications'
import { useAuthStore } from '@/stores/auth'
import { useNotificationsStore } from '@/stores/notifications'
import { useNotificationPolling } from './useNotificationPolling'
import type { ProfileData } from '@/api/profile/types'

const route = reactive({ name: 'home' })
vi.mock('vue-router', () => ({ useRoute: () => route }))
vi.mock('@/api/notifications', () => ({ notificationsApi: { summary: vi.fn() } }))

describe('notification polling lifecycle', () => {
  let visibility = 'visible'
  beforeEach(() => {
    vi.useFakeTimers()
    setActivePinia(createPinia())
    vi.clearAllMocks()
    visibility = 'visible'
    route.name = 'home'
    vi.spyOn(document, 'visibilityState', 'get').mockImplementation(
      () => visibility as DocumentVisibilityState,
    )
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('waits for login, polls once, pauses in background, resumes and stops on logout', async () => {
    vi.mocked(notificationsApi.summary).mockResolvedValue({ unreadCount: 1, latestId: 1 })
    const wrapper = mount(
      defineComponent({
        setup() {
          return useNotificationPolling()
        },
        template: '<div>{{ bannerVisible }}</div>',
      }),
    )
    const auth = useAuthStore()
    expect(notificationsApi.summary).not.toHaveBeenCalled()
    auth.isLoggedIn = true
    auth.hydrated = true
    auth.profile = { id: 'u1' } as ProfileData
    await nextTick()
    await flushPromises()
    expect(notificationsApi.summary).toHaveBeenCalledTimes(1)
    expect(wrapper.text()).toBe('false')
    vi.mocked(notificationsApi.summary).mockResolvedValue({ unreadCount: 2, latestId: 2 })
    await vi.advanceTimersByTimeAsync(60000)
    expect(wrapper.text()).toBe('true')
    visibility = 'hidden'
    document.dispatchEvent(new Event('visibilitychange'))
    await vi.advanceTimersByTimeAsync(120000)
    expect(notificationsApi.summary).toHaveBeenCalledTimes(2)
    visibility = 'visible'
    document.dispatchEvent(new Event('visibilitychange'))
    await flushPromises()
    expect(notificationsApi.summary).toHaveBeenCalledTimes(3)
    auth.logout()
    await nextTick()
    await vi.advanceTimersByTimeAsync(60000)
    expect(notificationsApi.summary).toHaveBeenCalledTimes(3)
    expect(useNotificationsStore().unreadCount).toBe(0)
    wrapper.unmount()
    expect(vi.getTimerCount()).toBe(0)
  })
  it('retries after an outage without signing out', async () => {
    const auth = useAuthStore()
    auth.isLoggedIn = true
    auth.hydrated = true
    auth.profile = { id: 'u1' } as ProfileData
    vi.mocked(notificationsApi.summary)
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValue({ unreadCount: 1, latestId: 1 })
    const wrapper = mount(
      defineComponent({
        setup() {
          return useNotificationPolling()
        },
        template: '<div>{{ bannerVisible }}</div>',
      }),
    )
    await flushPromises()
    expect(auth.isLoggedIn).toBe(true)
    await vi.advanceTimersByTimeAsync(60000)
    expect(useNotificationsStore().unreadCount).toBe(1)
    expect(wrapper.text()).toBe('false')
    wrapper.unmount()
  })
  it('dismisses duplicate banners and refreshes quietly inside the notification center', async () => {
    const auth = useAuthStore()
    auth.isLoggedIn = true
    auth.hydrated = true
    auth.profile = { id: 'u1' } as ProfileData
    vi.mocked(notificationsApi.summary).mockResolvedValue({ unreadCount: 1, latestId: 1 })
    const wrapper = mount(
      defineComponent({
        setup: useNotificationPolling,
        template: '<div>{{ bannerVisible }}</div>',
      }),
    )
    await flushPromises()
    vi.mocked(notificationsApi.summary).mockResolvedValue({ unreadCount: 2, latestId: 2 })
    await vi.advanceTimersByTimeAsync(60000)
    expect(wrapper.text()).toBe('true')
    await vi.advanceTimersByTimeAsync(60000)
    expect(wrapper.text()).toBe('false')
    route.name = 'notifications'
    await nextTick()
    vi.mocked(notificationsApi.summary).mockResolvedValue({ unreadCount: 3, latestId: 3 })
    await vi.advanceTimersByTimeAsync(60000)
    expect(wrapper.text()).toBe('false')
    expect(useNotificationsStore().unreadCount).toBe(3)
    wrapper.unmount()
  })
})
