<script setup lang="ts">
import { computed } from 'vue'
import type { TimeRange } from '@/views/modelBooking/types'
import {
  BOOKING_START,
  BOOKING_END,
  toTime,
  toMinutes,
} from '@/views/modelBooking/utils/availability'
const props = defineProps<{
  date: string
  loading?: boolean
  error?: string
  busyRanges: TimeRange[]
  freeRanges: TimeRange[]
}>()
defineEmits<{ retry: [] }>()
const ranges = computed(() =>
  [
    ...props.freeRanges.map((range) => ({ ...range, busy: false })),
    ...props.busyRanges
      .map((range) => ({
        startTime: toTime(Math.max(BOOKING_START, toMinutes(range.startTime))),
        endTime: toTime(Math.min(BOOKING_END, toMinutes(range.endTime))),
        busy: true,
      }))
      .filter((range) => range.startTime < range.endTime),
  ].sort((a, b) => a.startTime.localeCompare(b.startTime)),
)
</script>
<template>
  <section class="bk-availability" aria-label="当日档期">
    <h3 class="bk-availability-title">{{ date }} 当日档期</h3>
    <p v-if="loading" class="bk-hint" role="status">正在加载档期…</p>
    <div v-else-if="error" role="alert">
      <p class="bk-error">{{ error }}</p>
      <button type="button" class="bk-link" @click="$emit('retry')">重新加载档期</button>
    </div>
    <template v-else
      ><div
        v-for="(range, index) in ranges"
        :key="index"
        class="bk-range"
        :class="{ busy: range.busy }"
      >
        <span>{{ range.startTime }} — {{ range.endTime }}</span
        ><span>{{ range.busy ? '已占用' : '空闲' }}</span>
      </div>
      <p v-if="!ranges.length" class="bk-hint">暂无档期信息，请重新加载。</p></template
    >
  </section>
</template>
<style scoped>
.bk-availability {
  margin-top: 22px;
}
.bk-availability-title {
  font-size: 13px;
  margin: 0 0 10px;
}
.bk-range {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  padding: 9px 12px;
  border-bottom: 2px solid var(--theme-surface);
  background: #f0f8f4;
  color: #39735b;
  font-size: 12px;
}
.bk-range.busy {
  background: repeating-linear-gradient(135deg, #f5edf0, #f5edf0 6px, #eee4e9 6px, #eee4e9 7px);
  color: #88606e;
}
.bk-range:first-of-type {
  border-radius: 9px 9px 0 0;
}
.bk-range:last-child {
  border-radius: 0 0 9px 9px;
}
</style>
