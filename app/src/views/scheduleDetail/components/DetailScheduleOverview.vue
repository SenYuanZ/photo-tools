<script setup lang="ts">
defineProps<{
  dateLabel: string
  fullDate: string
  timeRange: string
  durationText: string
  statusLabel: string
  location: string
}>()

const emit = defineEmits<{ navigate: [] }>()
</script>

<template>
  <article class="schedule-focus" aria-labelledby="detail-schedule-heading">
    <div class="schedule-heading">
      <h2 id="detail-schedule-heading">拍摄安排</h2>
      <span class="schedule-status">{{ statusLabel }}</span>
    </div>
    <div class="schedule-date" :title="fullDate">
      <p>{{ dateLabel }}</p>
      <span class="duration">{{ durationText }}</span>
    </div>
    <p class="schedule-time">{{ timeRange }}</p>
    <div class="schedule-location">
      <p>{{ location || '待补充地点' }}</p>
      <button type="button" :disabled="!location" @click="emit('navigate')">
        导航 <i class="fa-solid fa-chevron-right" aria-hidden="true" />
      </button>
    </div>
  </article>
</template>

<style scoped>
.schedule-focus {
  border: 1px solid var(--theme-accent-soft);
  border-radius: 20px;
  padding: 24px;
  background: color-mix(in srgb, var(--theme-accent-soft) 68%, var(--theme-accent-bg));
}
.schedule-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.schedule-heading h2 {
  margin: 0;
  font-size: 15px;
  font-weight: 500;
}
.schedule-status {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 6px;
  border: 1px solid var(--theme-accent-soft);
  border-radius: 999px;
  padding: 4px 10px;
  background: var(--theme-accent-bg);
  color: var(--detail-accent-text);
  font-size: 12px;
}
.schedule-status::before {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--theme-accent-strong);
  content: '';
}
.schedule-date {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin-top: 22px;
}
.schedule-date p {
  margin: 0;
  font-size: 19px;
  font-weight: 500;
}
.duration {
  border-radius: 999px;
  padding: 2px 9px;
  background: var(--theme-accent-bg);
  color: var(--detail-accent-text);
  font-size: 13px;
}
.schedule-time {
  margin: 2px 0 22px;
  color: var(--detail-accent-text);
  font-size: clamp(29px, 8vw, 38px);
  font-variant-numeric: tabular-nums;
  font-weight: 700;
  letter-spacing: -1.3px;
  line-height: 1.3;
  white-space: nowrap;
}
.schedule-location {
  display: flex;
  align-items: center;
  gap: 12px;
  border-top: 1px solid color-mix(in srgb, var(--theme-accent) 40%, var(--line));
  padding-top: 18px;
}
.schedule-location p {
  min-width: 0;
  flex: 1;
  margin: 0;
  font-size: 15px;
  line-height: 1.6;
  overflow-wrap: anywhere;
  white-space: pre-line;
}
.schedule-location button {
  display: inline-flex;
  min-width: 44px;
  min-height: 44px;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  gap: 7px;
  border: 0;
  padding: 0;
  background: transparent;
  color: var(--detail-accent-text);
  font-size: 14px;
}
.schedule-location button i {
  font-size: 11px;
}
.schedule-location button:disabled {
  opacity: 0.48;
}
@media (max-width: 350px) {
  .schedule-focus {
    padding: 20px;
  }
  .schedule-date {
    gap: 7px;
  }
  .schedule-date p {
    font-size: 17px;
  }
}
</style>
