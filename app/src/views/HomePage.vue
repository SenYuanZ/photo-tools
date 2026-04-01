<script setup lang="ts">
import dayjs from 'dayjs'
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import ScheduleCard from '../components/ScheduleCard.vue'
import { formatCnDate } from '../utils/time'
import { useAppStore } from '../stores/app'

const router = useRouter()
const store = useAppStore()

type HomeTab = 'today' | 'tomorrow' | 'future'

const activeTab = ref<HomeTab>('today')

const scheduleSorted = computed(() =>
  [...store.schedules].sort((left, right) => (left.date + left.startTime).localeCompare(right.date + right.startTime)),
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
  return todaySchedules.value
})

const toDetail = (id: string) => {
  router.push({ name: 'schedule-detail', params: { id } })
}

const isUrgent = (date: string, startTime: string) => {
  const start = dayjs(`${date} ${startTime}`)
  const diff = start.diff(dayjs(), 'minute')
  return diff > 0 && diff <= 60
}

const currentCount = computed(() => {
  if (activeTab.value === 'tomorrow') {
    return tomorrowSchedules.value.length
  }
  if (activeTab.value === 'future') {
    return futureSchedules.value.length
  }
  return todaySchedules.value.length
})

const cardToneClass = computed(() => {
  if (activeTab.value === 'tomorrow') {
    return 'text-blue-500'
  }
  if (activeTab.value === 'future') {
    return 'text-amber-600'
  }
  return 'text-rose-500'
})
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
        今天有 {{ todaySchedules.length }} 组，去拍点超有趣的画面吧！
      </p>
    </header>

    <article class="card mb-4 p-1.5">
      <div class="relative grid grid-cols-3 gap-1 overflow-hidden rounded-xl bg-slate-50/80 p-1">
        <div class="tab-indicator" :class="tabIndicatorClass" />
        <button
          type="button"
          class="relative z-10 rounded-xl px-2 py-2 text-xs font-bold transition"
          :class="activeTab === 'today' ? 'text-rose-500' : 'text-slate-500'"
          @click="activeTab = 'today'"
        >
          <i class="fa-solid fa-star mr-1" />
          今日（{{ todaySchedules.length }}）
        </button>
        <button
          type="button"
          class="relative z-10 rounded-xl px-2 py-2 text-xs font-bold transition"
          :class="activeTab === 'tomorrow' ? 'text-blue-500' : 'text-slate-500'"
          @click="activeTab = 'tomorrow'"
        >
          <i class="fa-solid fa-cloud-sun mr-1" />
          明日（{{ tomorrowSchedules.length }}）
        </button>
        <button
          type="button"
          class="relative z-10 rounded-xl px-2 py-2 text-xs font-bold transition"
          :class="activeTab === 'future' ? 'text-amber-600' : 'text-slate-500'"
          @click="activeTab = 'future'"
        >
          <i class="fa-solid fa-hourglass-half mr-1" />
          未来（{{ futureSchedules.length }}）
        </button>
      </div>
    </article>

    <article class="mb-4">
      <div class="mb-2 flex items-center justify-between">
        <p class="text-[15px] font-extrabold"><i class="mr-1" :class="activeMeta.icon" />{{ activeMeta.title }}</p>
        <span class="chip home-count" :class="cardToneClass">{{ currentCount }} 人</span>
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

      <div v-else-if="activeSchedules.length">
        <ScheduleCard
          v-for="(item, index) in activeSchedules"
          :key="item.id"
          class="schedule-pop"
          :style="{ animationDelay: `${index * 80}ms` }"
          :schedule="item"
          :customer="store.getCustomerById(item.customerId)"
          :urgent="activeTab === 'today' && isUrgent(item.date, item.startTime)"
          @click="toDetail(item.id)"
        />
      </div>

      <div v-else class="card p-3 text-sm text-slate-500">{{ activeMeta.empty }}</div>
    </article>
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
  width: calc((100% - 8px) / 3);
  height: calc(100% - 8px);
  border-radius: 10px;
  transition: transform 260ms ease, background-color 260ms ease;
}

.home-count {
  animation: count-pop 480ms ease;
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
</style>
