<script setup lang="ts">
import { computed } from 'vue'
import { useModelBookingContext } from '@/views/modelBooking/hooks/useModelBookingContext'
import { durationLabel } from '@/views/modelBooking/utils/availability'
const { form, step, activeServices, serviceDrafts, submitting, navigateStep, submit } =
  useModelBookingContext()
const caption = computed(() =>
  step.value === 0
    ? `已选日期 ${form.date}`
    : step.value === 2
      ? '全部选填，可直接进入下一步'
      : `${activeServices.value.length} 位服务者 · 服务总时长 ${durationLabel(activeServices.value.reduce((total, item) => total + serviceDrafts[item.code].durationMinutes, 0))}`,
)
const labels = ['下一步 · 约服务', '下一步 · 拍摄偏好', '下一步 · 联系确认', '完成预约']
</script>
<template>
  <footer class="bk-dock" aria-label="预约操作">
    <p class="bk-dock-caption">{{ caption }}</p>
    <div class="bk-actions">
      <button
        v-if="step > 0"
        type="button"
        class="bk-secondary"
        :disabled="submitting"
        @click="navigateStep(step - 1)"
      >
        上一步</button
      ><button
        type="button"
        class="bk-primary"
        :disabled="submitting"
        @click="step === 3 ? submit() : navigateStep(step + 1)"
      >
        {{ submitting ? '提交中…' : labels[step] }}
      </button>
    </div>
  </footer>
</template>
