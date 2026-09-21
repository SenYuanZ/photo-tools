import type { CustomerType, DepositStatus } from '@/types/common'

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

export interface CustomerRequest {
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
