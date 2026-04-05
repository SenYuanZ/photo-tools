<script setup lang="ts">
import dayjs from 'dayjs'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Button, CellGroup, DatePicker, Field, Picker, Popup, Uploader, showImagePreview, showToast } from 'vant'
import type { UploaderFileListItem } from 'vant'
import {
  publicBookingApi,
  type PublicProvider,
  type ServiceTypeItem,
} from '../api/app'
import { timeOptions } from '../constants/options'
import { isAfterTime } from '../utils/time'

type UploadItem = UploaderFileListItem & {
  uploadedUrl?: string
}

type ApiErrorLike = Error & {
  details?: unknown
}

type ServiceDraft = {
  providerId: string
  startTime: string
  endTime: string
  requirement: string
  referenceFileList: UploadItem[]
}

const router = useRouter()

const form = reactive({
  modelName: '',
  modelPhone: '',
  date: dayjs().format('YYYY-MM-DD'),
  location: '',
  note: '',
})

const selectedServiceCodes = ref<string[]>(['photography'])
const serviceTypes = ref<ServiceTypeItem[]>([])

const providersByService = reactive<Record<string, PublicProvider[]>>({})
const loadingProvidersByService = reactive<Record<string, boolean>>({})

const serviceDrafts = reactive<Record<string, ServiceDraft>>({
  photography: {
    providerId: '',
    startTime: '10:00',
    endTime: '11:00',
    requirement: '',
    referenceFileList: [],
  },
  makeup: {
    providerId: '',
    startTime: '08:30',
    endTime: '09:30',
    requirement: '',
    referenceFileList: [],
  },
})

const selectedDateValues = ref(form.date.split('-'))
const selectedStartOption = ref('10:00')
const selectedEndOption = ref('11:00')

const showDatePicker = ref(false)
const showProviderPicker = ref(false)
const showStartTimePicker = ref(false)
const showEndTimePicker = ref(false)

const pickerServiceCode = ref('photography')

const uploading = ref(false)
const submitting = ref(false)

const error = ref('')
const success = ref('')

const serviceTypeLabelMap = computed(() =>
  new Map(serviceTypes.value.map((item) => [item.code, item.name])),
)

const activeServices = computed(() =>
  selectedServiceCodes.value
    .map((code) => serviceTypes.value.find((item) => item.code === code))
    .filter(Boolean) as ServiceTypeItem[],
)

const providerColumns = computed(() =>
  (providersByService[pickerServiceCode.value] || []).map((item) => ({
    text: `${item.nickname}`,
    value: item.id,
  })),
)

const selectedProviderLabel = (serviceCode: string) => {
  const providerId = serviceDrafts[serviceCode]?.providerId
  if (!providerId) {
    return loadingProvidersByService[serviceCode] ? '正在加载服务者...' : '请选择服务者'
  }

  const target = (providersByService[serviceCode] || []).find((item) => item.id === providerId)
  return target?.nickname || '请选择服务者'
}

const selectedProvider = (serviceCode: string) => {
  const providerId = serviceDrafts[serviceCode]?.providerId
  if (!providerId) {
    return undefined
  }
  return (providersByService[serviceCode] || []).find((item) => item.id === providerId)
}

const previewProviderPortfolio = (serviceCode: string, startPosition = 0) => {
  const provider = selectedProvider(serviceCode)
  const images = provider?.portfolioImages || []
  if (!images.length) {
    return
  }

  showImagePreview({
    images,
    startPosition,
  })
}

const startColumns = computed(() => timeOptions.map((value) => ({ text: value, value })))
const endColumns = computed(() => timeOptions.map((value) => ({ text: value, value })))

const resolvePublicErrorMessage = (requestError: unknown, fallback: string) => {
  const apiError = requestError as ApiErrorLike
  const message = apiError.message || fallback

  if (message.includes('Cannot GET /api/public/providers')) {
    return '公开服务者接口未生效，请重启后端服务后重试。'
  }

  if (message.includes('Cannot GET /api/public/service-types')) {
    return '公开服务类型接口未生效，请重启后端服务后重试。'
  }

  if (message.includes('Cannot POST /api/public/bookings')) {
    return '公开约单提交接口未生效，请重启后端服务后重试。'
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

const ensureDraft = (serviceCode: string) => {
  if (serviceDrafts[serviceCode]) {
    return serviceDrafts[serviceCode]
  }

  serviceDrafts[serviceCode] = {
    providerId: '',
    startTime: '10:00',
    endTime: '11:00',
    requirement: '',
    referenceFileList: [],
  }
  return serviceDrafts[serviceCode]
}

const getExpectedRoleByService = (serviceCode: string) =>
  serviceCode === 'makeup' ? 'makeup_artist' : 'photographer'

const loadServiceTypes = async () => {
  try {
    const list = await publicBookingApi.listServiceTypes()
    const filtered = list.filter((item) => item.code === 'photography' || item.code === 'makeup')
    serviceTypes.value = filtered.length
      ? filtered
      : [
          { id: 'fallback-photography', code: 'photography', name: '摄影服务', sortOrder: 10, isActive: true },
          { id: 'fallback-makeup', code: 'makeup', name: '妆娘约妆', sortOrder: 20, isActive: true },
        ]
  } catch (requestError) {
    error.value = resolvePublicErrorMessage(requestError, '服务类型加载失败，请稍后重试')
    serviceTypes.value = [
      { id: 'fallback-photography', code: 'photography', name: '摄影服务', sortOrder: 10, isActive: true },
      { id: 'fallback-makeup', code: 'makeup', name: '妆娘约妆', sortOrder: 20, isActive: true },
    ]
  }
}

const loadProvidersForService = async (serviceCode: string) => {
  loadingProvidersByService[serviceCode] = true
  try {
    const providers = await publicBookingApi.listProviders(serviceCode)
    const expectedRole = getExpectedRoleByService(serviceCode)
    providersByService[serviceCode] = providers.filter((item) => item.role === expectedRole)
    const draft = ensureDraft(serviceCode)
    if (!draft.providerId && providersByService[serviceCode].length) {
      draft.providerId = providersByService[serviceCode][0].id
    }
  } catch (requestError) {
    error.value = resolvePublicErrorMessage(requestError, '服务者列表加载失败，请稍后重试')
    providersByService[serviceCode] = []
  } finally {
    loadingProvidersByService[serviceCode] = false
  }
}

watch(
  selectedServiceCodes,
  (codes) => {
    if (!codes.length) {
      selectedServiceCodes.value = ['photography']
      return
    }

    codes.forEach((code) => {
      ensureDraft(code)
      if (!providersByService[code]) {
        void loadProvidersForService(code)
      }
    })
  },
  { immediate: true },
)

onMounted(async () => {
  await loadServiceTypes()
  await Promise.all(selectedServiceCodes.value.map((code) => loadProvidersForService(code)))
})

const toggleService = (serviceCode: string) => {
  error.value = ''
  success.value = ''

  if (selectedServiceCodes.value.includes(serviceCode)) {
    if (selectedServiceCodes.value.length === 1) {
      showToast('至少保留一个服务类型')
      return
    }
    selectedServiceCodes.value = selectedServiceCodes.value.filter((item) => item !== serviceCode)
    return
  }

  if (selectedServiceCodes.value.length >= 2) {
    showToast('一次最多选择两种服务')
    return
  }

  selectedServiceCodes.value = [...selectedServiceCodes.value, serviceCode]
}

const openDate = () => {
  selectedDateValues.value = form.date.split('-')
  showDatePicker.value = true
}

const openProviderPicker = (serviceCode: string) => {
  pickerServiceCode.value = serviceCode
  if (!providersByService[serviceCode]?.length && !loadingProvidersByService[serviceCode]) {
    void loadProvidersForService(serviceCode)
  }
  showProviderPicker.value = true
}

const openStartTimePicker = (serviceCode: string) => {
  pickerServiceCode.value = serviceCode
  selectedStartOption.value = ensureDraft(serviceCode).startTime
  showStartTimePicker.value = true
}

const openEndTimePicker = (serviceCode: string) => {
  pickerServiceCode.value = serviceCode
  selectedEndOption.value = ensureDraft(serviceCode).endTime
  showEndTimePicker.value = true
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

const onAfterRead = async (serviceCode: string, value: UploaderFileListItem | UploaderFileListItem[]) => {
  const uploadTargets = (Array.isArray(value) ? value : [value]) as UploadItem[]
  const draft = ensureDraft(serviceCode)
  if (!draft.referenceFileList) {
    draft.referenceFileList = []
  }

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
  form.modelName = ''
  form.modelPhone = ''
  form.date = dayjs().format('YYYY-MM-DD')
  form.location = ''
  form.note = ''

  selectedServiceCodes.value.forEach((code) => {
    const draft = ensureDraft(code)
    draft.requirement = ''
    draft.referenceFileList = []
  })
}

const submit = async () => {
  error.value = ''
  success.value = ''

  if (uploading.value) {
    error.value = '参考图仍在上传中，请稍候提交。'
    return
  }

  if (!form.modelName || !form.modelPhone || !form.date || !form.location) {
    error.value = '请先补全姓名、手机号、日期和地点。'
    return
  }

  if (!selectedServiceCodes.value.length) {
    error.value = '请至少选择一种服务类型。'
    return
  }

  const items = [] as Array<{
    serviceTypeCode: string
    providerId: string
    startTime: string
    endTime: string
    requirement: string
    referenceImages: string[]
  }>

  for (const serviceCode of selectedServiceCodes.value) {
    const draft = ensureDraft(serviceCode)
    if (!draft.providerId || !draft.startTime || !draft.endTime || !draft.requirement.trim()) {
      error.value = `请补全${serviceTypeLabelMap.value.get(serviceCode) || serviceCode}的信息。`
      return
    }

    if (!isAfterTime(draft.startTime, draft.endTime)) {
      error.value = `${serviceTypeLabelMap.value.get(serviceCode) || serviceCode}的结束时间必须晚于开始时间。`
      return
    }

    items.push({
      serviceTypeCode: serviceCode,
      providerId: draft.providerId,
      startTime: draft.startTime,
      endTime: draft.endTime,
      requirement: draft.requirement.trim(),
      referenceImages: draft.referenceFileList
        .map((item) => item.uploadedUrl || item.url)
        .filter(Boolean) as string[],
    })
  }

  submitting.value = true
  try {
    const result = await publicBookingApi.create({
      modelName: form.modelName,
      modelPhone: form.modelPhone,
      date: form.date,
      location: form.location,
      note: form.note,
      items,
    })

    success.value = `提交成功，已创建协同单 ${result.bookingGroupId}，共 ${result.bookings.length} 条排单。`
    resetFormAfterSuccess()
  } catch (requestError) {
    error.value = resolvePublicErrorMessage(requestError, '提交失败，请稍后重试')
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
            <p class="title-font text-2xl text-rose-500">模特统一约单入口</p>
            <p class="text-xs text-slate-600">同一天可同时提交摄影+妆造，系统会自动关联协同订单</p>
          </div>
          <Button size="small" round plain type="primary" @click="router.push({ name: 'login' })">服务者登录</Button>
        </div>
      </div>
    </article>

    <article class="card mb-3 p-3">
      <CellGroup inset>
        <Field v-model="form.modelName" label="模特姓名" placeholder="请输入你的姓名" clearable />
        <Field v-model="form.modelPhone" label="联系电话" placeholder="请输入手机号" maxlength="11" clearable />
        <Field :model-value="form.date" label="服务日期" readonly is-link @click="openDate" />
        <Field v-model="form.location" label="服务地点" placeholder="例如：创意园A栋 / 某某工作室" clearable />
        <Field v-model="form.note" label="协同备注" placeholder="可选：例如同一主题风格，妆容偏日系" clearable />
      </CellGroup>

      <div class="mt-3 rounded-xl border border-[#f2d9e7] bg-white/90 p-2.5">
        <p class="mb-2 text-xs font-bold text-slate-500">选择服务类型（可多选）</p>
        <div class="grid grid-cols-2 gap-2 text-xs">
          <button
            v-for="service in serviceTypes"
            :key="service.code"
            type="button"
            class="service-chip"
            :class="selectedServiceCodes.includes(service.code) ? 'service-chip--active' : ''"
            @click="toggleService(service.code)"
          >
            <i class="fa-solid fa-circle-check mr-1" :class="selectedServiceCodes.includes(service.code) ? '' : 'text-slate-300'" />
            {{ service.name }}
          </button>
        </div>
      </div>
    </article>

    <article v-for="service in activeServices" :key="service.code" class="card mb-3 p-3" :class="service.code === 'makeup' ? 'soft-yellow' : 'soft-pink'">
      <p class="mb-2 text-sm font-extrabold">
        <i :class="service.code === 'makeup' ? 'fa-solid fa-wand-sparkles text-amber-500' : 'fa-solid fa-camera text-rose-500'" class="mr-1" />
        {{ service.name }}信息
      </p>

      <CellGroup inset>
        <Field
          :model-value="selectedProviderLabel(service.code)"
          :label="service.code === 'makeup' ? '选择妆娘' : '选择摄影师'"
          readonly
          is-link
          @click="openProviderPicker(service.code)"
        />
        <Field :model-value="serviceDrafts[service.code].startTime" label="开始时间" readonly is-link @click="openStartTimePicker(service.code)" />
        <Field :model-value="serviceDrafts[service.code].endTime" label="结束时间" readonly is-link @click="openEndTimePicker(service.code)" />
        <Field
          v-model="serviceDrafts[service.code].requirement"
          :label="service.code === 'makeup' ? '妆造需求' : '拍摄需求'"
          type="textarea"
          rows="3"
          autosize
          :placeholder="service.code === 'makeup' ? '例如：偏清透奶油肌、需要编发' : '例如：希望自然感抓拍、偏日系构图'"
        />
      </CellGroup>

      <p
        v-if="!loadingProvidersByService[service.code] && !(providersByService[service.code] || []).length"
        class="mt-2 text-xs text-amber-700"
      >
        <i class="fa-solid fa-triangle-exclamation mr-1" />当前暂无可选服务者，请确认后端已升级并配置对应身份账号。
      </p>

      <div v-if="selectedProvider(service.code)" class="mt-2 rounded-xl border border-blue-100 bg-white/90 p-2.5">
        <div class="flex items-center gap-2">
          <img
            :src="selectedProvider(service.code)?.avatarUrl || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=320&q=80'"
            alt="服务者头像"
            class="h-10 w-10 rounded-xl object-cover"
          />
          <div class="min-w-0 flex-1">
            <p class="text-xs font-extrabold text-slate-700">
              {{ selectedProvider(service.code)?.nickname }}
              <span class="chip ml-1">{{ service.code === 'makeup' ? '妆娘' : '摄影师' }}</span>
            </p>
            <p class="truncate text-[11px] text-slate-500">
              {{ selectedProvider(service.code)?.bio || '该服务者暂未填写个人简介。' }}
            </p>
          </div>
        </div>

        <div v-if="selectedProvider(service.code)?.portfolioPublic && (selectedProvider(service.code)?.portfolioImages || []).length" class="mt-2">
          <div class="mb-1 flex items-center justify-between">
            <p class="text-[11px] font-bold text-slate-500">公开作品集</p>
            <button class="chip" type="button" @click="previewProviderPortfolio(service.code, 0)">查看全部</button>
          </div>
          <div class="grid grid-cols-3 gap-2">
            <button
              v-for="(image, index) in (selectedProvider(service.code)?.portfolioImages || []).slice(0, 3)"
              :key="`${service.code}-portfolio-${index}`"
              type="button"
              class="overflow-hidden rounded-lg border border-blue-100"
              @click="previewProviderPortfolio(service.code, index)"
            >
              <img :src="image" alt="公开作品" class="h-16 w-full object-cover" />
            </button>
          </div>
        </div>
      </div>

      <div class="mt-3">
        <p class="mb-2 text-xs font-bold text-slate-500">参考图（最多 6 张）</p>
        <Uploader
          v-model="serviceDrafts[service.code].referenceFileList"
          :max-count="6"
          multiple
          :disabled="uploading"
          :after-read="(value: any) => onAfterRead(service.code, value)"
          :deletable="!uploading"
          preview-size="72"
          upload-text="上传参考图"
        />
        <div
          v-if="serviceDrafts[service.code].referenceFileList.filter((item) => item.status === 'failed' && item.file).length"
          class="mt-2 space-y-1"
        >
          <div
            v-for="item in serviceDrafts[service.code].referenceFileList.filter((file) => file.status === 'failed' && file.file)"
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
    </article>

    <article v-if="success" class="card mb-3 p-3 text-xs text-blue-600 soft-blue">
      <i class="fa-solid fa-circle-check mr-1" />{{ success }}
    </article>

    <Button block round type="primary" :loading="submitting" @click="submit">
      <i class="fa-solid fa-paper-plane mr-1" />提交统一约单
    </Button>

    <Popup v-model:show="showProviderPicker" position="bottom" round>
      <Picker
        :columns="providerColumns"
        @cancel="showProviderPicker = false"
        @confirm="({ selectedOptions }: any) => { serviceDrafts[pickerServiceCode].providerId = selectedOptions[0]?.value || ''; showProviderPicker = false }"
      />
    </Popup>

    <Popup v-model:show="showDatePicker" position="bottom" round>
      <DatePicker
        v-model="selectedDateValues"
        title="选择服务日期"
        @cancel="showDatePicker = false"
        @confirm="({ selectedValues }: any) => { form.date = normalizeDate(selectedValues); showDatePicker = false }"
      />
    </Popup>

    <Popup v-model:show="showStartTimePicker" position="bottom" round>
      <Picker
        :columns="startColumns"
        @cancel="showStartTimePicker = false"
        @confirm="({ selectedOptions }: any) => { serviceDrafts[pickerServiceCode].startTime = selectedOptions[0]?.value || serviceDrafts[pickerServiceCode].startTime; showStartTimePicker = false }"
      />
    </Popup>

    <Popup v-model:show="showEndTimePicker" position="bottom" round>
      <Picker
        :columns="endColumns"
        @cancel="showEndTimePicker = false"
        @confirm="({ selectedOptions }: any) => { serviceDrafts[pickerServiceCode].endTime = selectedOptions[0]?.value || serviceDrafts[pickerServiceCode].endTime; showEndTimePicker = false }"
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

.service-chip {
  border: 1px solid #f2d9e7;
  border-radius: 12px;
  background: #fff;
  color: #64748b;
  font-weight: 700;
  padding: 8px 10px;
}

.service-chip--active {
  border-color: #ff9ec3;
  background: #fff1f7;
  color: #c63f79;
}
</style>
