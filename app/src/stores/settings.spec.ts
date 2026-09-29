import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { settingsApi } from '@/api/settings'
import type { SettingsData } from '@/api/settings/types'
import { useSettingsStore } from '@/stores/settings'

vi.mock('@/api/settings', () => ({
  settingsApi: {
    get: vi.fn(),
    update: vi.fn(),
  },
}))

describe('settings store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('preserves unrelated settings when an update returns partial data', async () => {
    vi.mocked(settingsApi.update).mockResolvedValue({ theme: 'blue' } as SettingsData)
    const store = useSettingsStore()

    await store.setTheme('blue')

    expect(store.theme).toBe('blue')
    expect(store.defaultReminders).toEqual(['1d', '1h'])
    expect(store.backupEnabled).toBe(true)
  })
})
