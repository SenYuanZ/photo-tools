import type { UploadItem } from '@/hooks/useUploadQueue'

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
