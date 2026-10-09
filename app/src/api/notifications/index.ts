import { request } from '@/api/core/client'
import type { NotificationPage, NotificationQuery, NotificationSummary } from './types'

export const notificationsApi = {
  list(query: NotificationQuery, signal?: AbortSignal) {
    return request<NotificationPage>('/notifications', { query: { ...query }, signal })
  },
  summary(signal?: AbortSignal) {
    return request<NotificationSummary>('/notifications/unread-count', { signal })
  },
  read(id: number) {
    return request<{ success: boolean }>(`/notifications/${id}/read`, { method: 'PATCH' })
  },
  readAll() {
    return request<{ updatedCount: number }>('/notifications/read-all', { method: 'PATCH' })
  },
}
