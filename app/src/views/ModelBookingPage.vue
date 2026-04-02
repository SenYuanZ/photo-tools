<script setup lang="ts">
import dayjs from 'dayjs'
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Button, CellGroup, DatePicker, Field, Picker, Popup, TimePicker, Uploader } from 'vant'
import type { UploaderFileListItem } from 'vant'
import { publicBookingApi, type PublicPhotographer } from '../api/app'
import { timeHourOptions, timeMinuteOptions } from '../constants/options'
import { isAfterTime } from '../utils/time'

type UploadItem = UploaderFileListItem & {
  uploadedUrl?: string
}

type ApiErrorLike = Error & {
  details?: unknown
}

const router = useRouter()

const photographers = ref<PublicPhotographer[]>([])
const loadingPhotographers = ref(false)

const form = reactive({
  photographerId: '',
  modelName: '',
  modelPhone: '',
  date: dayjs().format('YYYY-MM-DD'),
  startTime: '10:00',
  endTime: '11:00',
  location: '',
  poseRequirement: '',
})

const selectedDateValues = ref(form.date.split('-'))
const selectedStartTimeValues = ref(form.startTime.split(':'))
const selectedEndTimeValues = ref(form.endTime.split(':'))

const showPhotographerPicker = ref(false)
const showDatePicker = ref(false)
const showStartTimePicker = ref(false)
const showEndTimePicker = ref(false)

const uploading = ref(false)
const submitting = ref(false)
const referenceFileList = ref<UploadItem[]>([])

const error = ref('')
const success = ref('')
const conflictHint = ref('')

const photographerColumns = computed(() =>
  photographers.value.map((item) => ({
    text: `${item.nickname}（${item.account}）`,
    value: item.id,
  })),
)

const selectedPhotographerLabel = computed(() => {
  const item = photographers.value.find((current) => current.id === form.photographerId)
  if (!item) {
    return loadingPhotographers.value ? '正在加载摄影师...' : '请选择摄影师'
  }
  return `${item.nickname}（${item.account}）`
})

const failedUploads = computed(() =>
  referenceFileList.value.filter((item) => item.status === 'failed' && item.file),
)

const timeColumns = [timeHourOptions, timeMinuteOptions]

const resolvePublicErrorMessage = (requestError: unknown, fallback: string) => {
  const apiError = requestError as ApiErrorLike
  const message = apiError.message || fallback

  if (message.includes('Cannot GET /api/public/photographers')) {
    return '公开约拍接口未生效，请重启后端服务后重试。'
  }

  if (message.includes('Cannot POST /api/public/reference-images')) {
    return '公开图片上传接口未生效，请重启后端服务后重试。'
  }

  if (message.includes('Cannot POST /api/public/bookings')) {
    return '公开约拍提交接口未生效，请重启后端服务后重试。'
  }

  if (message.includes('Failed to fetch')) {
    return '无法连接后端服务，请确认 server 已启动。'
  }

  return message
}

const normalizeDate = (values: string[]) => {
  const [year, month, day] = values
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

const loadPhotographers = async () => {
  loadingPhotographers.value = true
  try {
    const list = await publicBookingApi.listPhotographers()
    photographers.value = list
    if (!form.photographerId && list.length) {
      form.photographerId = list[0].id
    }
    if (!list.length) {
      error.value = '当前暂无可预约摄影师，请先创建摄影师账号。'
    }
  } catch (requestError) {
    error.value = resolvePublicErrorMessage(requestError, '摄影师列表加载失败，请稍后重试')
  } finally {
    loadingPhotographers.value = false
  }
}

onMounted(() => {
  void loadPhotographers()
})

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

const openPhotographerPicker = async () => {
  if (!photographers.value.length && !loadingPhotographers.value) {
    await loadPhotographers()
  }
  showPhotographerPicker.value = true
}

const uploadSingle = async (item: UploadItem) => {
  const file = item.file
  if (!(file instanceof File)) {
    return
  }

  item.status = 'uploading'
  item.message = '0%'

  const result = await publicBookingApi.uploadReferenceImage(file, (percent) => {
    item.message = `${percent}%`
  })

  item.uploadedUrl = result.url
  item.url = result.thumbnail
  item.status = 'done'
  item.message = ''
  delete item.file
}

const onAfterRead = async (value: UploaderFileListItem | UploaderFileListItem[]) => {
  const uploadTargets = (Array.isArray(value) ? value : [value]) as UploadItem[]
  uploading.value = true
  try {
    await Promise.all(
      uploadTargets.map(async (item) => {
        try {
          await uploadSingle(item)
        } catch (uploadError) {
          item.status = 'failed'
          item.message = resolvePublicErrorMessage(uploadError, '上传失败')
          error.value = item.message
        }
      }),
    )
  } finally {
    uploading.value = false
  }
}

const retryUpload = async (item: UploadItem) => {
  uploading.value = true
  try {
    await uploadSingle(item)
  } catch (uploadError) {
    item.status = 'failed'
    item.message = resolvePublicErrorMessage(uploadError, '上传失败')
    error.value = item.message
  } finally {
    uploading.value = false
  }
}

const resetFormAfterSuccess = () => {
  const photographerId = form.photographerId
  form.photographerId = photographerId
  form.modelName = ''
  form.modelPhone = ''
  form.date = dayjs().format('YYYY-MM-DD')
  form.startTime = '10:00'
  form.endTime = '11:00'
  form.location = ''
  form.poseRequirement = ''
  referenceFileList.value = []
}

const submit = async () => {
  error.value = ''
  success.value = ''
  conflictHint.value = ''

  if (uploading.value) {
    error.value = '参考图仍在上传中，请稍候提交。'
    return
  }

  if (!form.photographerId || !form.modelName || !form.modelPhone || !form.location || !form.poseRequirement) {
    error.value = '请先补全摄影师、联系方式、地点和动作要求。'
    return
  }

  if (!isAfterTime(form.startTime, form.endTime)) {
    error.value = '结束时间必须晚于开始时间。'
    return
  }

  submitting.value = true
  try {
    await publicBookingApi.create({
      photographerId: form.photographerId,
      modelName: form.modelName,
      modelPhone: form.modelPhone,
      date: form.date,
      startTime: form.startTime,
      endTime: form.endTime,
      location: form.location,
      poseRequirement: form.poseRequirement,
      referenceImages: referenceFileList.value
        .map((item) => item.uploadedUrl || item.url)
        .filter(Boolean) as string[],
    })

    success.value = '约拍信息已提交，摄影师会在排单里看到你的动作要求和参考图。'
    resetFormAfterSuccess()
  } catch (requestError) {
    const apiError = requestError as ApiErrorLike
    error.value = resolvePublicErrorMessage(requestError, '提交失败，请稍后重试')
    const conflict = (apiError.details as { message?: { conflict?: { date?: string; startTime?: string; endTime?: string } } } | undefined)?.message?.conflict
    if (conflict?.date && conflict.startTime && conflict.endTime) {
      conflictHint.value = `摄影师在 ${conflict.date} ${conflict.startTime}-${conflict.endTime} 已有安排，请换一个时段。`
    }
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <section class="bounce-in pb-4">
    <article class="card mb-3 overflow-hidden p-0">
      <div class="model-hero px-4 py-4">
        <div class="flex items-center justify-between">
          <div>
            <p class="title-font text-2xl text-rose-500">模特约拍入口</p>
            <p class="text-xs text-slate-600">免登录提交约拍，动作要求会直接同步给摄影师</p>
          </div>
          <Button size="small" round plain type="primary" @click="router.push({ name: 'login' })">摄影师登录</Button>
        </div>
      </div>
    </article>

    <article class="card mb-3 p-3">
      <CellGroup inset>
        <Field
          :model-value="selectedPhotographerLabel"
          label="选择摄影师"
          readonly
          is-link
          @click="openPhotographerPicker"
        />
        <Field v-model="form.modelName" label="模特姓名" placeholder="请输入你的姓名" clearable />
        <Field v-model="form.modelPhone" label="联系电话" placeholder="请输入手机号" maxlength="11" clearable />
        <Field :model-value="form.date" label="拍摄日期" readonly is-link @click="openDate" />
        <Field :model-value="form.startTime" label="开始时间" readonly is-link @click="openStartTime" />
        <Field :model-value="form.endTime" label="结束时间" readonly is-link @click="openEndTime" />
        <Field v-model="form.location" label="拍摄地点" placeholder="例如：创意园A栋 / 某某公园" clearable />
        <Field
          v-model="form.poseRequirement"
          label="动作要求"
          type="textarea"
          rows="3"
          autosize
          placeholder="告诉摄影师你希望的动作风格、镜头感、情绪表达"
        />
      </CellGroup>

      <div v-if="!loadingPhotographers && !photographers.length" class="mt-2 flex items-center justify-between text-xs text-amber-700">
        <span>未获取到摄影师列表，请刷新后重试。</span>
        <Button size="small" round plain type="primary" @click="loadPhotographers">刷新</Button>
      </div>

      <div class="mt-3">
        <p class="mb-2 text-xs font-bold text-slate-500">动作参考图（最多 6 张）</p>
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
          <div
            v-for="item in failedUploads"
            :key="item.url || item.file?.name"
            class="flex items-center justify-between text-xs text-amber-700"
          >
            <span>有图片上传失败，可重试</span>
            <Button size="small" round plain type="primary" :disabled="uploading" @click="retryUpload(item)">
              重试
            </Button>
          </div>
        </div>
      </div>
    </article>

    <article v-if="error" class="card mb-3 p-3 text-xs text-amber-700 soft-yellow">
      <p class="font-bold"><i class="fa-solid fa-triangle-exclamation mr-1" />{{ error }}</p>
      <p v-if="conflictHint" class="mt-1">{{ conflictHint }}</p>
    </article>

    <article v-if="success" class="card mb-3 p-3 text-xs text-blue-600 soft-blue">
      <i class="fa-solid fa-circle-check mr-1" />{{ success }}
    </article>

    <Button block round type="primary" :loading="submitting" :disabled="loadingPhotographers || !photographers.length" @click="submit">
      <i class="fa-solid fa-paper-plane mr-1" />提交约拍信息
    </Button>

    <Popup v-model:show="showPhotographerPicker" position="bottom" round>
      <Picker
        :columns="photographerColumns"
        @cancel="showPhotographerPicker = false"
        @confirm="({ selectedOptions }: any) => { form.photographerId = selectedOptions[0]?.value || ''; showPhotographerPicker = false }"
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

<style scoped>
.model-hero {
  background:
    radial-gradient(circle at 15% 18%, #ffe8f2 0%, transparent 30%),
    radial-gradient(circle at 84% 12%, #e3f3ff 0%, transparent 35%),
    linear-gradient(140deg, #fff8fc 0%, #f3f9ff 48%, #fffbed 100%);
}
</style>
