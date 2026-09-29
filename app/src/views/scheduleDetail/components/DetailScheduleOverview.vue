<script setup lang="ts">
defineProps<{
  dateDay: string
  dateCaption: string
  fullDate: string
  timeRange: string
  durationText: string
  proximityText: string
  location: string
  serviceType: string
  roleLabels: string[]
  paymentLabel: string
  tailPaymentDate?: string | null
}>()

const emit = defineEmits<{
  navigate: []
}>()
</script>

<template>
  <article class="schedule-focus" aria-labelledby="detail-schedule-heading">
    <div class="section-heading">
      <h2 id="detail-schedule-heading" class="section-title">
        <i class="fa-regular fa-calendar" aria-hidden="true" />
        拍摄安排
      </h2>
      <span class="section-note">{{ proximityText }}</span>
    </div>

    <div class="schedule-time">
      <div class="date-block">
        <strong>{{ dateDay }}</strong>
        <span>{{ dateCaption }}</span>
      </div>
      <div class="time-copy">
        <span>{{ fullDate }}</span>
        <strong>{{ timeRange }}</strong>
        <p>{{ durationText }}</p>
      </div>
    </div>

    <div class="location-row">
      <span class="location-icon">
        <i class="fa-solid fa-location-dot" aria-hidden="true" />
      </span>
      <div class="location-copy">
        <span>拍摄地点</span>
        <strong>{{ location || '待补充地点' }}</strong>
      </div>
      <button type="button" class="text-button" :disabled="!location" @click="emit('navigate')">
        <i class="fa-solid fa-location-arrow" aria-hidden="true" />
        导航
      </button>
    </div>

    <div class="schedule-meta" aria-label="服务与收款摘要">
      <span><i class="fa-solid fa-camera" aria-hidden="true" />{{ serviceType }}</span>
      <span v-for="role in roleLabels" :key="role">
        <i class="fa-solid fa-user-tag" aria-hidden="true" />{{ role }}
      </span>
      <span class="payment-status">
        <i class="fa-solid fa-wallet" aria-hidden="true" />{{ paymentLabel }}
      </span>
      <span v-if="tailPaymentDate">尾款 {{ tailPaymentDate }}</span>
    </div>
  </article>
</template>

<style scoped>
.schedule-focus {
  overflow: hidden;
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 14px;
  background: var(--theme-surface);
  box-shadow: 0 8px 20px rgba(var(--theme-accent-rgb), 0.1);
}

.section-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 12px;
}

.section-title {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  margin: 0;
  color: var(--ink);
  font-size: 14px;
  font-weight: 800;
}

.section-title i {
  color: var(--theme-accent-strong);
}

.section-note {
  color: var(--theme-muted-soft);
  font-size: 10px;
  font-weight: 600;
}

.schedule-time {
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr);
  align-items: stretch;
  gap: 13px;
}

.date-block {
  display: flex;
  min-height: 82px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  background: var(--theme-accent-bg);
  color: var(--theme-accent-strong);
}

.date-block strong {
  font-size: 29px;
  font-variant-numeric: tabular-nums;
  line-height: 1;
}

.date-block span {
  margin-top: 5px;
  font-size: 10px;
  font-weight: 700;
}

.time-copy {
  display: flex;
  min-width: 0;
  flex-direction: column;
  justify-content: center;
}

.time-copy > span {
  color: var(--theme-muted-soft);
  font-size: 11px;
  font-weight: 600;
}

.time-copy strong {
  overflow-wrap: anywhere;
  margin-top: 4px;
  color: var(--ink);
  font-size: 22px;
  font-variant-numeric: tabular-nums;
  font-weight: 800;
  letter-spacing: 0;
}

.time-copy p {
  margin: 5px 0 0;
  color: var(--theme-muted);
  font-size: 11px;
}

.location-row {
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr) auto;
  align-items: center;
  gap: 9px;
  margin-top: 13px;
  border-top: 1px solid var(--line);
  padding-top: 13px;
}

.location-icon {
  display: inline-flex;
  width: 34px;
  height: 34px;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  background: var(--theme-accent-bg);
  color: var(--theme-accent-strong);
}

.location-copy {
  min-width: 0;
}

.location-copy span {
  color: var(--theme-muted-soft);
  font-size: 10px;
}

.location-copy strong {
  display: block;
  overflow: hidden;
  margin-top: 2px;
  color: var(--ink);
  font-size: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.text-button {
  display: inline-flex;
  min-width: 62px;
  min-height: 44px;
  align-items: center;
  justify-content: center;
  gap: 5px;
  border: 1px solid var(--theme-accent-soft);
  border-radius: 10px;
  padding: 0 10px;
  background: var(--theme-accent-bg);
  color: var(--theme-accent-strong);
  font-size: 11px;
  font-weight: 700;
}

.text-button:disabled {
  opacity: 0.48;
}

.schedule-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  margin-top: 12px;
}

.schedule-meta span {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border: 1px solid var(--line);
  border-radius: 999px;
  padding: 4px 8px;
  color: var(--theme-muted);
  font-size: 10px;
  font-weight: 700;
}

.schedule-meta .payment-status {
  border-color: var(--theme-status-border);
  background: var(--theme-status-soft);
  color: var(--theme-status);
}

@media (max-width: 350px) {
  .schedule-time {
    grid-template-columns: 64px minmax(0, 1fr);
  }

  .time-copy strong {
    font-size: 19px;
  }
}
</style>
