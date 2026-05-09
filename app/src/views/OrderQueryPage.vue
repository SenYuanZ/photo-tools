<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Button, CellGroup, Field, showToast } from 'vant'
import { publicBookingApi, type PublicOrderDetail } from '../api/app'
import { formatCnDate } from '../utils/time'

const router = useRouter()

const form = reactive({
  bookingGroupId: '',
  modelPhone: '',
  modelName: '',
})

const loading = ref(false)
const error = ref('')
const orders = ref<PublicOrderDetail[]>([])

const submit = async () => {
  error.value = ''
  orders.value = []

  const bookingGroupId = form.bookingGroupId.trim()
  const modelPhone = form.modelPhone.trim()
  const modelName = form.modelName.trim()

  if (!bookingGroupId && !modelPhone && !modelName) {
    error.value = '请输入订单编号，或输入客户手机/客户昵称'
    return
  }

  loading.value = true
  try {
    const result = await publicBookingApi.queryOrders({
      bookingGroupId: bookingGroupId || undefined,
      modelPhone: bookingGroupId ? undefined : (modelPhone || undefined),
      modelName: bookingGroupId ? undefined : (modelName || undefined),
    })
    orders.value = result.orders || []
    if (!orders.value.length) {
      showToast('未查询到订单')
    }
  } catch (requestError) {
    error.value = (requestError as Error).message || '查询失败，请稍后重试'
  } finally {
    loading.value = false
  }
}

const openDetail = (bookingGroupId: string) => {
  router.push({
    name: 'public-order-detail',
    params: { bookingGroupId },
  })
}
</script>

<template>
  <section class="bounce-in pb-4">
    <article class="card mb-3 p-4">
      <p class="title-font text-xl text-rose-500">查询订单详情</p>
      <p class="mt-1 text-xs text-slate-500">支持订单编号精确查询，或手机号/客户昵称历史查询</p>
    </article>

    <article class="card mb-3 p-3">
      <CellGroup inset>
        <Field v-model="form.bookingGroupId" label="订单编号" placeholder="输入订单编号可直接查唯一订单" clearable />
        <Field v-model="form.modelPhone" label="客户手机" placeholder="可单独输入手机号查询" maxlength="11" clearable />
        <Field v-model="form.modelName" label="客户昵称" placeholder="可单独输入昵称查询" clearable />
      </CellGroup>

      <p v-if="error" class="mt-2 text-xs text-amber-700">{{ error }}</p>

      <Button block round type="primary" class="mt-3" :loading="loading" @click="submit">
        <i class="fa-solid fa-magnifying-glass mr-1" />立即查询
      </Button>
    </article>

    <article v-if="orders.length" class="card mb-3 p-3 soft-blue">
      <p class="mb-2 text-sm font-extrabold text-slate-700">查询结果（{{ orders.length }}条）</p>
      <div class="space-y-2">
        <button
          v-for="item in orders"
          :key="item.bookingGroupId"
          type="button"
          class="w-full rounded-xl border border-blue-100 bg-white p-3 text-left"
          @click="openDetail(item.bookingGroupId)"
        >
          <p class="text-xs font-bold text-slate-700">订单编号：{{ item.bookingGroupId }}</p>
          <p class="mt-1 text-xs text-slate-600">客户：{{ item.modelName }}（{{ item.modelPhone }}）</p>
          <p class="mt-1 text-xs text-slate-600">日期：{{ formatCnDate(item.date) }}</p>
          <p class="mt-1 text-xs text-slate-600">地点：{{ item.location || '未填写' }}</p>
        </button>
      </div>
    </article>

    <Button block round plain type="primary" @click="router.push({ name: 'login' })">返回登录页</Button>
  </section>
</template>
