import dayjs from 'dayjs'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useCustomerStore } from '@/stores/customers'
import { useScheduleStore } from '@/stores/schedules'
import { formatCnDate } from '@/utils/time'

export function useHomePage() {
  const router = useRouter()
  const customerStore = useCustomerStore()
  const scheduleStore = useScheduleStore()

  type HomeTab = 'today' | 'tomorrow' | 'future' | 'stored'

  const activeTab = ref<HomeTab>('today')
  const nowTick = ref(dayjs())
  const showStoredDatePicker = ref(false)
  const restoreScheduleId = ref('')
  const restoreDateValues = ref(dayjs().format('YYYY-MM-DD').split('-'))
  const storedFeedback = ref('')

  let tickTimer = 0

  onMounted(() => {
    tickTimer = window.setInterval(() => {
      nowTick.value = dayjs()
    }, 30000)
  })

  onBeforeUnmount(() => {
    window.clearInterval(tickTimer)
  })

  const scheduleSorted = computed(() =>
    [...scheduleStore.activeSchedules].sort((left, right) =>
      (left.date + left.startTime).localeCompare(right.date + right.startTime),
    ),
  )

  const storedScheduleSorted = computed(() =>
    [...scheduleStore.storedSchedules].sort((left, right) =>
      (left.date + left.startTime).localeCompare(right.date + right.startTime),
    ),
  )

  const today = dayjs().format('YYYY-MM-DD')
  const tomorrow = dayjs().add(1, 'day').format('YYYY-MM-DD')

  const todaySchedules = computed(() => scheduleSorted.value.filter((item) => item.date === today))
  const tomorrowSchedules = computed(() =>
    scheduleSorted.value.filter((item) => item.date === tomorrow),
  )
  const futureSchedules = computed(() =>
    scheduleSorted.value.filter((item) => dayjs(item.date).isAfter(dayjs(tomorrow), 'day')),
  )

  const futureGroups = computed(() => {
    const group = new Map<string, typeof futureSchedules.value>()
    futureSchedules.value.forEach((item) => {
      const list = group.get(item.date) ?? []
      list.push(item)
      group.set(item.date, list)
    })

    return [...group.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([date, items]) => ({ date, items }))
  })

  const tabIndicatorClass = computed(() => {
    if (activeTab.value === 'tomorrow') {
      return 'translate-x-full bg-blue-100'
    }
    if (activeTab.value === 'future') {
      return 'translate-x-[200%] bg-amber-100'
    }
    if (activeTab.value === 'stored') {
      return 'translate-x-[300%] bg-indigo-100'
    }
    return 'translate-x-0 bg-rose-100'
  })

  const formatFutureDay = (date: string) => dayjs(date).format('M月D日 dddd')

  const activeMeta = computed(() => {
    if (activeTab.value === 'tomorrow') {
      return {
        title: '明日排单',
        icon: 'fa-solid fa-cloud-sun text-blue-500',
        empty: '明日暂无排单。',
      }
    }
    if (activeTab.value === 'future') {
      return {
        title: '未来排单',
        icon: 'fa-solid fa-hourglass-half text-amber-500',
        empty: '未来暂无排单。',
      }
    }
    if (activeTab.value === 'stored') {
      return {
        title: '暂存订单',
        icon: 'fa-solid fa-box-archive text-indigo-500',
        empty: '当前没有暂存订单。',
      }
    }
    return {
      title: '今日排单',
      icon: 'fa-solid fa-star text-rose-500',
      empty: '暂无排单哦～',
    }
  })

  const activeSchedules = computed(() => {
    if (activeTab.value === 'tomorrow') {
      return tomorrowSchedules.value
    }
    if (activeTab.value === 'future') {
      return futureSchedules.value
    }
    if (activeTab.value === 'stored') {
      return storedScheduleSorted.value
    }
    return todaySchedules.value
  })

  const toDetail = (id: string) => {
    router.push({ name: 'schedule-detail', params: { id } })
  }

  const isUrgent = (date: string, startTime: string) => {
    const start = dayjs(`${date} ${startTime}`)
    const diff = start.diff(nowTick.value, 'minute')
    return diff > 0 && diff <= 60
  }

  const isInProgress = (date: string, startTime: string, endTime: string) => {
    const start = dayjs(`${date} ${startTime}`)
    const end = dayjs(`${date} ${endTime}`)
    return !nowTick.value.isBefore(start) && nowTick.value.isBefore(end)
  }

  const currentCount = computed(() => {
    if (activeTab.value === 'tomorrow') {
      return tomorrowSchedules.value.length
    }
    if (activeTab.value === 'future') {
      return futureSchedules.value.length
    }
    if (activeTab.value === 'stored') {
      return storedScheduleSorted.value.length
    }
    return todaySchedules.value.length
  })

  const inProgressTodayCount = computed(
    () =>
      todaySchedules.value.filter((item) => isInProgress(item.date, item.startTime, item.endTime))
        .length,
  )
  const hasInProgress = computed(() => inProgressTodayCount.value > 0)

  const cardToneClass = computed(() => {
    if (activeTab.value === 'tomorrow') {
      return 'text-blue-500'
    }
    if (activeTab.value === 'future') {
      return 'text-amber-600'
    }
    if (activeTab.value === 'stored') {
      return 'text-indigo-600'
    }
    return 'text-rose-500'
  })

  const openRestoreDatePicker = (id: string) => {
    restoreScheduleId.value = id
    restoreDateValues.value = dayjs().format('YYYY-MM-DD').split('-')
    showStoredDatePicker.value = true
  }

  const normalizeDate = (values: string[]) => {
    const [year, month, day] = values
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }

  const restoreStoredSchedule = async (selectedValues: string[]) => {
    const scheduleId = restoreScheduleId.value
    if (!scheduleId) {
      showStoredDatePicker.value = false
      return
    }

    const date = normalizeDate(selectedValues)
    const result = await scheduleStore.updateSchedule(scheduleId, {
      status: 'normal',
      date,
    })

    if (!result.ok) {
      storedFeedback.value = '恢复失败：该时段有冲突，请换个时间。'
      return
    }

    storedFeedback.value = `已恢复排单至 ${formatCnDate(date)}`
    showStoredDatePicker.value = false
    restoreScheduleId.value = ''
  }

  return {
    router,
    customerStore,
    activeTab,
    showStoredDatePicker,
    restoreDateValues,
    storedFeedback,
    storedScheduleSorted,
    today,
    tomorrow,
    todaySchedules,
    tomorrowSchedules,
    futureSchedules,
    futureGroups,
    tabIndicatorClass,
    formatFutureDay,
    activeMeta,
    activeSchedules,
    toDetail,
    isUrgent,
    isInProgress,
    currentCount,
    inProgressTodayCount,
    hasInProgress,
    cardToneClass,
    openRestoreDatePicker,
    restoreStoredSchedule,
    formatCnDate,
  }
}
