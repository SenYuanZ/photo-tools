<script setup lang="ts">
import { computed, shallowRef, watch } from 'vue'
import { Popup } from 'vant'
import { useModelBookingContext } from '@/views/modelBooking/hooks/useModelBookingContext'
import {
  availableStarts,
  fitsRange,
  toMinutes,
  toTime,
  durationLabel,
} from '@/views/modelBooking/utils/availability'
const {
  form,
  pickerServiceCode,
  serviceDrafts,
  availabilityByService,
  showStartTimePicker,
  selectedProviderLabel,
  setStartTime,
} = useModelBookingContext()
const hour = shallowRef('07'),
  pending = shallowRef(''),
  message = shallowRef('')
const draft = computed(() => serviceDrafts[pickerServiceCode.value])
const availability = computed(() => availabilityByService[pickerServiceCode.value])
const minutes = computed(() =>
  [0, 10, 20, 30, 40, 50].map((minute) => {
    const time = `${hour.value}:${String(minute).padStart(2, '0')}`
    const busy = availability.value?.busyRanges.some(
      (range) => time >= range.startTime && time < range.endTime,
    )
    const valid =
      !!availability.value &&
      fitsRange(availability.value.freeRanges, time, draft.value.durationMinutes)
    return { time, minute, valid, label: valid ? '可约' : busy ? '已占用' : '时长不足' }
  }),
)
watch(showStartTimePicker, (show) => {
  if (!show) return
  pending.value = draft.value.startTime
  hour.value = (
    pending.value ||
    availableStarts(availability.value?.freeRanges || [], draft.value.durationMinutes)[0] ||
    '07:00'
  ).slice(0, 2)
  message.value = ''
})
watch(
  () => form.date,
  () => {
    showStartTimePicker.value = false
  },
)
const changeHour = () => {
  pending.value = ''
  message.value = ''
}
const confirm = () => {
  if (!pending.value) return
  if (setStartTime(pickerServiceCode.value, pending.value)) showStartTimePicker.value = false
  else message.value = '档期已变更，请关闭后重新选择。'
}
</script>
<template>
  <Popup v-model:show="showStartTimePicker" position="bottom" round
    ><section class="bk-popup">
      <h2 class="bk-popup-title">选择开始时间</h2>
      <p class="bk-hint">
        {{ form.date }} · {{ selectedProviderLabel(pickerServiceCode) }} ·
        {{ durationLabel(draft.durationMinutes) }}
      </p>
      <div class="bk-time-picker">
        <label class="bk-input-label"
          >小时<select v-model="hour" class="bk-field" @change="changeHour">
            <option v-for="h in 15" :key="h" :value="String(h + 6).padStart(2, '0')">
              {{ String(h + 6).padStart(2, '0') }} 时
            </option>
          </select></label
        >
        <div>
          <p class="bk-hint">分钟 · 每 10 分钟一档</p>
          <div class="bk-minute-grid">
            <button
              v-for="item in minutes"
              :key="item.time"
              type="button"
              class="bk-chip"
              :class="{ selected: pending === item.time }"
              :disabled="!item.valid"
              :aria-label="`${item.time} ${item.label}`"
              :aria-pressed="pending === item.time"
              @click="pending = item.time"
            >
              {{ String(item.minute).padStart(2, '0') }} 分<small>{{ item.label }}</small>
            </button>
          </div>
        </div>
      </div>
      <p class="bk-hint">已占用或连续空闲不足的时间不可选。</p>
      <p class="bk-note" role="status">
        {{
          pending
            ? `${pending} — ${toTime(toMinutes(pending) + draft.durationMinutes)}`
            : '请选择一个可约的开始时间'
        }}
      </p>
      <p v-if="message" class="bk-error" role="alert">{{ message }}</p>
      <div class="bk-actions">
        <button type="button" class="bk-secondary" @click="showStartTimePicker = false">取消</button
        ><button type="button" class="bk-primary" :disabled="!pending" @click="confirm">
          确认时间
        </button>
      </div>
    </section></Popup
  >
</template>
<style scoped>
.bk-time-picker {
  display: grid;
  grid-template-columns: 90px minmax(0, 1fr);
  gap: 15px;
  margin: 18px 0;
}
.bk-time-picker .bk-input-label {
  margin: 0;
}
.bk-minute-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 7px;
  margin-top: 9px;
}
.bk-minute-grid .bk-chip {
  padding: 8px 2px;
}
.bk-minute-grid small {
  display: block;
  font-size: 10px;
  font-weight: 400;
}
</style>
