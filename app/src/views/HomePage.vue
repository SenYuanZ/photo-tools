<script setup lang="ts">
import dayjs from 'dayjs'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Button, DatePicker, Popup } from 'vant'
import ScheduleCard from '../components/ScheduleCard.vue'
import { formatCnDate } from '../utils/time'
import { useAppStore } from '../stores/app'

const router = useRouter()
const store = useAppStore()

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
  [...store.activeSchedules].sort((left, right) => (left.date + left.startTime).localeCompare(right.date + right.startTime)),
)

const storedScheduleSorted = computed(() =>
  [...store.storedSchedules].sort((left, right) => (left.date + left.startTime).localeCompare(right.date + right.startTime)),
)

const today = dayjs().format('YYYY-MM-DD')
const tomorrow = dayjs().add(1, 'day').format('YYYY-MM-DD')

const todaySchedules = computed(() => scheduleSorted.value.filter((item) => item.date === today))
const tomorrowSchedules = computed(() => scheduleSorted.value.filter((item) => item.date === tomorrow))
const futureSchedules = computed(() => scheduleSorted.value.filter((item) => dayjs(item.date).isAfter(dayjs(tomorrow), 'day')))

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

const inProgressTodayCount = computed(() =>
  todaySchedules.value.filter((item) => isInProgress(item.date, item.startTime, item.endTime)).length,
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
  const result = await store.updateSchedule(scheduleId, {
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

</script>

<template>
  <section class="bounce-in">
    <header class="card home-hero mb-4 overflow-hidden p-4">
      <i class="hero-deco deco-a fa-solid fa-sparkles" />
      <i class="hero-deco deco-b fa-solid fa-star" />
      <i class="hero-deco deco-c fa-solid fa-cloud" />
      <div class="mb-2 flex items-center justify-between gap-2">
        <h1 class="title-font text-3xl text-rose-500">我的排单</h1>
        <span class="chip"><i class="fa-regular fa-calendar" />{{ dayjs().format('MM/DD') }}</span>
      </div>
      <p class="text-sm font-bold">{{ formatCnDate(today) }}</p>
      <p class="mt-1 text-xs text-slate-500">
        <i class="fa-solid fa-wand-magic-sparkles mr-1 text-amber-500" />
        今天有 {{ todaySchedules.length }} 组，其中进行中
        <span :class="hasInProgress ? 'text-amber-600 font-extrabold' : 'text-slate-400 font-bold'">{{ inProgressTodayCount }}</span>
        组，去拍点超有趣的画面吧！
      </p>
    </header>

    <article class="card mb-4 p-1.5">
      <div class="relative grid grid-cols-4 gap-1 overflow-hidden rounded-xl bg-slate-50/80 p-1">
        <div class="tab-indicator" :class="tabIndicatorClass" />
        <button
          type="button"
          class="relative z-10 inline-flex items-center justify-center gap-1 rounded-xl px-2 py-2 text-xs font-bold leading-none transition whitespace-nowrap"
          :class="activeTab === 'today' ? 'text-rose-500' : 'text-slate-500'"
          @click="activeTab = 'today'"
        >
          <i class="fa-solid fa-star" />
          今日（{{ todaySchedules.length }}）
        </button>
        <button
          type="button"
          class="relative z-10 inline-flex items-center justify-center gap-1 rounded-xl px-2 py-2 text-xs font-bold leading-none transition whitespace-nowrap"
          :class="activeTab === 'tomorrow' ? 'text-blue-500' : 'text-slate-500'"
          @click="activeTab = 'tomorrow'"
        >
          <i class="fa-solid fa-cloud-sun" />
          明日（{{ tomorrowSchedules.length }}）
        </button>
        <button
          type="button"
          class="relative z-10 inline-flex items-center justify-center gap-1 rounded-xl px-2 py-2 text-xs font-bold leading-none transition whitespace-nowrap"
          :class="activeTab === 'future' ? 'text-amber-600' : 'text-slate-500'"
          @click="activeTab = 'future'"
        >
          <i class="fa-solid fa-hourglass-half" />
          未来（{{ futureSchedules.length }}）
        </button>
        <button
          type="button"
          class="relative z-10 inline-flex items-center justify-center gap-1 rounded-xl px-2 py-2 text-xs font-bold leading-none transition whitespace-nowrap"
          :class="activeTab === 'stored' ? 'text-indigo-600' : 'text-slate-500'"
          @click="activeTab = 'stored'"
        >
          <i class="fa-solid fa-box-archive" />
          暂存（{{ storedScheduleSorted.length }}）
        </button>
      </div>
    </article>

    <article class="mb-4">
      <div class="mb-2 flex items-center justify-between">
        <p class="text-[15px] font-extrabold"><i class="mr-1" :class="activeMeta.icon" />{{ activeMeta.title }}</p>
        <div class="flex items-center gap-1.5">
          <span
            v-if="activeTab === 'today'"
            class="chip live-chip"
            :class="hasInProgress ? 'live-chip--active' : 'live-chip--idle'"
          >
            <span class="live-dot" :class="hasInProgress ? 'live-dot--active' : 'live-dot--idle'" />进行中 {{ inProgressTodayCount }} 组
          </span>
          <span class="chip home-count" :class="cardToneClass">{{ currentCount }} 人</span>
        </div>
      </div>

      <div v-if="activeTab === 'future' && futureGroups.length" class="space-y-3">
        <article
          v-for="group in futureGroups"
          :key="group.date"
          class="card overflow-hidden border-amber-100 p-2.5 soft-yellow"
        >
          <header class="mb-2 flex items-center justify-between rounded-xl bg-white/80 px-2.5 py-2">
            <p class="text-sm font-extrabold text-amber-700">
              <i class="fa-regular fa-calendar-days mr-1" />{{ formatFutureDay(group.date) }}
            </p>
            <span class="chip border-amber-200 text-amber-600">{{ group.items.length }} 组</span>
          </header>
          <ScheduleCard
            v-for="(item, index) in group.items"
            :key="item.id"
            class="schedule-pop"
            :style="{ animationDelay: `${index * 80}ms` }"
            :schedule="item"
            :customer="store.getCustomerById(item.customerId)"
            @click="toDetail(item.id)"
          />
        </article>
      </div>

      <div v-else-if="activeTab === 'stored' && activeSchedules.length" class="space-y-2">
        <article v-for="item in activeSchedules" :key="item.id" class="rounded-xl border border-indigo-100 bg-white/85 p-2.5">
          <div class="mb-2 flex items-center justify-between gap-2">
            <p class="font-bold text-slate-700">{{ store.getCustomerById(item.customerId)?.name || '未知客户' }}</p>
            <span class="chip border-slate-200 text-slate-600">原档期 {{ dayjs(item.date).format('MM/DD') }} {{ item.startTime }}</span>
          </div>
          <p class="mb-2 text-xs text-slate-500"><i class="fa-solid fa-location-dot mr-1 text-blue-400" />{{ item.location }}</p>
          <div class="grid grid-cols-2 gap-2">
            <Button size="small" round plain type="primary" @click="openRestoreDatePicker(item.id)">
              <i class="fa-solid fa-calendar-check mr-1" />恢复并选日期
            </Button>
            <Button size="small" round plain type="default" @click="toDetail(item.id)">
              <i class="fa-solid fa-circle-info mr-1" />查看详情
            </Button>
          </div>
        </article>
      </div>

      <div v-else-if="activeSchedules.length">
        <ScheduleCard
          v-for="(item, index) in activeSchedules"
          :key="item.id"
          class="schedule-pop"
          :style="{ animationDelay: `${index * 80}ms` }"
          :schedule="item"
          :customer="store.getCustomerById(item.customerId)"
          :in-progress="activeTab === 'today' && isInProgress(item.date, item.startTime, item.endTime)"
          :urgent="activeTab === 'today' && isUrgent(item.date, item.startTime)"
          @click="toDetail(item.id)"
        />
      </div>

      <div v-else class="card p-3 text-sm text-slate-500">{{ activeMeta.empty }}</div>
    </article>
    <p v-if="storedFeedback" class="mb-3 text-xs text-blue-600">{{ storedFeedback }}</p>

    <Popup v-model:show="showStoredDatePicker" position="bottom" round>
      <DatePicker
        v-model="restoreDateValues"
        title="恢复排单日期"
        @cancel="showStoredDatePicker = false"
        @confirm="({ selectedValues }: any) => restoreStoredSchedule(selectedValues)"
      />
    </Popup>
  </section>
</template>

<style scoped>
.home-hero {
  position: relative;
}

.hero-deco {
  position: absolute;
  opacity: 0.25;
  animation: float-up 2.8s ease-in-out infinite;
}

.deco-a {
  right: 14px;
  top: 12px;
  color: #ff73a8;
}

.deco-b {
  right: 44px;
  bottom: 16px;
  color: #5ca5ff;
  animation-delay: 0.4s;
}

.deco-c {
  right: 18px;
  bottom: 8px;
  color: #f0b63d;
  animation-delay: 0.8s;
}

.tab-indicator {
  position: absolute;
  left: 4px;
  top: 4px;
  width: calc((100% - 8px) / 4);
  height: calc(100% - 8px);
  border-radius: 10px;
  transition: transform 260ms ease, background-color 260ms ease;
}

.home-count {
  animation: count-pop 480ms ease;
}

.live-chip {
  transition: background-color 180ms ease, border-color 180ms ease, color 180ms ease;
}

.live-chip--active {
  border-color: #ffd6a6;
  color: #b96c12;
  background: #fff6e8;
}

.live-chip--idle {
  border-color: #e5e7eb;
  color: #94a3b8;
  background: #f8fafc;
}

.live-dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  margin-right: 4px;
  border-radius: 999px;
}

.live-dot--active {
  background: #ff9f1a;
  animation: live-chip-dot 1.2s ease-in-out infinite;
}

.live-dot--idle {
  background: #cbd5e1;
}

.schedule-pop {
  animation: schedule-pop 460ms ease both;
}

.schedule-pop.pulse-alert {
  animation:
    schedule-pop 460ms ease both,
    pulse-alert 2.4s cubic-bezier(0.45, 0.05, 0.55, 0.95) 520ms infinite;
}

@keyframes float-up {
  0%,
  100% {
    transform: translateY(0) rotate(0deg);
  }

  50% {
    transform: translateY(-5px) rotate(7deg);
  }
}

@keyframes count-pop {
  0% {
    transform: scale(0.85);
    opacity: 0.6;
  }

  100% {
    transform: scale(1);
    opacity: 1;
  }
}

@keyframes schedule-pop {
  0% {
    opacity: 0;
    transform: translateY(10px) scale(0.98);
  }

  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes live-chip-dot {
  0%,
  100% {
    transform: scale(1);
    opacity: 0.75;
  }

  50% {
    transform: scale(1.35);
    opacity: 1;
  }
}
</style>
