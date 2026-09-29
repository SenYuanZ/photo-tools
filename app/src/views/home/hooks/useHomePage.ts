import dayjs from 'dayjs'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCustomerStore } from '@/stores/customers'
import { useScheduleStore } from '@/stores/schedules'
import { formatCnDate } from '@/utils/time'
import {
  getHomeTabForDate,
  getHomeTransitionFeedback,
  parseHomeTab,
  type HomeTab,
} from '@/views/home/homeScheduleRoute'

export function useHomePage() {
  const route = useRoute()
  const router = useRouter()
  const customerStore = useCustomerStore()
  const scheduleStore = useScheduleStore()

  const activeTab = ref<HomeTab>(parseHomeTab(route.query.tab) ?? 'today')
  const nowTick = ref(dayjs())
  const showStoredDatePicker = ref(false)
  const restoreScheduleId = ref('')
  const restoreDateValues = ref(dayjs().format('YYYY-MM-DD').split('-'))
  const restoreMinDate = new Date()
  const storedFeedback = ref('')

  let tickTimer = 0

  onMounted(() => {
    const transitionFeedback = getHomeTransitionFeedback(route.query.transition, activeTab.value)
    if (transitionFeedback) {
      storedFeedback.value = transitionFeedback
      void router.replace({ name: 'home', query: { tab: activeTab.value } })
    }

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

  const formatFutureDay = (date: string) => dayjs(date).format('M月D日 dddd')

  const selectTab = (tab: HomeTab) => {
    activeTab.value = tab
    storedFeedback.value = ''
    void router.replace({ name: 'home', query: { tab } })
  }

  const activeMeta = computed(() => {
    if (activeTab.value === 'tomorrow') {
      return {
        title: '明日排单',
        icon: 'fa-solid fa-cloud-sun',
        empty: '明日暂无排单。',
      }
    }
    if (activeTab.value === 'future') {
      return {
        title: '未来排单',
        icon: 'fa-solid fa-hourglass-half',
        empty: '未来暂无排单。',
      }
    }
    if (activeTab.value === 'stored') {
      return {
        title: '暂存订单',
        icon: 'fa-solid fa-box-archive',
        empty: '当前没有暂存订单。',
      }
    }
    return {
      title: '今日排单',
      icon: 'fa-solid fa-star',
      empty: '今日暂无排单。',
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
  const nextTodaySchedule = computed(() =>
    todaySchedules.value.find((item) =>
      dayjs(`${item.date} ${item.startTime}`).isAfter(nowTick.value),
    ),
  )
  const greetingText = computed(() => {
    const hour = nowTick.value.hour()
    if (hour < 12) return '上午好，今天的安排都在这里'
    if (hour < 18) return '下午好，今天的安排都在这里'
    return '晚上好，今天辛苦了'
  })

  const openRestoreDatePicker = (id: string) => {
    restoreScheduleId.value = id
    restoreDateValues.value = dayjs().format('YYYY-MM-DD').split('-')
    showStoredDatePicker.value = true
  }

  const toScheduleEntry = () => {
    router.push({ name: 'schedule-new' })
  }

  const toCalendar = () => {
    router.push({ name: 'calendar' })
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

    showStoredDatePicker.value = false
    restoreScheduleId.value = ''
    const targetTab = getHomeTabForDate(date)
    activeTab.value = targetTab
    storedFeedback.value = getHomeTransitionFeedback('restored', targetTab)
    void router.replace({ name: 'home', query: { tab: targetTab } })
  }

  return {
    router,
    customerStore,
    activeTab,
    showStoredDatePicker,
    restoreDateValues,
    restoreMinDate,
    storedFeedback,
    storedScheduleSorted,
    today,
    tomorrow,
    todaySchedules,
    tomorrowSchedules,
    futureSchedules,
    futureGroups,
    formatFutureDay,
    selectTab,
    activeMeta,
    activeSchedules,
    toDetail,
    isUrgent,
    isInProgress,
    currentCount,
    inProgressTodayCount,
    nextTodaySchedule,
    greetingText,
    openRestoreDatePicker,
    restoreStoredSchedule,
    toScheduleEntry,
    toCalendar,
    formatCnDate,
  }
}
