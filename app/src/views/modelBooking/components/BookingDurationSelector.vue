<script setup lang="ts">
import { shallowRef } from 'vue'
import { Popup } from 'vant'
import { durationLabel } from '@/views/modelBooking/utils/availability'
const props = defineProps<{ minutes: number; custom: boolean }>()
const emit = defineEmits<{ select: [minutes: number, custom?: boolean] }>()
const show = shallowRef(false),
  input = shallowRef(''),
  error = shallowRef('')
const open = () => {
  input.value = String(props.minutes)
  error.value = ''
  show.value = true
}
const confirm = () => {
  const n = Number(input.value)
  if (!Number.isInteger(n) || n < 1 || n > 900) {
    error.value = '请输入 1–900 的整数分钟。'
    return
  }
  emit('select', n, true)
  show.value = false
}
</script>
<template>
  <div>
    <div class="bk-choices">
      <button
        v-for="minutes in [10, 30, 60, 120]"
        :key="minutes"
        type="button"
        class="bk-chip"
        :class="{ selected: !custom && props.minutes === minutes }"
        :aria-pressed="!custom && props.minutes === minutes"
        @click="emit('select', minutes)"
      >
        {{ durationLabel(minutes) }}</button
      ><button
        type="button"
        class="bk-chip"
        :class="{ selected: custom }"
        :aria-pressed="custom"
        @click="open"
      >
        {{ custom ? `自定义 · ${durationLabel(props.minutes)}` : '自定义' }}
      </button>
    </div>
    <Popup v-model:show="show" position="bottom" round
      ><section class="bk-popup">
        <h2 class="bk-popup-title">自定义预约时长</h2>
        <label class="bk-input-label"
          >预约分钟数<input
            v-model="input"
            class="bk-field"
            type="number"
            inputmode="numeric"
            min="1"
            max="900"
            step="1"
            @keydown.enter.prevent="confirm"
        /></label>
        <p class="bk-hint">输入 1–900 的整数分钟，例如 45 或 90。</p>
        <p v-if="error" class="bk-error" role="alert">{{ error }}</p>
        <div class="bk-actions">
          <button type="button" class="bk-secondary" @click="show = false">取消</button
          ><button type="button" class="bk-primary" @click="confirm">确认时长</button>
        </div>
      </section></Popup
    >
  </div>
</template>
