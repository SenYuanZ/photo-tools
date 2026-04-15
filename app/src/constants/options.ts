import type { DepositStatus } from '../types/models'

export const depositStatusText: Record<DepositStatus, string> = {
  unpaid: '未支付',
  paid: '已支付',
  full: '全款',
}

export const depositStatusOptions = Object.entries(depositStatusText)

export const timeOptions = Array.from({ length: 288 }, (_, index) => {
  const hour = Math.floor(index / 12)
  const minute = String((index % 12) * 5).padStart(2, '0')
  return `${String(hour).padStart(2, '0')}:${minute}`
})

export const timeHourOptions = Array.from({ length: 24 }, (_, index) => {
  const value = String(index).padStart(2, '0')
  return { text: value, value }
})

export const timeMinuteOptions = [
  { text: '00', value: '00' },
  { text: '05', value: '05' },
  { text: '10', value: '10' },
  { text: '15', value: '15' },
  { text: '20', value: '20' },
  { text: '25', value: '25' },
  { text: '30', value: '30' },
  { text: '35', value: '35' },
  { text: '40', value: '40' },
  { text: '45', value: '45' },
  { text: '50', value: '50' },
  { text: '55', value: '55' },
]
