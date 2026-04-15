<script setup lang="ts">
import dayjs from 'dayjs'
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Button, CellGroup, DatePicker, Field, Picker, Popup, TimePicker, Uploader } from 'vant'
import type { UploaderFileListItem } from 'vant'
import PageHeader from '../components/PageHeader.vue'
import { scheduleApi } from '../api/app'
import {
  depositStatusOptions,
  depositStatusText,
  timeHourOptions,
  timeMinuteOptions,
} from '../constants/options'
import { useAppStore } from '../stores/app'
import { isAfterTime } from '../utils/time'

const route = useRoute()
const router = useRouter()
const store = useAppStore()

const customerIdFromQuery = typeof route.query.customerId === 'string' ? route.query.customerId : ''
const dateFromQuery = typeof route.query.date === 'string' ? route.query.date : dayjs().format('YYYY-MM-DD')
const startFromQuery = typeof route.query.start === 'string' ? route.query.start : '10:00'
const endFromQuery = typeof route.query.end === 'string' ? route.query.end : '11:30'
const entryModeFromQuery = customerIdFromQuery ? 'existing' : 'temporary'

type EntryMode = 'existing' | 'temporary'

const form = reactive({
  entryMode: entryModeFromQuery as EntryMode,
  customerId: customerIdFromQuery,
  temporaryCustomerName: '',
  temporaryCustomerPhone: '',
  temporaryCustomerType: '',
  date: dateFromQuery,
  startTime: startFromQuery,
  endTime: endFromQuery,
  location: '',
  note: '',
  depositStatus: 'unpaid',
  amount: 300,
})

const error = ref('')
const success = ref('')
const conflictId = ref('')

const showCustomerPicker = ref(false)
const showDatePicker = ref(false)
const showStartTimePicker = ref(false)
const showEndTimePicker = ref(false)
const showDepositPicker = ref(false)
const showTemporaryTypePicker = ref(false)
const uploading = ref(false)

type UploadItem = UploaderFileListItem & {
  uploadedUrl?: string
}

const referenceFileList = ref<UploadItem[]>([])

const failedUploads = computed(() =>
  referenceFileList.value.filter((item) => item.status === 'failed' && item.file),
)

const selectedDateValues = ref(form.date.split('-'))
const selectedStartTimeValues = ref(form.startTime.split(':'))
const selectedEndTimeValues = ref(form.endTime.split(':'))

const customers = computed(() => store.customers.filter((item) => item.isLongTerm !== false))
const customerColumns = computed(() =>
  customers.value.map((item) => ({
    text: `${item.name} · ${item.phone}`,
    value: item.id,
  })),
)

const selectedCustomerLabel = computed(() => {
  const customer = customers.value.find((item) => item.id === form.customerId)
  return customer ? `${customer.name} · ${customer.phone}` : '选择客户'
})

const depositStatusColumns = depositStatusOptions.map(([value, text]) => ({ text, value }))
const temporaryTypeColumns = computed(() =>
  store.customerTypes.map((item) => ({
    text: item.name,
    value: item.code,
  })),
)
const depositStatusLabel = computed(
  () => depositStatusOptions.find(([value]) => value === form.depositStatus)?.[1] ?? '请选择定金状态',
)
const temporaryTypeLabel = computed(
  () => (form.temporaryCustomerType ? store.getCustomerTypeName(form.temporaryCustomerType) : '请选择客户类型'),
)

const timeColumns = [timeHourOptions, timeMinuteOptions]

const isMakeupRole = computed(() => store.userRole === 'makeup_artist')
const pageTitle = computed(() => (isMakeupRole.value ? '约妆录入' : '排单录入'))
const serviceLabel = computed(() => (isMakeupRole.value ? '约妆' : '拍摄'))
const locationLabel = computed(() => (isMakeupRole.value ? '约妆地点' : '拍摄地点'))
const locationPlaceholder = computed(() => (isMakeupRole.value ? '请输入约妆地点' : '请输入拍摄地点'))
const notePlaceholder = computed(() => (isMakeupRole.value ? '填写妆造备注' : '填写拍摄备注'))
const referenceTitle = computed(() => (isMakeupRole.value ? '妆容参考图（最多 6 张）' : '动作参考图（最多 6 张）'))
const submitLabel = computed(() => (isMakeupRole.value ? '提交约妆' : '提交排单'))
const serviceTypeCode = computed(() => (isMakeupRole.value ? 'makeup' : 'photography'))

const conflictSchedule = computed(() => (conflictId.value ? store.getScheduleById(conflictId.value) : undefined))
const conflictCustomerName = computed(() => {
  if (!conflictSchedule.value) {
    return ''
  }
  return store.getCustomerById(conflictSchedule.value.customerId)?.name ?? '未知客户'
})

const normalizeDate = (values: string[]) => {
  const [year, month, day] = values
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

watch(
  () => form.customerId,
  (id) => {
    if (form.entryMode !== 'existing') {
      return
    }
    const customer = store.getCustomerById(id)
    if (!customer) {
      return
    }
    form.location = customer.location
    form.depositStatus = customer.depositStatus
    form.note = customer.specialNeed
  },
  { immediate: true },
)

watch(
  () => store.customerTypes,
  (list) => {
    if (!form.temporaryCustomerType && list.length) {
      form.temporaryCustomerType = list[0].code
    }
  },
  { immediate: true },
)

const switchMode = (mode: EntryMode) => {
  form.entryMode = mode
  error.value = ''
  success.value = ''
  conflictId.value = ''
}

const openDate = () => {
  selectedDateValues.value = form.date.split('-')
  showDatePicker.value = true
}

const openStartTime = () => {
  selectedStartTimeValues.value = form.startTime.split(':')
  showStartTimePicker.value = true
}

const openEndTime = () => {
  selectedEndTimeValues.value = form.endTime.split(':')
  showEndTimePicker.value = true
}

const submit = async () => {
  error.value = ''
  success.value = ''
  conflictId.value = ''

  if (uploading.value) {
    error.value = '参考图仍在上传中，请稍候提交。'
    return
  }

  if (!form.date || !form.startTime || !form.endTime) {
    error.value = '请补全服务时间。'
    return
  }

  if (form.entryMode === 'existing' && !form.customerId) {
    error.value = '请选择长期客户。'
    return
  }

  if (
    form.entryMode === 'temporary' &&
    (!form.temporaryCustomerName.trim() || !form.temporaryCustomerPhone.trim())
  ) {
    error.value = '请填写临时客户姓名和手机号。'
    return
  }

  if (form.entryMode === 'temporary' && !store.customerTypes.length) {
    error.value = '当前未配置客户类型，请先在数据库中维护客户类型。'
    return
  }

  if (form.entryMode === 'temporary' && !form.temporaryCustomerType) {
    error.value = '请先选择客户类型。'
    return
  }
  if (!form.location) {
    error.value = '请填写服务地点。'
    return
  }

  if (!isAfterTime(form.startTime, form.endTime)) {
    error.value = '结束时间必须晚于开始时间。'
    return
  }

  try {
    const result = await store.addSchedule({
      date: form.date,
      startTime: form.startTime,
      endTime: form.endTime,
      location: form.location,
      note: form.note,
      referenceImages: referenceFileList.value
        .map((item) => item.uploadedUrl || item.url)
        .filter(Boolean) as string[],
      depositStatus: form.depositStatus as 'unpaid' | 'paid' | 'full',
      amount: Number(form.amount) || 0,
      reminders: [...store.defaultReminders],
      serviceTypeCode: serviceTypeCode.value,
      ...(form.entryMode === 'existing'
        ? {
            customerId: form.customerId,
          }
        : {
            temporaryCustomer: {
              name: form.temporaryCustomerName.trim(),
              phone: form.temporaryCustomerPhone.trim(),
              type: form.temporaryCustomerType,
            },
          }),
    })

    if (!result.ok) {
      conflictId.value = result.conflict.id
      error.value = '该时段已有安排，请更换时间。'
      return
    }

    success.value = `${pageTitle.value}成功，已同步到首页。`
    setTimeout(() => {
      router.push({ name: 'home' })
    }, 500)
  } catch (requestError) {
    error.value = (requestError as Error).message || '提交失败，请稍后重试'
  }
}

const uploadSingle = async (item: UploadItem) => {
  const file = item.file
  if (!(file instanceof File)) {
    return
  }

  item.status = 'uploading'
  item.message = '0%'

  const result = await scheduleApi.uploadReferenceImage(file, (percent) => {
    item.message = `${percent}%`
  })

  item.uploadedUrl = result.url
  item.url = result.thumbnail
  item.status = 'done'
  item.message = ''
  delete item.file
}

const onAfterRead = async (value: UploaderFileListItem | UploaderFileListItem[]) => {
  const items = Array.isArray(value) ? value : [value]
  const uploadTargets = items as UploadItem[]

  uploading.value = true
  try {
    await Promise.all(
      uploadTargets.map(async (item) => {
        try {
          await uploadSingle(item)
        } catch (uploadError) {
          item.status = 'failed'
          item.message = (uploadError as Error).message || '上传失败'
        }
      }),
    )
  } catch (uploadError) {
    const message = (uploadError as Error).message || '上传失败'
    error.value = message
  } finally {
    uploading.value = false
  }
}

const retryUpload = async (item: UploadItem) => {
  uploading.value = true
  error.value = ''
  try {
    await uploadSingle(item)
  } catch (uploadError) {
    item.status = 'failed'
    item.message = (uploadError as Error).message || '上传失败'
    error.value = item.message
  } finally {
    uploading.value = false
  }
}
</script>

<template>
  <section class="bounce-in">
    <PageHeader :title="pageTitle" back @back="router.back()" />

    <article class="card mb-3 p-3">
      <div class="mb-3 grid grid-cols-2 gap-2">
        <Button block round :type="form.entryMode === 'existing' ? 'primary' : 'default'" @click="switchMode('existing')">
          关联长期客户
        </Button>
        <Button block round :type="form.entryMode === 'temporary' ? 'primary' : 'default'" @click="switchMode('temporary')">
          临时客户直录
        </Button>
      </div>

      <p class="mb-2 text-xs text-slate-500">
        <i class="fa-solid fa-circle-info mr-1 text-blue-400" />
        临时客户用于一次性排单，不会展示在客户管理中；长期客户请在客户录入里维护。
      </p>

      <Button block round plain type="primary" class="mb-3" @click="router.push({ name: 'customer-new' })">
        新增长期客户
      </Button>

      <CellGroup inset>
        <template v-if="form.entryMode === 'existing'">
          <Field
            :model-value="selectedCustomerLabel"
            label="选择客户"
            required
            readonly
            is-link
            @click="showCustomerPicker = true"
          />
        </template>
        <template v-else>
          <Field v-model="form.temporaryCustomerName" label="临时客户" required placeholder="请输入姓名" clearable />
          <Field v-model="form.temporaryCustomerPhone" label="联系电话" required type="tel" placeholder="请输入手机号" clearable />
          <Field
            :model-value="temporaryTypeLabel"
            label="客户类型"
            required
            readonly
            is-link
            @click="showTemporaryTypePicker = true"
          />
        </template>
        <Field :model-value="form.date" :label="`${serviceLabel}日期`" required readonly is-link @click="openDate" />
        <Field :model-value="form.startTime" label="开始时间" required readonly is-link @click="openStartTime" />
        <Field :model-value="form.endTime" label="结束时间" required readonly is-link @click="openEndTime" />
        <Field v-model="form.location" :label="locationLabel" required :placeholder="locationPlaceholder" clearable />
        <Field
          :model-value="depositStatusLabel"
          label="定金状态"
          required
          readonly
          is-link
          @click="showDepositPicker = true"
        />
        <Field v-model="form.amount" label="定金金额" type="number" placeholder="请输入金额" />
        <Field v-model="form.note" label="备注信息" type="textarea" rows="2" autosize :placeholder="notePlaceholder" />
      </CellGroup>

      <div class="mt-3">
        <p class="mb-2 text-xs font-bold text-slate-500">{{ referenceTitle }}</p>
        <Uploader
          v-model="referenceFileList"
          :max-count="6"
          multiple
          :disabled="uploading"
          :after-read="onAfterRead"
          :deletable="!uploading"
          preview-size="72"
          upload-text="上传参考图"
        />

        <div v-if="failedUploads.length" class="mt-2 space-y-1">
          <div v-for="item in failedUploads" :key="item.url || item.file?.name" class="flex items-center justify-between text-xs text-amber-700">
            <span>有图片上传失败，可重试</span>
            <Button size="small" round plain type="primary" :disabled="uploading" @click="retryUpload(item)">重试</Button>
          </div>
        </div>
      </div>
    </article>

    <article v-if="error" class="card mb-3 p-3 text-xs text-amber-700 soft-yellow">
      <p class="font-bold"><i class="fa-solid fa-triangle-exclamation mr-1" />{{ error }}</p>
      <p v-if="conflictSchedule" class="mt-1">
        冲突排单：{{ conflictCustomerName }} {{ conflictSchedule.startTime }} - {{ conflictSchedule.endTime }}（{{
          depositStatusText[conflictSchedule.depositStatus]
        }}）
      </p>
    </article>

    <article v-if="success" class="card mb-3 p-3 text-xs text-blue-600 soft-blue">
      <i class="fa-solid fa-circle-check mr-1" />{{ success }}
    </article>

    <Button block round type="primary" @click="submit">
      <i class="fa-solid fa-paper-plane mr-1" />{{ submitLabel }}
    </Button>

    <Popup v-model:show="showCustomerPicker" position="bottom" round>
      <Picker
        :columns="customerColumns"
        @cancel="showCustomerPicker = false"
        @confirm="({ selectedOptions }: any) => { form.customerId = selectedOptions[0]?.value || ''; showCustomerPicker = false }"
      />
    </Popup>

    <Popup v-model:show="showTemporaryTypePicker" position="bottom" round>
      <Picker
        :columns="temporaryTypeColumns"
        @cancel="showTemporaryTypePicker = false"
        @confirm="({ selectedOptions }: any) => { form.temporaryCustomerType = selectedOptions[0]?.value || form.temporaryCustomerType; showTemporaryTypePicker = false }"
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
        :title="`选择${serviceLabel}日期`"
        @cancel="showDatePicker = false"
        @confirm="({ selectedValues }: any) => { form.date = normalizeDate(selectedValues); showDatePicker = false }"
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
