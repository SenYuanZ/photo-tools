import { request } from '@/api/core/client'
import type { SettingsData, UpdateSettingsRequest } from '@/api/settings/types'

export const settingsApi = {
  get() {
    return request<SettingsData>('/settings')
  },
  update(payload: UpdateSettingsRequest) {
    return request<SettingsData>('/settings', { method: 'PATCH', body: payload })
  },
}
