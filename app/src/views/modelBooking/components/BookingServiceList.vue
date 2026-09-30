<script setup lang="ts">
import BookingServiceCard from '@/views/modelBooking/components/BookingServiceCard.vue'
import BookingStepSection from '@/views/modelBooking/components/BookingStepSection.vue'
import { useModelBookingContext } from '@/views/modelBooking/hooks/useModelBookingContext'

const { activeServices, addServiceSlot } = useModelBookingContext()
</script>

<template>
  <BookingStepSection
    :step="3"
    title="服务安排"
    :note="`${activeServices.length} 位服务者`"
    heading-id="booking-services-heading"
  >
    <div class="service-list">
      <BookingServiceCard
        v-for="service in activeServices"
        :key="service.code"
        :service="service"
      />
    </div>

    <button type="button" class="add-service-button" @click="addServiceSlot">
      <i class="fa-solid fa-plus" aria-hidden="true" />
      新增一位服务者
    </button>
  </BookingStepSection>
</template>

<style scoped>
.service-list {
  display: grid;
  gap: 10px;
}

.add-service-button {
  display: inline-flex;
  width: 100%;
  min-height: 46px;
  align-items: center;
  justify-content: center;
  gap: 7px;
  margin-top: 10px;
  border: 1px dashed var(--theme-accent-soft);
  border-radius: 10px;
  background: var(--theme-accent-bg);
  color: var(--theme-accent-strong);
  font-size: 12px;
  font-weight: 800;
}

.add-service-button:focus-visible {
  outline: 2px solid var(--theme-focus-ring);
  outline-offset: 2px;
}
</style>
