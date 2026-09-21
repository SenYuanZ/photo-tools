import type { Customer } from '@/api/customers/types'
import type { DepositStatus, ReminderType, ScheduleStatus } from '@/types/common'

export interface Schedule {
  id: string
  customerId: string
  serviceTypeCode: string
  serviceRoleCodes: string[]
  bookingGroupId: string | null
  serviceMeta: Record<string, unknown> | null
  date: string
  startTime: string
  endTime: string
  location: string
  note: string
  referenceImages: string[]
  depositStatus: DepositStatus
  amount: number
  reminders: ReminderType[]
  status: ScheduleStatus
}

export interface ScheduleRequest {
  customerId?: string
  serviceTypeCode?: string
  serviceRoleCodes?: string[]
  bookingGroupId?: string
  serviceMeta?: Record<string, unknown>
  temporaryCustomer?: {
    name: string
    phone: string
    type?: string
  }
  date: string
  startTime: string
  endTime: string
  location: string
  note: string
  referenceImages: string[]
  depositStatus: DepositStatus
  amount: number
  reminders: ReminderType[]
  status?: ScheduleStatus
}

export interface ScheduleListQuery {
  tab?: 'today' | 'tomorrow' | 'future'
  date?: string
}

export type ScheduleDetail = Schedule & { customer: Customer }
