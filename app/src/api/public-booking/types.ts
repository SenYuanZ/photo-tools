import type { CustomerTypeItem } from '@/api/customer-types/types'
import type { ServiceTypeItem } from '@/api/service-types/types'
import type { DepositStatus, UserRole } from '@/types/common'

export type { CustomerTypeItem, ServiceTypeItem }

export type PublicBookingThemeType = 'cosplay' | 'jk' | 'lolita' | 'hanfu' | 'daily' | 'other'

export interface PublicBookingAiBrief {
  themeType?: PublicBookingThemeType
  workName?: string
  characterName?: string
  characterSetting?: string
  outfit?: string
  makeupHair?: string
  props?: string
  visualGoal?: string
  posePreference?: string
  avoid?: string
}

export interface PublicProvider {
  id: string
  nickname: string
  account: string
  role: UserRole
  roles: string[]
  avatarUrl: string
  bio: string
  portfolioPublic: boolean
  portfolioImages: string[]
}

export interface PublicBookingRequest {
  modelName: string
  modelPhone: string
  date: string
  customerTypeCode: string
  companions?: string
  location: string
  note?: string
  aiBrief?: PublicBookingAiBrief
  items: Array<{
    serviceTypeCode: string
    providerId: string
    startTime: string
    endTime: string
    requirement: string
    referenceImages: string[]
    serviceRoleCodes?: string[]
  }>
}

export interface PublicAvailability {
  providerId: string
  date: string
  stepMinutes: number
  busyRanges: Array<{ startTime: string; endTime: string }>
  blockedSlots: string[]
  availableSlots: string[]
  freeRanges: Array<{ startTime: string; endTime: string }>
}

export interface PublicOrderBookingItem {
  bookingId: string
  serviceTypeCode: string
  providerId: string
  providerName: string
  customerId: string
  customerName: string
  customerPhone: string
  startTime: string
  endTime: string
  location: string
  note: string
  depositStatus: DepositStatus
  amount: number
  referenceImages: string[]
}

export interface PublicOrderDetail {
  bookingGroupId: string
  date: string
  modelName: string
  modelPhone: string
  location: string
  note: string
  createdAt: string
  bookings: PublicOrderBookingItem[]
}

export interface CreatePublicBookingResponse {
  success: boolean
  bookingGroupId: string
  bookings: Array<{
    serviceTypeCode: string
    bookingId: string
    providerId: string
    providerName: string
  }>
}

export interface PublicOrderQuery {
  bookingGroupId?: string
  modelPhone?: string
  modelName?: string
}

export interface PublicOrderQueryResponse {
  mode: 'bookingGroupId' | 'customer'
  total: number
  orders: PublicOrderDetail[]
}
