<script setup lang="ts">
import BookingServiceCard from '@/views/modelBooking/components/BookingServiceCard.vue'
import { useModelBookingContext } from '@/views/modelBooking/hooks/useModelBookingContext'
const { activeServices, addServiceSlot, form } = useModelBookingContext()
</script>
<template>
  <div>
    <p class="bk-note">{{ form.date }} · 每位服务者分别安排时间</p>
    <BookingServiceCard
      v-for="service in activeServices"
      :key="service.code"
      :service="service"
    /><button v-if="activeServices.length < 6" type="button" class="bk-add" @click="addServiceSlot">
      ＋ 再约一位服务者
    </button>
    <p class="bk-hint">摄影、妆造可分别安排，不用重复填资料。</p>
  </div>
</template>
