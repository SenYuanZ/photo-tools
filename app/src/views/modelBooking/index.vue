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
const { router, form, step, error, success, navigateStep, submit } = booking
const steps = [
  { label: '拍什么', title: '这次想拍什么？', description: '选好类型和日期，我们开始安排。' },
  {
    label: '约服务',
    title: '和谁一起完成？',
    description: '选服务者和时长，自动安排最早可约时间。',
  },
  { label: '拍摄偏好', title: '拍出你喜欢的感觉', description: '点选偏好就好，有特别想法再补充。' },
  {
    label: '联系确认',
    title: '最后，留个联系方式',
    description: '核对一下安排，就可以完成预约了。',
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
        <span class="bk-count"
          >第 {{ step + 1 }} 步 / 共 4 步{{ step === 2 ? ' · 选填' : '' }}</span
        >
        <h2 class="bk-step-title" tabindex="-1">{{ steps[step].title }}</h2>
        <p class="bk-hint">{{ steps[step].description }}</p>
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
