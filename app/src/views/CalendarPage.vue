<script setup lang="ts">
import dayjs from 'dayjs'
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import PageHeader from '../components/PageHeader.vue'
import ScheduleCard from '../components/ScheduleCard.vue'
import { useScheduleCalendar } from '../composables/useScheduleCalendar'
import { useAppStore } from '../stores/app'
import { formatCnDate } from '../utils/time'

const router = useRouter()
const store = useAppStore()

const {
  monthLabel,
  weekLabels,
  selectedDate,
  calendarCells,
  receivedSchedules,
  completedSchedules,
  monthTotalCount,
  setSelectedDate,
  goPrevMonth,
  goNextMonth,
  goCurrentMonth,
} = useScheduleCalendar(() => store.activeSchedules)

const selectedDateLabel = computed(() => formatCnDate(selectedDate.value))

const receivedCountLabel = computed(() => `${receivedSchedules.value.length} 单`)
const completedCountLabel = computed(() => `${completedSchedules.value.length} 单`)
const monthTotalLabel = computed(() => `本月共 ${monthTotalCount.value} 单`)

const toDetail = (id: string) => {
  router.push({ name: 'schedule-detail', params: { id } })
}

const isInProgress = (date: string, startTime: string, endTime: string) => {
  const now = dayjs()
  const start = dayjs(`${date} ${startTime}`)
  const end = dayjs(`${date} ${endTime}`)
  return !now.isBefore(start) && now.isBefore(end)
}
</script>

<template>
  <section class="bounce-in">
    <PageHeader title="排单日历" />

    <article class="card mb-4 overflow-hidden p-3 calendar-hero">
      <div class="mb-3 flex items-center justify-between">
        <button type="button" class="chip calendar-chip" @click="goPrevMonth">
          <i class="fa-solid fa-angle-left" />上月
        </button>
        <p class="title-font text-2xl text-rose-500">{{ monthLabel }}</p>
        <button type="button" class="chip calendar-chip" @click="goNextMonth">
          下月<i class="fa-solid fa-angle-right" />
        </button>
      </div>

      <div class="mb-2 grid grid-cols-7 gap-1 text-center text-xs font-extrabold text-slate-500">
        <span v-for="item in weekLabels" :key="item">{{ item }}</span>
      </div>

      <div class="grid grid-cols-7 gap-1">
        <button
          v-for="item in calendarCells"
          :key="item.date"
          type="button"
          class="calendar-cell"
          :class="{
            'calendar-cell--muted': !item.isCurrentMonth,
            'calendar-cell--today': item.isToday,
            'calendar-cell--active': item.isSelected,
          }"
          @click="setSelectedDate(item.date)"
        >
          <span class="calendar-day">{{ item.day }}</span>
          <span v-if="item.receivedCount" class="calendar-badge calendar-badge--received">接{{ item.receivedCount }}</span>
          <span v-if="item.completedCount" class="calendar-badge calendar-badge--completed">完{{ item.completedCount }}</span>
        </button>
      </div>

      <div class="mt-3 flex items-center justify-between text-xs text-slate-500">
        <p><i class="fa-regular fa-calendar-check mr-1 text-rose-500" />{{ selectedDateLabel }}</p>
        <p class="font-extrabold text-rose-500"><i class="fa-solid fa-film mr-1" />{{ monthTotalLabel }}</p>
        <button type="button" class="chip" @click="goCurrentMonth">回到今天</button>
      </div>
    </article>

    <article class="mb-4 grid gap-3 sm:grid-cols-2">
      <section class="card p-3 soft-blue">
        <header class="mb-2 flex items-center justify-between">
          <p class="font-extrabold text-blue-600"><i class="fa-solid fa-inbox mr-1" />当天接单</p>
          <span class="chip border-blue-200 text-blue-600">{{ receivedCountLabel }}</span>
        </header>
        <div v-if="receivedSchedules.length">
          <ScheduleCard
            v-for="item in receivedSchedules"
            :key="item.id"
            :schedule="item"
            :customer="store.getCustomerById(item.customerId)"
            :in-progress="isInProgress(item.date, item.startTime, item.endTime)"
            @click="toDetail(item.id)"
          />
        </div>
        <p v-else class="rounded-xl bg-white/70 px-3 py-2 text-sm text-slate-500">当天暂无接单。</p>
      </section>

      <section class="card p-3 soft-yellow">
        <header class="mb-2 flex items-center justify-between">
          <p class="font-extrabold text-amber-700"><i class="fa-solid fa-circle-check mr-1" />当天完成</p>
          <span class="chip border-amber-200 text-amber-700">{{ completedCountLabel }}</span>
        </header>
        <div v-if="completedSchedules.length">
          <ScheduleCard
            v-for="item in completedSchedules"
            :key="item.id"
            :schedule="item"
            :customer="store.getCustomerById(item.customerId)"
            @click="toDetail(item.id)"
          />
        </div>
        <p v-else class="rounded-xl bg-white/70 px-3 py-2 text-sm text-slate-500">当天暂无已完成单。</p>
      </section>
    </article>
  </section>
</template>

<style scoped>
.calendar-hero {
  background: linear-gradient(160deg, #fff4fa 0%, #f4f9ff 58%, #fffef4 100%);
}

.calendar-chip {
  min-width: 66px;
  justify-content: center;
}

.calendar-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  gap: 2px;
  min-height: 58px;
  border-radius: 10px;
  border: 1px solid #f2e4ef;
  background: rgba(255, 255, 255, 0.9);
  padding: 5px 2px;
  transition: transform 140ms ease, border-color 160ms ease, box-shadow 160ms ease;
}

.calendar-cell:active {
  transform: scale(0.97);
}

.calendar-cell--muted {
  opacity: 0.45;
}

.calendar-cell--today {
  border-color: #ffc6de;
}

.calendar-cell--active {
  border-color: var(--theme-accent);
  box-shadow: 0 8px 16px rgba(var(--theme-accent-rgb), 0.2);
}

.calendar-day {
  font-size: 13px;
  font-weight: 800;
  color: #4a3f62;
}

.calendar-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 28px;
  border-radius: 999px;
  padding: 0 6px;
  font-size: 10px;
  line-height: 16px;
  font-weight: 700;
}

.calendar-badge--received {
  color: #2563eb;
  background: #e8f2ff;
}

.calendar-badge--completed {
  color: #0f766e;
  background: #defaf2;
}
</style>
