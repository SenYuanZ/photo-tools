import type { PublicBookingThemeType } from '@/api/public-booking/types'

export interface ModelBookingAiBriefForm {
  themeType: PublicBookingThemeType | ''
  workName: string
  outfit: string
  visualGoal: string
  avoid: string
}

export const MODEL_BOOKING_THEME_OPTIONS: Array<{
  value: PublicBookingThemeType
  label: string
}> = [
  { value: 'cosplay', label: 'Cosplay' },
  { value: 'jk', label: 'JK' },
  { value: 'lolita', label: '洛丽塔' },
  { value: 'hanfu', label: '汉服' },
  { value: 'daily', label: '日常写真' },
  { value: 'other', label: '其他' },
]

export interface ServiceDraft {
  durationMinutes: number
  customDuration: boolean
  timeSource: 'auto' | 'manual'

  providerId: string
  startTime: string
  endTime: string
  requirement: string
  selectedRoleCode: string
}

export interface TimeRange {
  startTime: string
  endTime: string
}

export interface AvailabilityState {
  loading: boolean
  error: string
  blockedSlots: string[]
  availableSlots: string[]
  busyRanges: TimeRange[]
  freeRanges: TimeRange[]
  lastKey: string
}

export interface ProviderAvailabilitySummary {
  loading: boolean
  key: string
  freeRangeCount: number | null
  busyRanges: TimeRange[]
  freeRanges: TimeRange[]
  error: string
  availableSlotCount: number | null
}
