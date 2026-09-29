<script setup lang="ts">
import { computed } from 'vue'
import { depositStatusText } from '@/constants/options'
import { useCatalogStore } from '@/stores/catalog'
import type { Customer } from '@/api/customers/types'
import type { Schedule } from '@/api/schedules/types'

const props = defineProps<{
  schedule: Schedule
  customer?: Customer
  urgent?: boolean
  inProgress?: boolean
}>()

const emit = defineEmits<{
  click: []
}>()

const catalogStore = useCatalogStore()

const displayRoleCodes = computed(() => {
  if (props.schedule.serviceRoleCodes?.length) {
    return props.schedule.serviceRoleCodes
  }
  return props.schedule.serviceTypeCode === 'makeup' ? ['makeup_artist'] : ['photographer']
})

const roleSummary = computed(() =>
  displayRoleCodes.value.map((code) => catalogStore.getRoleName(code)).join(' · '),
)

const customerType = computed(() =>
  props.customer?.type ? catalogStore.getCustomerTypeName(props.customer.type) : '其他',
)

const statusText = computed(() => {
  if (props.inProgress) return '进行中'
  if (props.urgent) return '即将开始'
  return `定金${depositStatusText[props.schedule.depositStatus]}`
})

const statusClass = computed(() => {
  if (props.inProgress) return 'is-live'
  if (props.urgent) return 'is-urgent'
  return ''
})
</script>

<template>
  <button
    type="button"
    class="home-schedule-card"
    :class="{ 'home-schedule-card--live': inProgress }"
    :aria-label="`查看${customer?.name ?? '未知客户'}的排单详情`"
    @click="emit('click')"
  >
    <span class="home-schedule-card__time">
      <strong>{{ schedule.startTime }}</strong>
      <span>{{ schedule.endTime }}</span>
    </span>

    <span class="home-schedule-card__body">
      <span class="home-schedule-card__head">
        <strong>{{ customer?.name ?? '未知客户' }}</strong>
        <span class="home-schedule-card__type">{{ customerType }}</span>
      </span>

      <span class="home-schedule-card__meta">
        <i class="fa-solid fa-location-dot" />
        <span>{{ schedule.location }}</span>
      </span>

      <span class="home-schedule-card__foot">
        <span class="home-schedule-card__role">
          <i class="fa-solid fa-camera" />{{ roleSummary }}
        </span>
        <span class="home-schedule-card__status" :class="statusClass">{{ statusText }}</span>
      </span>
    </span>
  </button>
</template>

<style scoped>
.home-schedule-card {
  display: grid;
  width: 100%;
  min-height: 112px;
  grid-template-columns: 62px minmax(0, 1fr);
  overflow: hidden;
  border: 1px solid var(--line);
  border-radius: 14px;
  background: var(--theme-surface);
  color: var(--ink);
  text-align: left;
  box-shadow: 0 8px 18px var(--theme-shadow);
  transition:
    transform 180ms ease,
    border-color 180ms ease,
    box-shadow 180ms ease;
}

.home-schedule-card:active {
  transform: scale(0.99);
}

.home-schedule-card:focus-visible {
  outline: 2px solid var(--theme-accent);
  outline-offset: 2px;
}

.home-schedule-card--live {
  border-color: var(--theme-status-border);
  box-shadow: 0 10px 22px color-mix(in srgb, var(--theme-status) 22%, transparent);
}

.home-schedule-card__time {
  display: flex;
  min-height: 112px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-right: 1px solid var(--line);
  background: color-mix(in srgb, var(--theme-accent-bg) 72%, var(--theme-surface));
  font-variant-numeric: tabular-nums;
}

.home-schedule-card--live .home-schedule-card__time {
  background: var(--theme-status-soft);
  color: var(--theme-status);
}

.home-schedule-card__time strong {
  font-size: 14px;
  font-weight: 800;
}

.home-schedule-card__time span {
  margin-top: 3px;
  color: var(--theme-muted-soft);
  font-size: 11px;
  font-weight: 700;
}

.home-schedule-card__body {
  min-width: 0;
  padding: 12px;
}

.home-schedule-card__head,
.home-schedule-card__foot {
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.home-schedule-card__head > strong {
  min-width: 0;
  overflow: hidden;
  font-size: 15px;
  font-weight: 800;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.home-schedule-card__type {
  flex: 0 0 auto;
  border: 1px solid var(--theme-accent-soft);
  border-radius: 999px;
  padding: 2px 7px;
  background: var(--theme-accent-bg);
  color: var(--theme-accent-strong);
  font-size: 11px;
  font-weight: 800;
}

.home-schedule-card__meta {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 6px;
  margin-top: 9px;
  color: var(--theme-muted);
  font-size: 12px;
  font-weight: 600;
}

.home-schedule-card__meta i {
  flex: 0 0 auto;
  color: var(--blue-500);
}

.home-schedule-card__meta span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.home-schedule-card__foot {
  margin-top: 10px;
}

.home-schedule-card__role {
  min-width: 0;
  overflow: hidden;
  color: var(--blue-500);
  font-size: 11px;
  font-weight: 800;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.home-schedule-card__role i {
  margin-right: 4px;
}

.home-schedule-card__status {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 5px;
  color: var(--theme-muted-soft);
  font-size: 11px;
  font-weight: 800;
}

.home-schedule-card__status::before {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--theme-muted-soft);
  content: '';
}

.home-schedule-card__status.is-live,
.home-schedule-card__status.is-urgent {
  color: var(--theme-status);
}

.home-schedule-card__status.is-live::before,
.home-schedule-card__status.is-urgent::before {
  background: var(--theme-status);
}

@media (min-width: 640px) {
  .home-schedule-card {
    grid-template-columns: 72px minmax(0, 1fr);
  }
}
</style>
