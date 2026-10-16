<script setup lang="ts">
import { computed, shallowRef, watch } from 'vue'
import dayjs from 'dayjs'
const model = defineModel<string>({ required: true })
const month = shallowRef(dayjs(model.value).startOf('month'))
const today = dayjs().format('YYYY-MM-DD')
watch(model, (date) => {
  month.value = dayjs(date).startOf('month')
})
const cells = computed(() => {
  const offset = (month.value.day() + 6) % 7
  return [
    ...Array.from({ length: offset }, () => null),
    ...Array.from({ length: month.value.daysInMonth() }, (_, i) => month.value.date(i + 1)),
  ]
})
const canPrevious = computed(() => month.value.format('YYYY-MM') > today.slice(0, 7))
</script>
<template>
  <div class="bk-calendar">
    <div class="bk-calendar-head">
      <button
        type="button"
        class="bk-icon"
        aria-label="上个月"
        :disabled="!canPrevious"
        @click="month = month.subtract(1, 'month')"
      >
        ‹</button
      ><strong>{{ month.format('YYYY 年 M 月') }}</strong
      ><button
        type="button"
        class="bk-icon"
        aria-label="下个月"
        @click="month = month.add(1, 'month')"
      >
        ›
      </button>
    </div>
    <div class="bk-calendar-grid">
      <span v-for="day in ['一', '二', '三', '四', '五', '六', '日']" :key="day" class="bk-week">{{
        day
      }}</span
      ><template v-for="(cell, index) in cells" :key="index"
        ><button
          v-if="cell"
          type="button"
          class="bk-day"
          :disabled="cell.format('YYYY-MM-DD') < today"
          :class="{ selected: cell.format('YYYY-MM-DD') === model }"
          :aria-label="cell.format('YYYY-MM-DD')"
          :aria-pressed="cell.format('YYYY-MM-DD') === model"
          @click="model = cell.format('YYYY-MM-DD')"
        >
          {{ cell.date() }}</button
        ><span v-else
      /></template>
    </div>
  </div>
</template>
<style scoped>
.bk-calendar {
  border: 1px solid var(--theme-form-border);
  border-radius: 14px;
  padding: 10px;
}
.bk-calendar-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 14px;
}
.bk-icon {
  width: 44px;
  height: 44px;
  background: transparent;
  border: 0;
  font-size: 23px;
}
.bk-calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 3px;
  text-align: center;
}
.bk-week {
  font-size: 11px;
  color: var(--theme-muted);
  padding-bottom: 6px;
}
.bk-day {
  border: 0;
  border-radius: 9px;
  min-height: 40px;
  background: transparent;
  font-size: 13px;
  color: var(--ink);
}
.bk-day.selected {
  background: var(--theme-accent-strong);
  color: var(--theme-on-accent);
  font-weight: 700;
}
.bk-day:disabled,
.bk-icon:disabled {
  color: var(--theme-muted-soft);
  opacity: 0.4;
}
.bk-day:focus-visible,
.bk-icon:focus-visible {
  outline: 2px solid var(--theme-accent-strong);
}
</style>
