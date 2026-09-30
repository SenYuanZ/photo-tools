<script setup lang="ts">
import { computed } from 'vue'
import { Button } from 'vant'
import { useModelBookingContext } from '@/views/modelBooking/hooks/useModelBookingContext'

const { activeServices, serviceDrafts, selectedDraftRoleLabel, submitting, submit } =
  useModelBookingContext()

const serviceCountLabel = computed(() => `${activeServices.value.length} 位服务者`)

const primaryServiceSummary = computed(() => {
  const service = activeServices.value[0]
  if (!service) return '等待添加服务安排'

  const draft = serviceDrafts[service.code]
  const role = selectedDraftRoleLabel(service.code) || '待选择服务者'
  if (!draft?.startTime || !draft?.endTime) return role
  return `${role} · ${draft.startTime}–${draft.endTime}`
})
</script>

<template>
  <aside class="booking-submit-dock" aria-label="提交预约">
    <div class="booking-submit-dock__summary">
      <strong>{{ serviceCountLabel }}</strong>
      <span>{{ primaryServiceSummary }}</span>
    </div>
    <Button
      class="booking-submit-dock__button"
      type="primary"
      :loading="submitting"
      loading-text="提交中"
      @click="submit"
    >
      <i class="fa-solid fa-paper-plane" aria-hidden="true" />
      提交预约
    </Button>
  </aside>
</template>

<style scoped>
.booking-submit-dock {
  position: fixed;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 30;
  display: grid;
  width: min(760px, 100%);
  grid-template-columns: minmax(0, 1fr) minmax(154px, 260px);
  align-items: center;
  gap: 12px;
  margin: 0 auto;
  border-top: 1px solid var(--theme-form-border);
  padding: 10px 16px calc(10px + env(safe-area-inset-bottom));
  background: color-mix(in srgb, var(--theme-surface) 95%, transparent);
  backdrop-filter: blur(14px);
}

.booking-submit-dock__summary {
  min-width: 0;
}

.booking-submit-dock__summary strong,
.booking-submit-dock__summary span {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.booking-submit-dock__summary strong {
  color: var(--ink);
  font-size: 12px;
  font-weight: 800;
}

.booking-submit-dock__summary span {
  margin-top: 2px;
  color: var(--theme-muted-soft);
  font-size: 10px;
}

.booking-submit-dock__button {
  width: 100%;
  min-height: 46px;
  border-radius: 11px;
  font-size: 13px;
}

.booking-submit-dock__button :deep(.van-button__content) {
  gap: 7px;
}

@media (max-width: 359px) {
  .booking-submit-dock {
    grid-template-columns: minmax(0, 1fr) 144px;
    gap: 8px;
    padding-right: 10px;
    padding-left: 10px;
  }

  .booking-submit-dock__summary span {
    max-width: 130px;
  }
}
</style>
