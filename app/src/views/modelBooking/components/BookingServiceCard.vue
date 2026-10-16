<script setup lang="ts">
import { computed } from 'vue'
import defaultAvatar from '@/assets/DefaultAvatar.png'
import BookingAvailabilityPanel from '@/views/modelBooking/components/BookingAvailabilityPanel.vue'
import BookingDurationSelector from '@/views/modelBooking/components/BookingDurationSelector.vue'
import ProviderPortfolio from '@/views/modelBooking/components/ProviderPortfolio.vue'
import { useModelBookingContext } from '@/views/modelBooking/hooks/useModelBookingContext'
const props = defineProps<{ service: { code: string; name: string } }>()
const {
  form,
  activeServices,
  serviceDrafts,
  availabilityByService,
  selectedProvider,
  providerRoleCodes,
  roleOptions,
  setDraftRoleCode,
  openProviderPicker,
  removeServiceSlot,
  setDuration,
  openStartTimePicker,
  loadAvailability,
} = useModelBookingContext()
const draft = computed(() => serviceDrafts[props.service.code])
const availability = computed(() => availabilityByService[props.service.code])
const provider = computed(() => selectedProvider(props.service.code))
const roles = computed(() => (provider.value ? providerRoleCodes(provider.value) : []))
const ready = computed(
  () =>
    !!provider.value &&
    !availability.value?.loading &&
    !availability.value?.error &&
    availability.value?.lastKey === `${props.service.code}-${draft.value.providerId}-${form.date}`,
)
const canEdit = computed(() => ready.value && !!draft.value.startTime)
</script>
<template>
  <article class="bk-service">
    <header class="bk-service-head">
      <button
        type="button"
        class="bk-provider-button"
        :aria-label="provider ? '更换服务者' : '选择服务者'"
        @click="openProviderPicker(service.code)"
      >
        <img :src="provider?.avatarUrl || defaultAvatar" alt="" class="bk-avatar" /><span
          ><strong>{{ provider?.nickname || '选择服务者' }}</strong
          ><small>{{
            provider
              ? provider.bio ||
                roles
                  .map((role) => roleOptions.find((item) => item.code === role)?.name || role)
                  .join(' / ')
              : '选择后显示服务角色和可约时间'
          }}</small></span
        ><span class="bk-link">{{ provider ? '更换' : '选择' }}</span></button
      ><button
        v-if="activeServices.length > 1"
        type="button"
        class="bk-link"
        aria-label="移除服务者"
        @click="removeServiceSlot(service.code)"
      >
        移除
      </button>
    </header>
    <div v-if="provider" class="bk-service-body">
      <ProviderPortfolio :provider="provider" />
      <section v-if="roles.length > 1" class="bk-group">
        <div class="bk-label">本次服务角色</div>
        <div class="bk-choices">
          <button
            v-for="role in roles"
            :key="role"
            type="button"
            class="bk-chip"
            :class="{ selected: draft.selectedRoleCode === role }"
            :aria-pressed="draft.selectedRoleCode === role"
            @click="setDraftRoleCode(service.code, role)"
          >
            {{ roleOptions.find((item) => item.code === role)?.name || role }}
          </button>
        </div>
      </section>
      <div class="bk-label">预约时长</div>
      <BookingDurationSelector
        :minutes="draft.durationMinutes"
        :custom="draft.customDuration"
        @select="(minutes, custom) => setDuration(service.code, minutes, custom)"
      />
      <div class="bk-time-result">
        <span>{{
          availability?.loading
            ? '正在匹配档期…'
            : !ready
              ? '档期待加载'
              : !draft.startTime
                ? '暂无可约时间'
                : draft.timeSource === 'manual'
                  ? '已手动选择'
                  : '已匹配最早时间'
        }}</span
        ><strong>{{
          ready && draft.startTime ? `${draft.startTime} — ${draft.endTime}` : '—'
        }}</strong>
      </div>
      <button
        type="button"
        class="bk-change-time"
        :disabled="!canEdit"
        @click="openStartTimePicker(service.code)"
      >
        修改时间
      </button>
      <p v-if="ready" class="bk-hint">
        {{
          !draft.startTime
            ? '当天没有能容纳该时长的连续空档，请缩短时长或更换日期。'
            : draft.timeSource === 'manual'
              ? '已保留手动选择；重新选择时长会匹配最早可约时间。'
              : '已根据时长自动选择最早的连续空档，你也可以手动修改。'
        }}
      </p>
      <BookingAvailabilityPanel
        :date="form.date"
        :loading="availability?.loading"
        :error="availability?.error"
        :busy-ranges="availability?.busyRanges || []"
        :free-ranges="availability?.freeRanges || []"
        @retry="loadAvailability(service.code)"
      />
      <details class="bk-details">
        <summary>补充本位服务者的要求（选填）</summary>
        <textarea
          v-model="draft.requirement"
          class="bk-field"
          rows="2"
          maxlength="255"
          placeholder="需要单独说明的要求"
        />
      </details>
    </div>
  </article>
</template>
<style scoped>
.bk-service {
  border: 1px solid var(--theme-form-border);
  border-radius: 14px;
  overflow: hidden;
  margin-bottom: 15px;
}
.bk-service-head {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 13px;
  background: var(--theme-accent-bg);
}
.bk-provider-button {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 11px;
  text-align: left;
  background: transparent;
  border: 0;
  padding: 0;
}
.bk-avatar {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
}
.bk-provider-button > span:first-of-type {
  flex: 1;
  min-width: 0;
}
.bk-provider-button strong {
  display: block;
  font-size: 15px;
}
.bk-provider-button small {
  display: block;
  color: var(--theme-muted);
  font-size: 12px;
  overflow-wrap: anywhere;
  line-height: 1.6;
}
.bk-service-body {
  padding: 16px;
}
.bk-time-result {
  display: flex;
  gap: 10px;
  align-items: center;
  justify-content: space-between;
  background: var(--theme-accent-bg);
  border-radius: 9px;
  padding: 13px 11px;
  margin-top: 18px;
}
.bk-time-result span {
  color: var(--theme-muted);
  font-size: 12px;
}
.bk-time-result strong {
  font-size: 17px;
  white-space: nowrap;
}
.bk-change-time {
  border: 1px solid var(--theme-form-border);
  border-radius: 9px;
  width: 100%;
  min-height: 44px;
  background: var(--theme-surface);
  color: var(--theme-accent-strong);
  font-size: 13px;
  margin-top: 10px;
}
.bk-change-time:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
