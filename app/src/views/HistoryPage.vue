<script setup lang="ts">
import dayjs from 'dayjs'
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { CellGroup, Field, Loading, Picker, Popup } from 'vant'
import PageHeader from '../components/PageHeader.vue'
import { customerTypeOptions, customerTypeText, depositStatusText } from '../constants/options'
import { useAppStore } from '../stores/app'
import type { Customer, Schedule } from '../types/models'

type HistoryItem = Schedule & { customer?: Customer }

const router = useRouter()
const store = useAppStore()

const month = ref(dayjs().format('YYYY-MM'))
const type = ref('all')
const loading = ref(false)
const list = ref<HistoryItem[]>([])

const showMonthPicker = ref(false)
const showTypePicker = ref(false)

const monthOptions = computed(() => {
  const set = new Set(store.schedules.map((item) => dayjs(item.date).format('YYYY-MM')))
  set.add(dayjs().format('YYYY-MM'))
  return [...set].sort((a, b) => b.localeCompare(a))
})

const monthColumns = computed(() => monthOptions.value.map((item) => ({ text: item, value: item })))
const typeColumns = [{ text: '全部类型', value: 'all' }, ...customerTypeOptions.map(([value, text]) => ({ text, value }))]

const typeLabel = computed(() =>
  type.value === 'all' ? '全部类型' : customerTypeOptions.find(([value]) => value === type.value)?.[1] ?? '全部类型',
)

const confirmMonth = ({ selectedOptions }: { selectedOptions: Array<{ value: string }> }) => {
  month.value = selectedOptions[0]?.value || month.value
  showMonthPicker.value = false
}

const confirmType = ({ selectedOptions }: { selectedOptions: Array<{ value: string }> }) => {
  type.value = selectedOptions[0]?.value || type.value
  showTypePicker.value = false
}

const loadHistory = async () => {
  loading.value = true
  try {
    list.value = await store.refreshHistory(month.value, type.value)
  } finally {
    loading.value = false
  }
}

onMounted(loadHistory)
watch([month, type], loadHistory)

const resolveCustomer = (item: HistoryItem) => item.customer ?? store.getCustomerById(item.customerId)
</script>

<template>
  <section class="bounce-in">
    <PageHeader title="历史排单" back @back="router.back()" />

    <article class="card mb-3 p-3 soft-yellow">
      <CellGroup inset>
        <Field :model-value="month" label="月份" readonly is-link @click="showMonthPicker = true" />
        <Field :model-value="typeLabel" label="客户类型" readonly is-link @click="showTypePicker = true" />
      </CellGroup>
    </article>

    <div v-if="loading" class="card p-4 text-center text-sm text-slate-500">
      <Loading size="18px" color="#ff7fae" class="mr-2 inline-flex" />加载中...
    </div>

    <div v-else class="space-y-2">
      <article
        v-for="item in list"
        :key="item.id"
        class="card p-3"
        :class="dayjs(item.date).isSame(dayjs(), 'day') ? 'soft-pink' : ''"
      >
        <p class="font-extrabold">
          {{ dayjs(item.date).format('MM/DD') }} · {{ resolveCustomer(item)?.name }} ·
          {{ customerTypeText[resolveCustomer(item)?.type ?? 'other'] }}
        </p>
        <p class="mt-1 text-xs text-slate-600">
          {{ item.startTime }} - {{ item.endTime }} · {{ item.location }} ·
          {{ depositStatusText[item.depositStatus] }}
        </p>
        <p class="mt-1 text-xs text-slate-500">备注：{{ item.note || '无' }}</p>
      </article>
      <div v-if="!list.length" class="card p-3 text-sm text-slate-500">该筛选条件下暂无历史排单。</div>
    </div>

    <Popup v-model:show="showMonthPicker" position="bottom" round>
      <Picker :columns="monthColumns" @cancel="showMonthPicker = false" @confirm="confirmMonth" />
    </Popup>

    <Popup v-model:show="showTypePicker" position="bottom" round>
      <Picker :columns="typeColumns" @cancel="showTypePicker = false" @confirm="confirmType" />
    </Popup>
  </section>
</template>
