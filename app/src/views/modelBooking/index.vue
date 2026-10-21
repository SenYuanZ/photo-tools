<script setup lang="ts">
import BookingBasicSection from '@/views/modelBooking/components/BookingBasicSection.vue'
import BookingPageHeader from '@/views/modelBooking/components/BookingPageHeader.vue'
import BookingPreferencesSection from '@/views/modelBooking/components/BookingPreferencesSection.vue'
import BookingServiceList from '@/views/modelBooking/components/BookingServiceList.vue'
import BookingSubmitDock from '@/views/modelBooking/components/BookingSubmitDock.vue'
import BookingConfirmation from '@/views/modelBooking/components/BookingConfirmation.vue'
import BookingTimePicker from '@/views/modelBooking/components/BookingTimePicker.vue'
import ProviderPicker from '@/views/modelBooking/components/ProviderPicker.vue'
import { useModelBooking } from '@/views/modelBooking/hooks/useModelBooking'
import { provideModelBooking } from '@/views/modelBooking/hooks/useModelBookingContext'
const booking = useModelBooking()
provideModelBooking(booking)
const {
  router,
  form,
  step,
  error,
  success,
  navigateStep,
  submit,
  providerLinkState,
  providerLinkMessage,
  retryProviderLink,
  dismissProviderLink,
} = booking
const steps = [
  { label: '拍什么', title: '拍摄安排' },
  {
    label: '约服务',
    title: '选择服务者',
  },
  { label: '拍摄偏好', title: '拍摄偏好' },
  {
    label: '联系确认',
    title: '确认预约',
  },
]
</script>
<template>
  <section class="model-booking-page">
    <BookingPageHeader
      :date-label="form.date"
      @open-order-query="router.push({ name: 'order-query' })"
      @open-provider-login="router.push({ name: 'login' })"
    />
    <aside v-if="providerLinkMessage" class="bk-link-notice" aria-live="polite">
      <p>{{ providerLinkMessage }}</p>
      <template v-if="providerLinkState === 'error' || providerLinkState === 'unavailable'">
        <button
          v-if="providerLinkState === 'error'"
          type="button"
          class="bk-link"
          @click="retryProviderLink"
        >
          重试
        </button>
        <button type="button" class="bk-link" @click="dismissProviderLink">重新选择服务者</button>
      </template>
    </aside>
    <nav class="bk-progress" aria-label="预约步骤">
      <button
        v-for="(item, index) in steps"
        :key="item.label"
        type="button"
        :class="{ active: step === index, done: step > index }"
        :aria-current="step === index ? 'step' : undefined"
        @click="navigateStep(index)"
      >
        <b>{{ index + 1 }}</b
        ><span>{{ item.label }}</span>
      </button>
    </nav>
    <form class="bk-form" @submit.prevent="step === 3 ? submit() : navigateStep(step + 1)">
      <header class="bk-intro">
        <h2 class="bk-step-title" tabindex="-1">{{ steps[step].title }}</h2>
        <span v-if="step === 2" class="bk-hint">选填 · 可多选</span>
      </header>
      <BookingBasicSection v-if="step === 0" /><BookingServiceList
        v-else-if="step === 1"
      /><BookingPreferencesSection v-else-if="step === 2" /><BookingConfirmation v-else />
    </form>
    <p v-if="error" class="bk-error bk-feedback" role="alert">{{ error }}</p>
    <p v-if="success" class="bk-note" role="status">{{ success }}</p>
    <BookingSubmitDock /><ProviderPicker /><BookingTimePicker />
  </section>
</template>
<style src="./booking.css"></style>
<style scoped>
.bk-link-notice {
  margin: 14px 0;
  padding: 12px 16px;
  border-radius: 12px;
  background: var(--theme-accent-bg);
  color: var(--ink);
  font-size: 13px;
  line-height: 1.7;
}
.bk-link-notice p {
  margin: 0;
}
.bk-link-notice button {
  margin-right: 18px;
  min-height: 44px;
}
</style>
