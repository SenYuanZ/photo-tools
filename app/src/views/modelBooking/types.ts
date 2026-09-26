import type { UploadItem } from '@/hooks/useUploadQueue'
import type { PublicBookingThemeType } from '@/api/public-booking/types'

export interface ModelBookingAiBriefForm {
  themeType: PublicBookingThemeType | ''
  workName: string
  characterName: string
  characterSetting: string
  outfit: string
  makeupHair: string
  props: string
  visualGoal: string
  posePreference: string
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
  providerId: string
  startTime: string
  endTime: string
  requirement: string
  selectedRoleCode: string
  referenceFileList: UploadItem[]
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
  availableSlotCount: number | null
}
