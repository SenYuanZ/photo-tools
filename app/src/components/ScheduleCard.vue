<script setup lang="ts">
import { computed } from 'vue'
import { depositStatusText } from '../constants/options'
import type { Customer, Schedule } from '../types/models'

const props = defineProps<{
  schedule: Schedule
  customer?: Customer
  urgent?: boolean
}>()

const emit = defineEmits<{
  click: []
}>()

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
</script>

<template>
  <article
    class="card mb-2 cursor-pointer p-3 transition hover:-translate-y-0.5"
    :class="[urgent ? 'soft-blue pulse-alert' : 'soft-pink']"
    @click="emit('click')"
  >
    <div class="mb-2 flex items-center justify-between gap-2">
      <p class="font-extrabold">
        {{ customer?.name ?? '未知客户' }}
        <span class="chip ml-1 border" :class="typeTagClass">{{ customer?.type ? { personal: '个人写真', couple: '情侣', family: '亲子', business: '商业', other: '其他' }[customer.type] : '其他' }}</span>
      </p>
      <span class="text-sm font-extrabold text-rose-500"
        >{{ schedule.startTime }} - {{ schedule.endTime }}</span
      >
    </div>
    <div class="space-y-1 text-xs text-slate-600">
      <p><i class="fa-solid fa-location-dot mr-1 text-blue-400" />{{ schedule.location }}</p>
      <p>
        <i class="fa-solid fa-coins mr-1 text-amber-400" />定金：{{ depositStatusText[schedule.depositStatus] }}
      </p>
    </div>
  </article>
</template>
