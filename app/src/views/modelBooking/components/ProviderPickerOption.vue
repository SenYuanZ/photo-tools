<script setup lang="ts">
import BookingAvailabilityPanel from '@/views/modelBooking/components/BookingAvailabilityPanel.vue'
import ProviderPortfolio from '@/views/modelBooking/components/ProviderPortfolio.vue'
import type { ProviderAvailabilitySummary } from '@/views/modelBooking/types'
import defaultAvatar from '@/assets/DefaultAvatar.png'
import type { PublicProvider } from '@/api/public-booking/types'

defineProps<{
  date: string
  availabilitySummary?: ProviderAvailabilitySummary
  provider: PublicProvider
  selected: boolean
  roleLabels: string[]
  availabilityText: string
  availabilityClass: string
}>()

const emit = defineEmits<{
  select: []
  view: []
}>()
</script>

<template>
  <article class="provider-choice">
    <button
      type="button"
      class="provider-option"
      :class="{ 'provider-option--selected': selected }"
      :aria-pressed="selected"
      @click="emit('select')"
    >
      <img :src="provider.avatarUrl || defaultAvatar" :alt="`${provider.nickname}头像`" />
      <span class="provider-option__copy">
        <span class="provider-option__name-line">
          <strong>{{ provider.nickname }}</strong>
          <span v-for="label in roleLabels.slice(0, 3)" :key="`${provider.id}-${label}`">{{
            label
          }}</span>
        </span>
        <span class="provider-option__bio">{{ provider.bio || provider.account }}</span>
      </span>
      <span class="provider-option__availability" :class="availabilityClass">
        {{ availabilityText }}
      </span>
    </button>
    <div class="provider-choice__portfolio">
      <ProviderPortfolio :provider="provider" />
    </div>
    <details class="provider-detail">
      <summary @click="emit('view')">查看当日档期</summary>
      <BookingAvailabilityPanel
        :date="date"
        :loading="!availabilitySummary || availabilitySummary.loading"
        :error="availabilitySummary?.error"
        :busy-ranges="availabilitySummary?.busyRanges || []"
        :free-ranges="availabilitySummary?.freeRanges || []"
        @retry="emit('view')"
      />
    </details>
  </article>
</template>

<style scoped>
.provider-choice {
  border: 1px solid var(--theme-form-border);
  border-radius: 12px;
  margin-bottom: 10px;
  padding-bottom: 8px;
}
.provider-choice__portfolio {
  padding: 10px 12px 0;
}
.provider-detail {
  padding: 0 12px;
  font-size: 12px;
  color: var(--theme-muted);
}
.provider-detail summary {
  min-height: 44px;
  display: flex;
  align-items: center;
  color: var(--theme-accent-strong);
  cursor: pointer;
}

.provider-option {
  display: grid;
  width: 100%;
  min-height: 60px;
  grid-template-columns: 42px minmax(0, 1fr) auto;
  align-items: center;
  gap: 9px;
  border: 1px solid transparent;
  border-radius: 9px;
  padding: 8px;
  background: var(--theme-surface);
  text-align: left;
}

.provider-option + .provider-option {
  margin-top: 6px;
}

.provider-option--selected {
  border-color: var(--theme-accent);
  background: var(--theme-accent-bg);
}

.provider-option:focus-visible {
  outline: 2px solid var(--theme-focus-ring);
  outline-offset: 1px;
}

.provider-option img {
  width: 42px;
  height: 42px;
  border-radius: 9px;
  object-fit: cover;
}

.provider-option__copy {
  min-width: 0;
}

.provider-option__name-line {
  display: flex;
  min-width: 0;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
}

.provider-option__name-line strong {
  overflow: hidden;
  color: var(--ink);
  font-size: 12px;
  font-weight: 800;
  max-width: 100%;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.provider-option__name-line span {
  flex: 0 0 auto;
  border: 1px solid var(--theme-accent-soft);
  border-radius: 999px;
  padding: 1px 5px;
  background: var(--theme-accent-bg);
  color: var(--theme-accent-strong);
  font-size: 8px;
  font-weight: 800;
}

.provider-option__bio {
  display: block;
  margin-top: 3px;
  overflow: hidden;
  color: var(--theme-muted-soft);
  font-size: 10px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.provider-option__availability {
  flex: 0 0 auto;
  font-size: 9px;
  font-weight: 800;
}
</style>
