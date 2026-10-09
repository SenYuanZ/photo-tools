import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { notificationsApi } from '@/api/notifications'
import { useNotificationsStore } from '@/stores/notifications'
import type { NotificationSummary } from '@/api/notifications/types'

vi.mock('@/api/notifications', () => ({
  notificationsApi: { summary: vi.fn(), read: vi.fn(), readAll: vi.fn() },
}))

describe('notification session state', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })
  it('baselines historical unread and signals each new id only once', async () => {
    const store = useNotificationsStore()
    vi.mocked(notificationsApi.summary).mockResolvedValue({ unreadCount: 2, latestId: 8 })
    expect(await store.refresh()).toBe(false)
    expect(store.unreadCount).toBe(2)
    vi.mocked(notificationsApi.summary).mockResolvedValue({ unreadCount: 3, latestId: 9 })
    expect(await store.refresh()).toBe(true)
    expect(await store.refresh()).toBe(false)
    vi.mocked(notificationsApi.summary).mockResolvedValue({ unreadCount: 0, latestId: null })
    await store.refresh()
    vi.mocked(notificationsApi.summary).mockResolvedValue({ unreadCount: 1, latestId: 8 })
    expect(await store.refresh()).toBe(false)
  })
  it('drops responses from a previous account', async () => {
    let resolve!: (value: NotificationSummary) => void
    vi.mocked(notificationsApi.summary).mockReturnValue(
      new Promise((done) => {
        resolve = done
      }),
    )
    const store = useNotificationsStore()
    const pending = store.refresh()
    store.reset()
    resolve({ unreadCount: 50, latestId: 50 })
    expect(await pending).toBe(false)
    expect(store.unreadCount).toBe(0)
    expect(store.initialized).toBe(false)
  })
  it('does not allow an older count response to overwrite a newer one', async () => {
    let resolve!: (value: NotificationSummary) => void
    vi.mocked(notificationsApi.summary).mockReturnValueOnce(
      new Promise((done) => {
        resolve = done
      }),
    )
    const store = useNotificationsStore()
    const pending = store.refresh()
    vi.mocked(notificationsApi.summary).mockResolvedValueOnce({ unreadCount: 1, latestId: 9 })
    await store.refresh()
    resolve({ unreadCount: 8, latestId: 8 })
    await pending
    expect(store.unreadCount).toBe(1)
  })
  it('keeps badge and initialized state on request failure, then recovers', async () => {
    const store = useNotificationsStore()
    vi.mocked(notificationsApi.summary).mockRejectedValueOnce(new Error('offline'))
    await expect(store.refresh()).rejects.toThrow('offline')
    expect(store.initialized).toBe(false)
    vi.mocked(notificationsApi.summary).mockResolvedValue({ unreadCount: 3, latestId: 9 })
    expect(await store.refresh()).toBe(false)
    expect(store.unreadCount).toBe(3)
  })
  it('updates read counts only after successful API writes', async () => {
    const store = useNotificationsStore()
    store.unreadCount = 2
    vi.mocked(notificationsApi.read).mockRejectedValueOnce(new Error('offline'))
    await expect(store.read(1, true)).rejects.toThrow()
    expect(store.unreadCount).toBe(2)
    vi.mocked(notificationsApi.read).mockResolvedValue({ success: true })
    vi.mocked(notificationsApi.summary).mockRejectedValue(new Error('offline'))
    expect(await store.read(1, true)).toBe(true)
    expect(store.unreadCount).toBe(1)
  })
  it('clears the badge after read-all even when the summary temporarily fails', async () => {
    const store = useNotificationsStore()
    store.unreadCount = 3
    vi.mocked(notificationsApi.readAll).mockResolvedValue({ updatedCount: 3 })
    vi.mocked(notificationsApi.summary).mockRejectedValue(new Error('offline'))
    expect(await store.readAll()).toBe(true)
    expect(store.unreadCount).toBe(0)
  })
})
