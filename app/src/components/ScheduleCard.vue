<script setup lang="ts">
import { computed } from 'vue'
import ServiceTags from './ServiceTags.vue'
import { depositStatusText } from '../constants/options'
import { useAppStore } from '../stores/app'
import type { Customer, Schedule } from '../types/models'

const props = defineProps<{
  schedule: Schedule
  customer?: Customer
  urgent?: boolean
  inProgress?: boolean
}>()

const emit = defineEmits<{
  click: []
}>()

const store = useAppStore()

const typeTagClass = computed(() => {
  const type = props.customer?.type
  if (type === 'couple') {
    return 'bg-blue-50 text-blue-500 border-blue-100'
  }
  if (type === 'business') {
    return 'bg-yellow-50 text-amber-600 border-yellow-200'
  }
  return 'bg-rose-50 text-rose-500 border-rose-100'
})

const cardToneClass = computed(() => {
  if (props.inProgress) {
    return 'shooting-live'
  }
  if (props.urgent) {
    return 'soft-blue pulse-alert'
  }
  return 'soft-pink'
})

const displayRoleCodes = computed(() => {
  if (props.schedule.serviceRoleCodes?.length) {
    return props.schedule.serviceRoleCodes
  }
  return props.schedule.serviceTypeCode === 'makeup' ? ['makeup_artist'] : ['photographer']
})
</script>

<template>
  <article
    class="card mb-2 cursor-pointer p-3 transition hover:-translate-y-0.5"
    :class="cardToneClass"
    @click="emit('click')"
  >
    <div class="mb-2 flex items-center justify-between gap-2">
      <p class="font-extrabold">
        {{ customer?.name ?? '未知客户' }}
        <span class="chip ml-1 border" :class="typeTagClass">{{ customer?.type ? store.getCustomerTypeName(customer.type) : '其他' }}</span>
      </p>
      <div class="flex items-center gap-1.5">
        <span v-if="inProgress" class="status-live">
          <span class="status-dot" />服务中
        </span>
        <span class="text-sm font-extrabold" :class="inProgress ? 'text-amber-600' : 'text-rose-500'"
          >{{ schedule.startTime }} - {{ schedule.endTime }}</span
        >
      </div>
    </div>
    <div class="mb-2">
      <ServiceTags :role-codes="displayRoleCodes" />
    </div>
    <div class="space-y-1 text-xs text-slate-600">
      <p><i class="fa-solid fa-location-dot mr-1 text-blue-400" />{{ schedule.location }}</p>
      <p>
        <i class="fa-solid fa-coins mr-1 text-amber-400" />定金：{{ depositStatusText[schedule.depositStatus] }}
      </p>
    </div>
  </article>
</template>

<style scoped>
.shooting-live {
  background: linear-gradient(140deg, #fff7ec 0%, #fff1dd 58%, #ffffff 100%);
  border-color: #ffd6a6;
  box-shadow: 0 12px 20px rgba(255, 176, 96, 0.2);
  animation: live-glow 2.2s ease-in-out infinite;
}

.status-live {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border-radius: 999px;
  background: #fff4df;
  color: #c2751f;
  border: 1px solid #ffd8a8;
  padding: 2px 7px;
  font-size: 11px;
  font-weight: 800;
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: #ff9f1a;
  animation: live-dot 1.2s ease-in-out infinite;
}

@keyframes live-glow {
  0%,
  100% {
    box-shadow: 0 12px 20px rgba(255, 176, 96, 0.18);
  }

  50% {
    box-shadow: 0 16px 24px rgba(255, 176, 96, 0.32);
  }
}

@keyframes live-dot {
  0%,
  100% {
    transform: scale(1);
    opacity: 0.8;
  }

  50% {
    transform: scale(1.35);
    opacity: 1;
  }
}
</style>
