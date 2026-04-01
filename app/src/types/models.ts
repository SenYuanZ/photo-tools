export type CustomerType = 'personal' | 'couple' | 'family' | 'business' | 'other'
export type DepositStatus = 'unpaid' | 'paid' | 'full'
export type ReminderType = '1d' | '1h'
export type ThemeName = 'pink' | 'blue' | 'yellow'

export interface Customer {
  id: string
  name: string
  phone: string
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
  date: string
  startTime: string
  endTime: string
  location: string
  note: string
  referenceImages: string[]
  depositStatus: DepositStatus
  amount: number
  reminders: ReminderType[]
}

export interface LoginPayload {
  account: string
  password: string
}

export interface CustomerPayload {
  name: string
  phone: string
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
  customerId: string
  date: string
  startTime: string
  endTime: string
  location: string
  note: string
  referenceImages: string[]
  depositStatus: DepositStatus
  amount: number
  reminders: ReminderType[]
}
