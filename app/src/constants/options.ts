import type { CustomerType, DepositStatus } from '../types/models'

export const customerTypeText: Record<CustomerType, string> = {
  personal: '个人写真',
  couple: '情侣',
  family: '亲子',
  business: '商业',
  other: '其他',
}

export const depositStatusText: Record<DepositStatus, string> = {
  unpaid: '未支付',
  paid: '已支付',
  full: '全款',
}

export const customerTypeOptions = Object.entries(customerTypeText)
export const depositStatusOptions = Object.entries(depositStatusText)

export const timeOptions = Array.from({ length: 48 }, (_, index) => {
  const hour = Math.floor(index / 2)
  const minute = index % 2 === 0 ? '00' : '30'
  return `${String(hour).padStart(2, '0')}:${minute}`
})

export const timeHourOptions = Array.from({ length: 24 }, (_, index) => {
  const value = String(index).padStart(2, '0')
  return { text: value, value }
})

export const timeMinuteOptions = [
  { text: '00', value: '00' },
  { text: '30', value: '30' },
]
