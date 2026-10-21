<script setup lang="ts">
import BookingServiceCard from '@/views/modelBooking/components/BookingServiceCard.vue'
import { useModelBookingContext } from '@/views/modelBooking/hooks/useModelBookingContext'
const { activeServices, addServiceSlot } = useModelBookingContext()
</script>
<template>
  <div>
    <BookingServiceCard
      v-for="service in activeServices"
      :key="service.code"
      :service="service"
    /><button v-if="activeServices.length < 6" type="button" class="bk-add" @click="addServiceSlot">
      ＋ 添加服务者
    </button>
  </div>
</template>
