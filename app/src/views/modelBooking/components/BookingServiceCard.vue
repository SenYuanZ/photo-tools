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
          ><small v-if="provider">{{
            provider.bio ||
            roles
              .map((role) => roleOptions.find((item) => item.code === role)?.name || role)
              .join(' / ')
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
        <div class="bk-label">
          本次服务角色 <span v-if="!draft.selectedRoleCode" class="bk-hint">请选择一项</span>
        </div>
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
                  ? '预约时间'
                  : '最早可约'
        }}</span
        ><strong>{{
          ready && draft.startTime ? `${draft.startTime} — ${draft.endTime}` : '—'
        }}</strong>
        <button
          type="button"
          class="bk-change-time"
          :disabled="!canEdit"
          @click="openStartTimePicker(service.code)"
        >
          修改
        </button>
      </div>
      <p v-if="ready && !draft.startTime" class="bk-hint">无连续空档，请缩短时长或更换日期。</p>
      <BookingAvailabilityPanel
        :date="form.date"
        :loading="availability?.loading"
        :error="availability?.error"
        :busy-ranges="availability?.busyRanges || []"
        :free-ranges="availability?.freeRanges || []"
        @retry="loadAvailability(service.code)"
      />
      <details class="bk-details">
        <summary>服务要求（选填）</summary>
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
  flex-wrap: wrap;
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
  font-size: 16px;
  white-space: nowrap;
}
.bk-change-time {
  border: 0;
  padding: 0 4px;
  margin-left: auto;
  min-height: 44px;
  background: transparent;
  color: var(--theme-accent-strong);
  font-size: 13px;
}
.bk-change-time:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
