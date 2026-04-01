<script setup lang="ts">
import dayjs from 'dayjs'
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Button, CellGroup, DatePicker, Field, Picker, Popup, TimePicker } from 'vant'
import PageHeader from '../components/PageHeader.vue'
import {
  customerTypeOptions,
  depositStatusOptions,
  timeHourOptions,
  timeMinuteOptions,
} from '../constants/options'
import { useAppStore } from '../stores/app'
import { isAfterTime } from '../utils/time'

const store = useAppStore()
const router = useRouter()

const form = reactive({
  name: '',
  phone: '',
  type: 'personal',
  date: dayjs().format('YYYY-MM-DD'),
  startTime: '09:00',
  endTime: '11:00',
  style: '',
  hobby: '',
  specialNeed: '',
  depositStatus: 'unpaid',
  tailPaymentDate: '',
  outfit: '',
  location: '',
  companions: '',
  tags: '',
})

const error = ref('')
const success = ref('')

const showTypePicker = ref(false)
const showDepositPicker = ref(false)
const showDatePicker = ref(false)
const showStartTimePicker = ref(false)
const showEndTimePicker = ref(false)
const showTailDatePicker = ref(false)

const selectedDateValues = ref(form.date.split('-'))
const selectedTailDateValues = ref(dayjs().format('YYYY-MM-DD').split('-'))
const selectedStartTimeValues = ref(form.startTime.split(':'))
const selectedEndTimeValues = ref(form.endTime.split(':'))

const customerTypeColumns = customerTypeOptions.map(([value, text]) => ({ text, value }))
const depositStatusColumns = depositStatusOptions.map(([value, text]) => ({ text, value }))
const timeColumns = [timeHourOptions, timeMinuteOptions]

const customerTypeLabel = computed(
  () => customerTypeOptions.find(([value]) => value === form.type)?.[1] ?? '请选择客户类型',
)
const depositStatusLabel = computed(
  () => depositStatusOptions.find(([value]) => value === form.depositStatus)?.[1] ?? '请选择定金状态',
)

const normalizeDate = (values: string[]) => {
  const [year, month, day] = values
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

const openDate = () => {
  selectedDateValues.value = form.date.split('-')
  showDatePicker.value = true
}

const openTailDate = () => {
  selectedTailDateValues.value = (form.tailPaymentDate || dayjs().format('YYYY-MM-DD')).split('-')
  showTailDatePicker.value = true
}

const openStartTime = () => {
  selectedStartTimeValues.value = form.startTime.split(':')
  showStartTimePicker.value = true
}

const openEndTime = () => {
  selectedEndTimeValues.value = form.endTime.split(':')
  showEndTimePicker.value = true
}

const saveCustomer = async () => {
  error.value = ''
  success.value = ''

  if (!form.name || !form.phone || !form.type || !form.date || !form.startTime || !form.endTime) {
    error.value = '请先填写所有必填项。'
    return
  }

  if (!isAfterTime(form.startTime, form.endTime)) {
    error.value = '结束时间要晚于开始时间哦。'
    return
  }

  try {
    const created = await store.addCustomer({
      name: form.name,
      phone: form.phone,
      type: form.type as 'personal' | 'couple' | 'family' | 'business' | 'other',
      style: form.style,
      hobby: form.hobby,
      specialNeed: form.specialNeed,
      depositStatus: form.depositStatus as 'unpaid' | 'paid' | 'full',
      tailPaymentDate: form.tailPaymentDate,
      outfit: form.outfit,
      location: form.location,
      companions: form.companions,
      tags: form.tags.split(/[,，]/).map((item) => item.trim()),
    })

    success.value = '客户信息保存成功，正在跳转排单录入页。'
    setTimeout(() => {
      router.push({
        name: 'schedule-new',
        query: {
          customerId: created.id,
          date: form.date,
          start: form.startTime,
          end: form.endTime,
        },
      })
    }, 500)
  } catch (requestError) {
    error.value = (requestError as Error).message || '保存失败，请重试'
  }
}
</script>

<template>
  <section class="bounce-in">
    <PageHeader title="添加客户信息" back @back="router.back()" />

    <article class="card mb-3 p-3">
      <p class="mb-2 text-sm font-extrabold">
        <i class="fa-solid fa-user-group mr-1 text-blue-500" />基础信息 <span class="text-rose-500">*</span>
      </p>
      <CellGroup inset>
        <Field v-model="form.name" label="客户姓名" placeholder="请输入客户姓名" clearable />
        <Field v-model="form.phone" label="联系电话" type="tel" placeholder="请输入联系电话" clearable />
        <Field
          :model-value="customerTypeLabel"
          label="客户类型"
          readonly
          is-link
          placeholder="请选择客户类型"
          @click="showTypePicker = true"
        />
      </CellGroup>
    </article>

    <article class="card mb-3 p-3 soft-yellow">
      <p class="mb-2 text-sm font-extrabold">
        <i class="fa-regular fa-calendar mr-1 text-amber-500" />排单相关 <span class="text-rose-500">*</span>
      </p>
      <CellGroup inset>
        <Field :model-value="form.date" label="拍摄日期" readonly is-link @click="openDate" />
        <Field :model-value="form.startTime" label="开始时间" readonly is-link @click="openStartTime" />
        <Field :model-value="form.endTime" label="结束时间" readonly is-link @click="openEndTime" />
      </CellGroup>
    </article>

    <article class="card mb-3 p-3 soft-blue">
      <p class="mb-2 text-sm font-extrabold"><i class="fa-solid fa-note-sticky mr-1 text-blue-500" />备注信息</p>
      <CellGroup inset>
        <Field v-model="form.style" label="拍摄风格" placeholder="如：日系卡通" />
        <Field v-model="form.hobby" label="客户爱好" placeholder="如：喜欢可爱元素" />
        <Field v-model="form.specialNeed" label="特殊需求" placeholder="如：带宠物拍摄" />
        <Field
          :model-value="depositStatusLabel"
          label="定金状态"
          readonly
          is-link
          @click="showDepositPicker = true"
        />
        <Field
          :model-value="form.tailPaymentDate || '未设置'"
          label="尾款日期"
          readonly
          is-link
          @click="openTailDate"
        />
      </CellGroup>
    </article>

    <article class="card mb-4 p-3">
      <p class="mb-2 text-sm font-extrabold"><i class="fa-solid fa-plus mr-1 text-rose-500" />附加信息</p>
      <CellGroup inset>
        <Field v-model="form.outfit" label="穿搭建议" placeholder="浅色系更合适" />
        <Field v-model="form.location" label="拍摄地点" placeholder="请输入拍摄地点" />
        <Field v-model="form.companions" label="陪同人员" placeholder="如：闺蜜 1 人" />
        <Field v-model="form.tags" label="标签" placeholder="多个标签用逗号分隔" />
      </CellGroup>
    </article>

    <p v-if="error" class="mb-2 text-xs text-rose-500">{{ error }}</p>
    <p v-if="success" class="mb-2 text-xs text-blue-500">{{ success }}</p>
    <Button block round type="primary" @click="saveCustomer">
      <i class="fa-solid fa-check mr-1" />保存客户
    </Button>

    <Popup v-model:show="showTypePicker" position="bottom" round>
      <Picker
        :columns="customerTypeColumns"
        @cancel="showTypePicker = false"
        @confirm="({ selectedOptions }: any) => { form.type = selectedOptions[0]?.value || form.type; showTypePicker = false }"
      />
    </Popup>

    <Popup v-model:show="showDepositPicker" position="bottom" round>
      <Picker
        :columns="depositStatusColumns"
        @cancel="showDepositPicker = false"
        @confirm="({ selectedOptions }: any) => { form.depositStatus = selectedOptions[0]?.value || form.depositStatus; showDepositPicker = false }"
      />
    </Popup>

    <Popup v-model:show="showDatePicker" position="bottom" round>
      <DatePicker
        v-model="selectedDateValues"
        title="选择拍摄日期"
        @cancel="showDatePicker = false"
        @confirm="({ selectedValues }: any) => { form.date = normalizeDate(selectedValues); showDatePicker = false }"
      />
    </Popup>

    <Popup v-model:show="showTailDatePicker" position="bottom" round>
      <DatePicker
        v-model="selectedTailDateValues"
        title="选择尾款日期"
        @cancel="showTailDatePicker = false"
        @confirm="({ selectedValues }: any) => { form.tailPaymentDate = normalizeDate(selectedValues); showTailDatePicker = false }"
      />
    </Popup>

    <Popup v-model:show="showStartTimePicker" position="bottom" round>
      <TimePicker
        v-model="selectedStartTimeValues"
        title="选择开始时间"
        :columns="timeColumns"
        @cancel="showStartTimePicker = false"
        @confirm="({ selectedValues }: any) => { form.startTime = `${selectedValues[0]}:${selectedValues[1]}`; showStartTimePicker = false }"
      />
    </Popup>

    <Popup v-model:show="showEndTimePicker" position="bottom" round>
      <TimePicker
        v-model="selectedEndTimeValues"
        title="选择结束时间"
        :columns="timeColumns"
        @cancel="showEndTimePicker = false"
        @confirm="({ selectedValues }: any) => { form.endTime = `${selectedValues[0]}:${selectedValues[1]}`; showEndTimePicker = false }"
      />
    </Popup>
  </section>
</template>
