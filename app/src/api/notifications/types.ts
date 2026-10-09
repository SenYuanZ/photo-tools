import type { ReminderType, ScheduleStatus } from '@/types/common'

export type NotificationFilter = 'all' | 'unread'
export interface NotificationItem {
  id: number
  scheduleId: string
  type: 'schedule_reminder'
  reminderType: ReminderType
  eventStartAt: string
  dueAt: string
  title: string
  content: string
  readAt: string | null
  invalidatedAt: string | null
  createdAt: string
  scheduleStatus: ScheduleStatus | null
  canNavigate: boolean
  statusLabel: string
}
export interface NotificationQuery {
  filter: NotificationFilter
  page: number
  pageSize: number
}
export interface NotificationPage {
  items: NotificationItem[]
  total: number
  page: number
  pageSize: number
}
export interface NotificationSummary {
  unreadCount: number
  latestId: number | null
}
