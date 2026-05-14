<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import dayjs from 'dayjs'
import { Button, CellGroup, DatePicker, Field, Popup, TimePicker, Uploader, showConfirmDialog, showImagePreview } from 'vant'
import type { UploaderFileListItem } from 'vant'
import { scheduleApi } from '../api/app'
import PageHeader from '../components/PageHeader.vue'
import ServiceTags from '../components/ServiceTags.vue'
import {
  depositStatusText,
  timeHourOptions,
  timeMinuteOptions,
} from '../constants/options'
import { useAppStore } from '../stores/app'
import { formatCnDate, isAfterTime } from '../utils/time'

const route = useRoute()
const router = useRouter()
const store = useAppStore()

const scheduleId = computed(() => String(route.params.id ?? ''))
const schedule = computed(() => store.getScheduleById(scheduleId.value))
const customer = computed(() => (schedule.value ? store.getCustomerById(schedule.value.customerId) : undefined))

const isEditing = ref(false)
const feedback = ref('')
const showDatePicker = ref(false)
const showRestoreDatePicker = ref(false)
const showStartTimePicker = ref(false)
const showEndTimePicker = ref(false)
const uploadingReferences = ref(false)

type UploadItem = UploaderFileListItem & {
  uploadedUrl?: string
}

const referenceFileList = ref<UploadItem[]>([])

const failedReferenceUploads = computed(() =>
  referenceFileList.value.filter((item) => item.status === 'failed' && item.file),
)

const selectedDateValues = ref(dayjs().format('YYYY-MM-DD').split('-'))
const selectedRestoreDateValues = ref(dayjs().format('YYYY-MM-DD').split('-'))
const selectedStartTimeValues = ref(['09', '00'])
const selectedEndTimeValues = ref(['10', '00'])

const timeColumns = [timeHourOptions, timeMinuteOptions]
const isStored = computed(() => schedule.value?.status === 'stored')
const isCompleted = computed(() => schedule.value?.status === 'completed')
const detailRoleCodes = computed(() => {
  if (!schedule.value) {
    return []
  }
  if (schedule.value.serviceRoleCodes?.length) {
    return schedule.value.serviceRoleCodes
  }
  return schedule.value.serviceTypeCode === 'makeup' ? ['makeup_artist'] : ['photographer']
})

const editForm = reactive({
  date: '',
  startTime: '09:00',
  endTime: '10:00',
  location: '',
  note: '',
})

const paymentForm = reactive({
  depositStatus: 'unpaid' as 'unpaid' | 'paid' | 'full',
  amount: '0',
})

watch(
  schedule,
  (value) => {
    if (!value) {
      return
    }
    editForm.date = value.date
    editForm.startTime = value.startTime
    editForm.endTime = value.endTime
    editForm.location = value.location
    editForm.note = value.note
    paymentForm.depositStatus = value.depositStatus
    paymentForm.amount = String(value.amount ?? 0)

    selectedDateValues.value = editForm.date.split('-')
    selectedStartTimeValues.value = editForm.startTime.split(':')
    selectedEndTimeValues.value = editForm.endTime.split(':')
    referenceFileList.value = (value.referenceImages || []).map((url) => ({
      uploadedUrl: url,
      url,
      status: 'done',
      message: '',
    }))
  },
  { immediate: true },
)

const getReferenceUrls = () =>
  referenceFileList.value
    .map((item) => item.uploadedUrl || item.url)
    .filter(Boolean) as string[]

const normalizeDate = (values: string[]) => {
  const [year, month, day] = values
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

const openDate = () => {
  selectedDateValues.value = editForm.date.split('-')
  showDatePicker.value = true
}

const openStartTime = () => {
  selectedStartTimeValues.value = editForm.startTime.split(':')
  showStartTimePicker.value = true
}

const openEndTime = () => {
  selectedEndTimeValues.value = editForm.endTime.split(':')
  showEndTimePicker.value = true
}

const toggleReminder = async (type: '1d' | '1h') => {
  if (!schedule.value) {
    return
  }
  const list = new Set(schedule.value.reminders)
  if (list.has(type)) {
    list.delete(type)
  } else {
    list.add(type)
  }
  try {
    await store.updateSchedule(schedule.value.id, { reminders: [...list] })
  } catch {
    feedback.value = '提醒设置更新失败，请稍后重试。'
  }
}

const saveEdit = async () => {
  if (!schedule.value) {
    return
  }
  if (uploadingReferences.value) {
    feedback.value = '参考图仍在上传中，请稍后保存。'
    return
  }
  if (!isAfterTime(editForm.startTime, editForm.endTime)) {
    feedback.value = '结束时间必须晚于开始时间。'
    return
  }

  const result = await store.updateSchedule(schedule.value.id, {
    date: editForm.date,
    startTime: editForm.startTime,
    endTime: editForm.endTime,
    location: editForm.location,
    note: editForm.note,
    referenceImages: getReferenceUrls(),
  })

  if (!result.ok) {
    feedback.value = '修改失败：存在档期冲突。'
    return
  }

  feedback.value = '排单信息已更新。'
  isEditing.value = false
}

const savePaymentStatus = async () => {
  if (!schedule.value) {
    return
  }

  const amount = Number(paymentForm.amount)
  if (Number.isNaN(amount)) {
    feedback.value = '请输入有效金额。'
    return
  }

  if (amount < 0) {
    feedback.value = '金额不能为负数。'
    return
  }

  if ((paymentForm.depositStatus === 'paid' || paymentForm.depositStatus === 'full') && amount <= 0) {
    feedback.value = '已支付或全款状态时金额必须大于 0。'
    return
  }

  try {
    const result = await store.updateSchedule(schedule.value.id, {
      depositStatus: paymentForm.depositStatus,
      amount,
    })

    if (!result.ok) {
      feedback.value = '更新收款状态失败：存在档期冲突。'
      return
    }

    feedback.value = '收款状态已更新。'
  } catch (error) {
    feedback.value = (error as Error).message || '更新收款状态失败，请稍后重试。'
  }
}

const storeSchedule = async () => {
  if (!schedule.value) {
    return
  }

  const result = await store.updateSchedule(schedule.value.id, {
    status: 'stored',
  })

  if (!result.ok) {
    feedback.value = '存单失败，请稍后重试。'
    return
  }

  feedback.value = '已存单，可在首页暂存订单中恢复。'
}

const completeSchedule = async () => {
  if (!schedule.value) {
    return
  }

  try {
    await showConfirmDialog({
      title: '完成订单确认',
      message: '确认后将完成该订单，是否继续？',
      confirmButtonText: '确认完成',
      cancelButtonText: '取消',
    })

    const updated = await store.completeSchedule(schedule.value.id)
    feedback.value =
      updated.status === 'completed'
        ? '订单已完成，可在日历的当天完成中查看。'
        : '订单状态已更新。'
  } catch (error) {
    const message = (error as Error).message || ''
    if (message === 'cancel') {
      return
    }
    feedback.value = message || '完单失败，请稍后重试。'
  }
}

const openRestoreDate = () => {
  selectedRestoreDateValues.value = dayjs().format('YYYY-MM-DD').split('-')
  showRestoreDatePicker.value = true
}

const restoreSchedule = async (selectedValues: string[]) => {
  if (!schedule.value) {
    showRestoreDatePicker.value = false
    return
  }

  const date = normalizeDate(selectedValues)
  const result = await store.updateSchedule(schedule.value.id, {
    status: 'normal',
    date,
  })

  if (!result.ok) {
    feedback.value = '恢复失败：该时段有冲突，请更换日期。'
    return
  }

  feedback.value = '已恢复为正常排单。'
  showRestoreDatePicker.value = false
}

const remove = async () => {
  if (!schedule.value) {
    return
  }
  await store.deleteSchedule(schedule.value.id)
  router.push({ name: 'home' })
}

const copyPhone = async () => {
  const phone = customer.value?.phone
  if (!phone) {
    return
  }
  try {
    await navigator.clipboard.writeText(phone)
    feedback.value = '电话已复制。'
  } catch {
    feedback.value = '复制失败，请手动复制。'
  }
}

const navigateToMap = () => {
  const location = encodeURIComponent(editForm.location || schedule.value?.location || '')
  if (!location) {
    return
  }
  window.open(`https://uri.amap.com/search?keyword=${location}`, '_blank')
}

const previewReferences = (startPosition = 0) => {
  const images = isEditing.value ? getReferenceUrls() : schedule.value?.referenceImages || []
  if (!images.length) {
    return
  }

  showImagePreview({
    images,
    startPosition,
  })
}

const uploadSingleReference = async (item: UploadItem) => {
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

const onAfterReadReference = async (value: UploaderFileListItem | UploaderFileListItem[]) => {
  const items = (Array.isArray(value) ? value : [value]) as UploadItem[]
  uploadingReferences.value = true
  try {
    await Promise.all(
      items.map(async (item) => {
        try {
          await uploadSingleReference(item)
        } catch (uploadError) {
          item.status = 'failed'
          item.message = (uploadError as Error).message || '上传失败'
        }
      }),
    )
  } finally {
    uploadingReferences.value = false
  }
}

const retryReferenceUpload = async (item: UploadItem) => {
  uploadingReferences.value = true
  try {
    await uploadSingleReference(item)
  } catch (uploadError) {
    item.status = 'failed'
    item.message = (uploadError as Error).message || '上传失败'
    feedback.value = item.message
  } finally {
    uploadingReferences.value = false
  }
}
</script>

<template>
  <section class="bounce-in" v-if="schedule && customer">
    <PageHeader title="排单详情" back right-text="编辑" @back="router.back()" @right="isEditing = !isEditing" />

    <article class="card mb-3 p-3 soft-pink">
      <p class="mb-2 text-sm font-extrabold">
        <i class="fa-regular fa-calendar mr-1 text-rose-500" />排单基础信息
      </p>
      <p v-if="isStored" class="mb-2 text-xs font-bold text-amber-600">
        <i class="fa-solid fa-box-archive mr-1" />当前订单处于暂存状态，不参与日程安排。
      </p>
      <p v-else-if="isCompleted" class="mb-2 text-xs font-bold text-emerald-600">
        <i class="fa-solid fa-circle-check mr-1" />当前订单已完成，可在日历的当天完成中查看。
      </p>
      <div class="space-y-1 text-sm">
        <template v-if="isEditing">
          <CellGroup inset>
            <Field :model-value="editForm.date" label="拍摄日期" readonly is-link @click="openDate" />
            <Field :model-value="editForm.startTime" label="开始时间" readonly is-link @click="openStartTime" />
            <Field :model-value="editForm.endTime" label="结束时间" readonly is-link @click="openEndTime" />
            <Field v-model="editForm.location" label="拍摄地点" placeholder="请输入地点" />
          </CellGroup>
        </template>
        <template v-else>
          <p>拍摄日期：{{ formatCnDate(schedule.date) }}</p>
          <p>拍摄时段：{{ schedule.startTime }} - {{ schedule.endTime }}</p>
          <p>
            支付情况：{{ depositStatusText[schedule.depositStatus] }}（¥{{ schedule.amount }}）
            <span v-if="customer.tailPaymentDate">· 尾款 {{ customer.tailPaymentDate }}</span>
          </p>
          <p>
            拍摄地点：{{ schedule.location }}
            <button type="button" class="chip ml-1" @click="navigateToMap">一键导航</button>
          </p>
        </template>
      </div>
    </article>

    <article class="card mb-3 p-3 soft-blue">
      <p class="mb-2 text-sm font-extrabold"><i class="fa-solid fa-book-open mr-1 text-blue-500" />客户备注信息</p>
      <template v-if="isEditing">
        <textarea v-model="editForm.note" class="textarea" rows="4" />
      </template>
      <template v-else>
        <div class="space-y-1 text-xs leading-6 text-slate-600">
          <p><span class="font-extrabold">拍摄风格：</span>{{ customer.style || '未填写' }}</p>
          <p><span class="font-extrabold">客户爱好：</span>{{ customer.hobby || '未填写' }}</p>
          <p><span class="font-extrabold">特殊需求：</span>{{ customer.specialNeed || '未填写' }}</p>
          <p><span class="font-extrabold">现场备注：</span>{{ schedule.note || '无' }}</p>
          <p><span class="font-extrabold">穿搭建议：</span>{{ customer.outfit || '未填写' }}</p>
          <p><span class="font-extrabold">陪同人员：</span>{{ customer.companions || '无' }}</p>
        </div>
      </template>
    </article>

    <article class="card mb-3 p-3 soft-yellow">
      <p class="mb-2 text-sm font-extrabold"><i class="fa-solid fa-user mr-1 text-amber-500" />客户基础信息</p>
      <div class="space-y-1 text-sm">
        <p>客户姓名：{{ customer.name }}</p>
        <p>
          联系电话：{{ customer.phone }}
          <button class="chip ml-1" type="button" @click="copyPhone">复制</button>
          <a class="chip ml-1" :href="`tel:${customer.phone}`">拨号</a>
        </p>
          <p>服务类型：{{ store.getServiceTypeName(schedule.serviceTypeCode) }}</p>
          <div class="flex items-start gap-1">
            <span class="text-sm">服务角色：</span>
            <ServiceTags :role-codes="detailRoleCodes" />
          </div>
          <p>客户类型：{{ store.getCustomerTypeName(customer.type) }}</p>
        <p>
          备注标签：
          <span v-for="tag in customer.tags" :key="tag" class="chip ml-1">{{ tag }}</span>
          <span v-if="!customer.tags.length" class="text-xs text-slate-500">无</span>
        </p>
      </div>
    </article>

    <article class="card mb-4 p-3">
      <p class="mb-2 text-sm font-extrabold"><i class="fa-regular fa-bell mr-1 text-rose-500" />提醒设置</p>
      <div class="grid grid-cols-2 gap-2 text-xs">
        <button class="btn-secondary" type="button" @click="toggleReminder('1d')">
          <i :class="schedule.reminders.includes('1d') ? 'fa-solid fa-toggle-on text-blue-500' : 'fa-solid fa-toggle-off text-slate-300'" class="mr-1" />
          提前 1 天
        </button>
        <button class="btn-secondary" type="button" @click="toggleReminder('1h')">
          <i :class="schedule.reminders.includes('1h') ? 'fa-solid fa-toggle-on text-blue-500' : 'fa-solid fa-toggle-off text-slate-300'" class="mr-1" />
          提前 1 小时
        </button>
      </div>
    </article>

    <article class="card mb-4 p-3 soft-yellow">
      <p class="mb-2 text-sm font-extrabold"><i class="fa-solid fa-wallet mr-1 text-amber-500" />收款确认</p>
      <div class="grid grid-cols-3 gap-2 text-xs">
        <button
          type="button"
          class="btn-secondary"
          :class="paymentForm.depositStatus === 'unpaid' ? 'ring-2 ring-rose-200 bg-rose-50 text-rose-500' : ''"
          @click="paymentForm.depositStatus = 'unpaid'"
        >
          未支付
        </button>
        <button
          type="button"
          class="btn-secondary"
          :class="paymentForm.depositStatus === 'paid' ? 'ring-2 ring-blue-200 bg-blue-50 text-blue-500' : ''"
          @click="paymentForm.depositStatus = 'paid'"
        >
          已支付
        </button>
        <button
          type="button"
          class="btn-secondary"
          :class="paymentForm.depositStatus === 'full' ? 'ring-2 ring-emerald-200 bg-emerald-50 text-emerald-600' : ''"
          @click="paymentForm.depositStatus = 'full'"
        >
          全款
        </button>
      </div>

      <Field
        v-model="paymentForm.amount"
        class="mt-2 rounded-xl"
        label="实收金额"
        type="number"
        placeholder="请输入到账金额"
      />

      <p class="mt-1 text-xs text-slate-500">
        建议到账后再确认状态；切回未支付时将保留历史金额记录。
      </p>

      <Button block round type="primary" class="mt-2" @click="savePaymentStatus">
        <i class="fa-solid fa-money-check-dollar mr-1" />保存收款状态
      </Button>
    </article>

    <article v-if="isEditing || schedule.referenceImages?.length" class="card mb-4 p-3 soft-blue">
      <div class="mb-2 flex items-center justify-between">
        <p class="text-sm font-extrabold"><i class="fa-regular fa-image mr-1 text-blue-500" />动作参考图</p>
        <button class="chip" type="button" @click="previewReferences(0)">预览全部</button>
      </div>

      <div v-if="isEditing" class="mb-2">
        <Uploader
          v-model="referenceFileList"
          :max-count="6"
          multiple
          :disabled="uploadingReferences"
          :after-read="onAfterReadReference"
          :deletable="!uploadingReferences"
          preview-size="72"
          upload-text="继续添加参考图"
        />

        <div v-if="failedReferenceUploads.length" class="mt-2 space-y-1">
          <div
            v-for="item in failedReferenceUploads"
            :key="item.url || item.file?.name"
            class="flex items-center justify-between text-xs text-amber-700"
          >
            <span>有图片上传失败，可重试</span>
            <Button
              size="small"
              round
              plain
              type="primary"
              :disabled="uploadingReferences"
              @click="retryReferenceUpload(item)"
            >
              重试
            </Button>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-3 gap-2">
        <button
          v-for="(image, index) in (isEditing ? getReferenceUrls() : schedule.referenceImages || [])"
          :key="`${image}-${index}`"
          type="button"
          class="overflow-hidden rounded-xl border border-blue-100 bg-white"
          @click="previewReferences(index)"
        >
          <img :src="image" alt="动作参考图" class="h-20 w-full object-cover" />
        </button>
      </div>
    </article>

    <p v-if="feedback" class="mb-2 text-xs text-blue-500">{{ feedback }}</p>
    <div class="grid grid-cols-2 gap-2">
      <button v-if="isEditing" class="btn-primary" type="button" @click="saveEdit">
        <i class="fa-solid fa-floppy-disk mr-1" />保存修改
      </button>
      <button v-else class="btn-primary" type="button" @click="router.push({ name: 'settings' })">
        <i class="fa-regular fa-bell mr-1" />设置提醒
      </button>
      <button class="btn-secondary" type="button" @click="remove">
        <i class="fa-solid fa-trash-can mr-1" />删除排单
      </button>
      <button v-if="!isEditing && !isStored && !isCompleted" class="btn-secondary" type="button" @click="completeSchedule">
        <i class="fa-solid fa-flag-checkered mr-1" />完成订单
      </button>
      <button v-if="!isStored" class="btn-secondary" type="button" @click="storeSchedule">
        <i class="fa-solid fa-box-archive mr-1" />存单
      </button>
      <button v-else class="btn-primary" type="button" @click="openRestoreDate">
        <i class="fa-solid fa-calendar-check mr-1" />恢复排单
      </button>
    </div>

    <Popup v-model:show="showDatePicker" position="bottom" round>
      <DatePicker
        v-model="selectedDateValues"
        title="选择拍摄日期"
        @cancel="showDatePicker = false"
        @confirm="({ selectedValues }: any) => { editForm.date = normalizeDate(selectedValues); showDatePicker = false }"
      />
    </Popup>

    <Popup v-model:show="showRestoreDatePicker" position="bottom" round>
      <DatePicker
        v-model="selectedRestoreDateValues"
        title="恢复排单日期"
        @cancel="showRestoreDatePicker = false"
        @confirm="({ selectedValues }: any) => restoreSchedule(selectedValues)"
      />
    </Popup>

    <Popup v-model:show="showStartTimePicker" position="bottom" round>
      <TimePicker
        v-model="selectedStartTimeValues"
        title="选择开始时间"
        :columns="timeColumns"
        @cancel="showStartTimePicker = false"
        @confirm="({ selectedValues }: any) => { editForm.startTime = `${selectedValues[0]}:${selectedValues[1]}`; showStartTimePicker = false }"
      />
    </Popup>

    <Popup v-model:show="showEndTimePicker" position="bottom" round>
      <TimePicker
        v-model="selectedEndTimeValues"
        title="选择结束时间"
        :columns="timeColumns"
        @cancel="showEndTimePicker = false"
        @confirm="({ selectedValues }: any) => { editForm.endTime = `${selectedValues[0]}:${selectedValues[1]}`; showEndTimePicker = false }"
      />
    </Popup>
  </section>

  <section v-else class="card p-4 text-sm text-slate-500">未找到排单信息，可能已被删除。</section>
</template>
