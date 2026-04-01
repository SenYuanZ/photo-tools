import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'

dayjs.locale('zh-cn')

export const toMinutes = (time: string) => {
  const [hour, minute] = time.split(':').map(Number)
  return hour * 60 + minute
}

export const formatCnDate = (date: string) => dayjs(date).format('YYYY年M月D日 dddd')

export const isAfterTime = (startTime: string, endTime: string) => toMinutes(endTime) > toMinutes(startTime)

export const isDateSameOrAfterTomorrow = (date: string) => {
  const tomorrow = dayjs().add(1, 'day').startOf('day')
  return dayjs(date).startOf('day').isAfter(tomorrow)
}

export const isTimeOverlap = (
  leftStart: string,
  leftEnd: string,
  rightStart: string,
  rightEnd: string,
) => {
  const lStart = toMinutes(leftStart)
  const lEnd = toMinutes(leftEnd)
  const rStart = toMinutes(rightStart)
  const rEnd = toMinutes(rightEnd)
  return lStart < rEnd && rStart < lEnd
}

export const makeId = (prefix: string) => `${prefix}_${Math.random().toString(36).slice(2, 10)}`
