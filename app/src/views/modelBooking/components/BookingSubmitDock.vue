<script setup lang="ts">
import { useModelBookingContext } from '@/views/modelBooking/hooks/useModelBookingContext'
const { step, submitting, navigateStep, submit } = useModelBookingContext()
const labels = ['下一步', '下一步', '下一步', '完成预约']
</script>
<template>
  <footer class="bk-dock" aria-label="预约操作">
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
