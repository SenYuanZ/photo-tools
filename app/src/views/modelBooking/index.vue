<script setup lang="ts">
import { computed } from 'vue'
import { DatePicker, Picker, Popup } from 'vant'
import BookingBasicSection from '@/views/modelBooking/components/BookingBasicSection.vue'
import BookingPageHeader from '@/views/modelBooking/components/BookingPageHeader.vue'
import BookingPreferencesSection from '@/views/modelBooking/components/BookingPreferencesSection.vue'
import BookingServiceList from '@/views/modelBooking/components/BookingServiceList.vue'
import BookingSubmitDock from '@/views/modelBooking/components/BookingSubmitDock.vue'
import ProviderPicker from '@/views/modelBooking/components/ProviderPicker.vue'
import { useModelBooking } from '@/views/modelBooking/hooks/useModelBooking'
import { provideModelBooking } from '@/views/modelBooking/hooks/useModelBookingContext'

type PickerValue = string | number

interface PickerConfirmPayload {
  selectedValues: PickerValue[]
  selectedOptions: Array<{ value?: PickerValue } | undefined>
}

const booking = useModelBooking()
provideModelBooking(booking)

const {
  router,
  form,
  selectedRoleCode,
  roleOptions,
  serviceDrafts,
  selectedDateValues,
  showDatePicker,
  showCustomerTypePicker,
  showStartTimePicker,
  showEndTimePicker,
  showRolePicker,
  pickerServiceCode,
  error,
  success,
  customerTypeColumns,
  startColumns,
  endColumns,
  normalizeDate,
  submit,
} = booking

const bookingDateLabel = computed(() => {
  const [year, month, day] = form.date.split('-')
  if (!year || !month || !day) return form.date
  return `${year}年${Number(month)}月${Number(day)}日`
})

const confirmDate = ({ selectedValues }: PickerConfirmPayload) => {
  form.date = normalizeDate(selectedValues.map(String))
  showDatePicker.value = false
}

const confirmCustomerType = ({ selectedOptions }: PickerConfirmPayload) => {
  const value = selectedOptions[0]?.value
  if (value !== undefined) form.customerTypeCode = String(value)
  showCustomerTypePicker.value = false
}

const confirmRole = ({ selectedOptions }: PickerConfirmPayload) => {
  const value = selectedOptions[0]?.value
  if (value !== undefined) selectedRoleCode.value = String(value)
  showRolePicker.value = false
}

const confirmStartTime = ({ selectedOptions }: PickerConfirmPayload) => {
  const value = selectedOptions[0]?.value
  if (value !== undefined) serviceDrafts[pickerServiceCode.value].startTime = String(value)
  showStartTimePicker.value = false
}

const confirmEndTime = ({ selectedOptions }: PickerConfirmPayload) => {
  const value = selectedOptions[0]?.value
  if (value !== undefined) serviceDrafts[pickerServiceCode.value].endTime = String(value)
  showEndTimePicker.value = false
}
</script>

<template>
  <section class="model-booking-page">
    <BookingPageHeader
      :date-label="bookingDateLabel"
      @open-order-query="router.push({ name: 'order-query' })"
      @open-provider-login="router.push({ name: 'login' })"
    />

    <form class="booking-paper" @submit.prevent="submit">
      <BookingBasicSection />
      <BookingPreferencesSection />
      <BookingServiceList />
    </form>

    <p v-if="error" class="booking-feedback booking-feedback--error" role="alert">
      <i class="fa-solid fa-triangle-exclamation" aria-hidden="true" />
      {{ error }}
    </p>
    <p v-if="success" class="booking-feedback booking-feedback--success" role="status">
      <i class="fa-solid fa-circle-check" aria-hidden="true" />
      {{ success }}
    </p>

    <BookingSubmitDock />
    <ProviderPicker />

    <Popup v-model:show="showDatePicker" position="bottom" round>
      <DatePicker
        v-model="selectedDateValues"
        title="选择服务日期"
        @cancel="showDatePicker = false"
        @confirm="confirmDate"
      />
    </Popup>

    <Popup v-model:show="showCustomerTypePicker" position="bottom" round>
      <Picker
        :columns="customerTypeColumns"
        @cancel="showCustomerTypePicker = false"
        @confirm="confirmCustomerType"
      />
    </Popup>

    <Popup v-model:show="showRolePicker" position="bottom" round>
      <Picker
        :columns="roleOptions.map((item) => ({ text: item.name, value: item.code }))"
        @cancel="showRolePicker = false"
        @confirm="confirmRole"
      />
    </Popup>

    <Popup v-model:show="showStartTimePicker" position="bottom" round>
      <Picker
        :columns="startColumns"
        @cancel="showStartTimePicker = false"
        @confirm="confirmStartTime"
      />
    </Popup>

    <Popup v-model:show="showEndTimePicker" position="bottom" round>
      <Picker :columns="endColumns" @cancel="showEndTimePicker = false" @confirm="confirmEndTime" />
    </Popup>
  </section>
</template>

<style scoped>
.model-booking-page {
  padding-bottom: 78px;
}

.booking-paper {
  overflow: hidden;
  border: 1px solid var(--theme-form-border);
  border-radius: 12px;
  margin-top: 10px;
  background: var(--theme-surface);
  box-shadow: 0 8px 22px rgba(var(--theme-accent-rgb), 0.08);
}

.booking-feedback {
  display: flex;
  align-items: flex-start;
  gap: 7px;
  border: 1px solid;
  border-radius: 9px;
  margin: 10px 0 0;
  padding: 10px 11px;
  font-size: 11px;
  line-height: 1.6;
}

.booking-feedback--error {
  border-color: var(--theme-status-border);
  background: var(--theme-status-soft);
  color: var(--theme-status);
}

.booking-feedback--success {
  border-color: #ccecdf;
  background: #effaf6;
  color: #2f836c;
}

@media (max-width: 359px) {
  .booking-paper {
    border-radius: 10px;
  }
}
</style>
