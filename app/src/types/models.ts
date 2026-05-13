export type CustomerType = string
export type UserRole = string
export type DepositStatus = 'unpaid' | 'paid' | 'full'
export type ScheduleStatus = 'normal' | 'stored' | 'pending_confirm' | 'completed'
export type ReminderType = '1d' | '1h'
export type ThemeName = 'pink' | 'blue' | 'yellow'

export interface RoleItem {
  id: string
  code: string
  name: string
  sortOrder: number
  isActive: boolean
}

export interface Customer {
  id: string
  name: string
  phone: string
  isLongTerm: boolean
  type: CustomerType
  style: string
  hobby: string
  specialNeed: string
  depositStatus: DepositStatus
  tailPaymentDate: string | null
  outfit: string
  location: string
  companions: string
  tags: string[]
}

export interface Schedule {
  id: string
  customerId: string
  serviceTypeCode: string
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

export interface LoginPayload {
  account: string
  password: string
}

export interface CustomerPayload {
  name: string
  phone: string
  isLongTerm?: boolean
  type: CustomerType
  style: string
  hobby: string
  specialNeed: string
  depositStatus: DepositStatus
  tailPaymentDate: string
  outfit: string
  location: string
  companions: string
  tags: string[]
}

export interface SchedulePayload {
  customerId?: string
  serviceTypeCode?: string
  bookingGroupId?: string
  serviceMeta?: Record<string, unknown>
  temporaryCustomer?: {
    name: string
    phone: string
    type?: CustomerType
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
