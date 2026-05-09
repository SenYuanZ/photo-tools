<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Button } from 'vant'
import { depositStatusText } from '../constants/options'
import { publicBookingApi, type PublicOrderDetail } from '../api/app'
import { formatCnDate } from '../utils/time'

const route = useRoute()
const router = useRouter()

const loading = ref(false)
const error = ref('')
const order = ref<PublicOrderDetail | null>(null)

const bookingGroupId = computed(() => String(route.params.bookingGroupId || '').trim())

const loadDetail = async () => {
  if (!bookingGroupId.value) {
    error.value = '订单编号不能为空'
    return
  }

  loading.value = true
  error.value = ''

  try {
    const result = await publicBookingApi.queryOrders({ bookingGroupId: bookingGroupId.value })
    order.value = result.orders[0] || null
    if (!order.value) {
      error.value = '未找到订单详情'
    }
  } catch (requestError) {
    error.value = (requestError as Error).message || '加载失败，请稍后重试'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  void loadDetail()
})
</script>

<template>
  <section class="bounce-in pb-4">
    <article class="card mb-3 p-4">
      <div class="flex items-center justify-between">
        <p class="title-font text-xl text-rose-500">订单详情</p>
        <button class="chip" type="button" @click="router.push({ name: 'order-query' })">查询其他订单</button>
      </div>
      <p class="mt-1 text-xs text-slate-500">请直接截图保存本页面，作为约单凭证</p>
    </article>

    <article v-if="loading" class="card p-4 text-sm text-slate-500">正在加载订单详情...</article>
    <article v-else-if="error" class="card p-4 text-sm text-amber-700">{{ error }}</article>

    <template v-else-if="order">
      <article class="card mb-3 p-4 soft-blue">
        <p class="text-sm font-extrabold text-slate-700">订单编号：{{ order.bookingGroupId }}</p>
        <p class="mt-1 text-sm">客户昵称：{{ order.modelName }}</p>
        <p class="mt-1 text-sm">联系电话：{{ order.modelPhone }}</p>
        <p class="mt-1 text-sm">服务日期：{{ formatCnDate(order.date) }}</p>
        <p class="mt-1 text-sm">服务地点：{{ order.location || '未填写' }}</p>
        <p class="mt-1 text-sm">协同备注：{{ order.note || '无' }}</p>
      </article>

      <article class="card mb-3 p-4 soft-pink">
        <p class="mb-2 text-sm font-extrabold text-slate-700">服务排单清单（{{ order.bookings.length }}项）</p>
        <div class="space-y-2">
          <div v-for="item in order.bookings" :key="item.bookingId" class="rounded-xl border border-rose-100 bg-white p-3">
            <p class="text-xs font-bold text-slate-700">服务者：{{ item.providerName || '未命名服务者' }}</p>
            <p class="mt-1 text-xs text-slate-600">时段：{{ item.startTime }} - {{ item.endTime }}</p>
            <p class="mt-1 text-xs text-slate-600">服务类型：{{ item.serviceTypeCode }}</p>
            <p class="mt-1 text-xs text-slate-600">需求备注：{{ item.note || '无' }}</p>
            <p class="mt-1 text-xs text-slate-600">
              支付状态：{{ depositStatusText[item.depositStatus] || item.depositStatus }}（¥{{ item.amount }}）
            </p>
          </div>
        </div>
      </article>

      <article class="card mb-3 p-3 soft-yellow text-xs text-slate-600">
        <p><i class="fa-regular fa-image mr-1 text-amber-500" />建议：保持整页完整截图，便于后续核验。</p>
      </article>
    </template>

    <Button block round plain type="primary" @click="router.push({ name: 'model-booking' })">返回模特约拍入口</Button>
  </section>
</template>
