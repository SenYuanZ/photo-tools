import dayjs from 'dayjs'
import { computed, ref, type ComputedRef } from 'vue'
import type { Schedule } from '../types/models'

type CalendarCell = {
  date: string
  day: number
  isCurrentMonth: boolean
  isToday: boolean
  isSelected: boolean
  receivedCount: number
  completedCount: number
  pendingConfirmCount: number
}

type UseScheduleCalendarReturn = {
  monthLabel: ComputedRef<string>
  weekLabels: string[]
  selectedDate: ComputedRef<string>
  calendarCells: ComputedRef<CalendarCell[]>
  selectedSchedules: ComputedRef<Schedule[]>
  receivedSchedules: ComputedRef<Schedule[]>
  completedSchedules: ComputedRef<Schedule[]>
  pendingConfirmSchedules: ComputedRef<Schedule[]>
  monthTotalCount: ComputedRef<number>
  setSelectedDate: (date: string) => void
  goPrevMonth: () => void
  goNextMonth: () => void
  goCurrentMonth: () => void
}

const WEEK_LABELS = ['一', '二', '三', '四', '五', '六', '日']

const sortSchedules = (list: Schedule[]) =>
  [...list].sort((left, right) => (left.date + left.startTime).localeCompare(right.date + right.startTime))

const isOverByEndTime = (date: string, endTime: string, now: dayjs.Dayjs) => {
  const endAt = dayjs(`${date} ${endTime}`)
  return now.isAfter(endAt)
}

export const useScheduleCalendar = (schedules: () => Schedule[]): UseScheduleCalendarReturn => {
  const monthCursor = ref(dayjs().startOf('month'))
  const selectedDateState = ref(dayjs().format('YYYY-MM-DD'))

  const scheduleMapByDate = computed(() => {
    const map = new Map<string, Schedule[]>()
    schedules().forEach((item) => {
      const list = map.get(item.date) ?? []
      list.push(item)
      map.set(item.date, list)
    })

    map.forEach((list, key) => {
      map.set(key, sortSchedules(list))
    })

    return map
  })

  const monthLabel = computed(() => monthCursor.value.format('YYYY年M月'))

  const selectedDate = computed(() => selectedDateState.value)

  const selectedSchedules = computed(() => scheduleMapByDate.value.get(selectedDate.value) ?? [])

  const receivedSchedules = computed(() => {
    const now = dayjs()
    return selectedSchedules.value.filter(
      (item) => item.status === 'normal' && !isOverByEndTime(item.date, item.endTime, now),
    )
  })

  const completedSchedules = computed(() => selectedSchedules.value.filter((item) => item.status === 'completed'))

  const pendingConfirmSchedules = computed(() => {
    const now = dayjs()
    return selectedSchedules.value.filter(
      (item) => item.status === 'pending_confirm' || (item.status === 'normal' && isOverByEndTime(item.date, item.endTime, now)),
    )
  })

  const monthTotalCount = computed(() => {
    return schedules().filter((item) => {
      const itemDate = dayjs(item.date)
      return itemDate.isSame(monthCursor.value, 'month')
    }).length
  })

  const calendarCells = computed(() => {
    const monthStart = monthCursor.value.startOf('month')
    const monthEnd = monthCursor.value.endOf('month')
    const today = dayjs().format('YYYY-MM-DD')
    const firstWeekday = (monthStart.day() + 6) % 7
    const start = monthStart.subtract(firstWeekday, 'day')
    const totalDays = Math.ceil((firstWeekday + monthEnd.date()) / 7) * 7
    const now = dayjs()
    return Array.from({ length: totalDays }, (_value, index) => {
      const date = start.add(index, 'day')
      const dateString = date.format('YYYY-MM-DD')
      const dateSchedules = scheduleMapByDate.value.get(dateString) ?? []
      const receivedCount = dateSchedules.filter(
        (item) => item.status === 'normal' && !isOverByEndTime(item.date, item.endTime, now),
      ).length
      const completedCount = dateSchedules.filter((item) => item.status === 'completed').length
      const pendingConfirmCount = dateSchedules.filter(
        (item) => item.status === 'pending_confirm' || (item.status === 'normal' && isOverByEndTime(item.date, item.endTime, now)),
      ).length

      return {
        date: dateString,
        day: date.date(),
        isCurrentMonth: date.isSame(monthStart, 'month'),
        isToday: dateString === today,
        isSelected: dateString === selectedDate.value,
        receivedCount,
        completedCount,
        pendingConfirmCount,
      }
    })
  })

  const setSelectedDate = (date: string) => {
    selectedDateState.value = date
    monthCursor.value = dayjs(date).startOf('month')
  }

  const goPrevMonth = () => {
    monthCursor.value = monthCursor.value.subtract(1, 'month')
    const sameDay = dayjs(selectedDateState.value)
    if (!sameDay.isSame(monthCursor.value, 'month')) {
      selectedDateState.value = monthCursor.value.startOf('month').format('YYYY-MM-DD')
    }
  }

  const goNextMonth = () => {
    monthCursor.value = monthCursor.value.add(1, 'month')
    const sameDay = dayjs(selectedDateState.value)
    if (!sameDay.isSame(monthCursor.value, 'month')) {
      selectedDateState.value = monthCursor.value.startOf('month').format('YYYY-MM-DD')
    }
  }

  const goCurrentMonth = () => {
    const today = dayjs()
    monthCursor.value = today.startOf('month')
    selectedDateState.value = today.format('YYYY-MM-DD')
  }

  return {
    monthLabel,
    weekLabels: WEEK_LABELS,
    selectedDate,
    calendarCells,
    selectedSchedules,
    receivedSchedules,
    completedSchedules,
    pendingConfirmSchedules,
    monthTotalCount,
    setSelectedDate,
    goPrevMonth,
    goNextMonth,
    goCurrentMonth,
  }
}
