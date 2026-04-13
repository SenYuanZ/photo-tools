<script setup lang="ts">
import dayjs from 'dayjs'
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Button, CellGroup, DatePicker, Field, Picker, Popup, Uploader, showImagePreview, showToast } from 'vant'
import type { UploaderFileListItem } from 'vant'
import {
  type CustomerTypeItem,
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

type TimeRange = {
  startTime: string
  endTime: string
}

type AvailabilityState = {
  loading: boolean
  error: string
  blockedSlots: string[]
  availableSlots: string[]
  busyRanges: TimeRange[]
  freeRanges: TimeRange[]
  lastKey: string
}

type ProviderAvailabilitySummary = {
  loading: boolean
  key: string
  freeRangeCount: number | null
  availableSlotCount: number | null
}

const router = useRouter()
const RECENT_PROVIDER_STORAGE_KEY = 'photo_order_recent_providers'

const parseRecentProviderStorage = () => {
  try {
    const raw = localStorage.getItem(RECENT_PROVIDER_STORAGE_KEY)
    if (!raw) {
      return {
        photography: [],
        makeup: [],
      } as Record<string, string[]>
    }

    const parsed = JSON.parse(raw) as Record<string, unknown>
    return {
      photography: Array.isArray(parsed.photography) ? parsed.photography.filter((item) => typeof item === 'string') : [],
      makeup: Array.isArray(parsed.makeup) ? parsed.makeup.filter((item) => typeof item === 'string') : [],
    }
  } catch {
    return {
      photography: [],
      makeup: [],
    } as Record<string, string[]>
  }
}

const form = reactive({
  modelName: '',
  modelPhone: '',
  date: dayjs().format('YYYY-MM-DD'),
  customerTypeCode: '',
  location: '',
  note: '',
})

const selectedServiceCodes = ref<string[]>(['photography'])
const serviceTypes = ref<ServiceTypeItem[]>([])
const customerTypes = ref<CustomerTypeItem[]>([])

const providersByService = reactive<Record<string, PublicProvider[]>>({})
const loadingProvidersByService = reactive<Record<string, boolean>>({})
const availabilityByService = reactive<Record<string, AvailabilityState>>({})
const availabilityRequestSeq = reactive<Record<string, number>>({})
const providerAvailabilityByService = reactive<
  Record<string, Record<string, ProviderAvailabilitySummary>>
>({})
const providerAvailabilityRequestSeq = reactive<Record<string, number>>({})

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

const showDatePicker = ref(false)
const showCustomerTypePicker = ref(false)
const showProviderPicker = ref(false)
const showStartTimePicker = ref(false)
const showEndTimePicker = ref(false)

const pickerServiceCode = ref('photography')

const uploading = ref(false)
const submitting = ref(false)

const error = ref('')
const success = ref('')
const providerKeywordInput = ref('')
const providerKeyword = ref('')
const recentProviderIdsByService = reactive<Record<string, string[]>>(parseRecentProviderStorage())

let providerKeywordTimer = 0

const serviceTypeLabelMap = computed(() =>
  new Map(serviceTypes.value.map((item) => [item.code, item.name])),
)

const activeServices = computed(() =>
  selectedServiceCodes.value
    .map((code) => serviceTypes.value.find((item) => item.code === code))
    .filter(Boolean) as ServiceTypeItem[],
)

const providersOfPicker = computed(() => providersByService[pickerServiceCode.value] || [])

const filterProviderWithKeyword = (provider: PublicProvider) => {
  const keyword = providerKeyword.value.trim().toLowerCase()
  if (!keyword) {
    return true
  }

  return [provider.nickname, provider.account, provider.bio]
    .join(' ')
    .toLowerCase()
    .includes(keyword)
}

const ensureProviderAvailabilitySummary = (serviceCode: string, providerId: string) => {
  if (!providerAvailabilityByService[serviceCode]) {
    providerAvailabilityByService[serviceCode] = {}
  }

  if (!providerAvailabilityByService[serviceCode][providerId]) {
    providerAvailabilityByService[serviceCode][providerId] = {
      loading: false,
      key: '',
      freeRangeCount: null,
      availableSlotCount: null,
    }
  }

  return providerAvailabilityByService[serviceCode][providerId]
}

const getProviderAvailabilitySummary = (serviceCode: string, providerId: string) =>
  providerAvailabilityByService[serviceCode]?.[providerId]

const getProviderAvailabilityScore = (serviceCode: string, providerId: string) => {
  const summary = getProviderAvailabilitySummary(serviceCode, providerId)
  if (!summary || summary.key !== form.date) {
    return -1
  }
  if (summary.loading) {
    return -0.5
  }
  if (summary.freeRangeCount === null) {
    return -1
  }
  return summary.freeRangeCount
}

const getProviderAvailabilityText = (serviceCode: string, providerId: string) => {
  const summary = getProviderAvailabilitySummary(serviceCode, providerId)
  if (!summary || summary.key !== form.date) {
    return '待统计'
  }
  if (summary.loading) {
    return '统计中'
  }
  if ((summary.freeRangeCount ?? 0) <= 0) {
    return '无可约'
  }
  return `可约${summary.freeRangeCount}段`
}

const getProviderAvailabilityClass = (serviceCode: string, providerId: string) => {
  const summary = getProviderAvailabilitySummary(serviceCode, providerId)
  if (!summary || summary.key !== form.date || summary.loading) {
    return 'text-slate-400'
  }
  if ((summary.freeRangeCount ?? 0) <= 0) {
    return 'text-rose-400'
  }
  return 'text-emerald-600'
}

const sortProvidersByAvailability = (serviceCode: string, providers: PublicProvider[]) =>
  [...providers].sort((left, right) => {
    const leftScore = getProviderAvailabilityScore(serviceCode, left.id)
    const rightScore = getProviderAvailabilityScore(serviceCode, right.id)
    if (leftScore !== rightScore) {
      return rightScore - leftScore
    }
    return left.nickname.localeCompare(right.nickname, 'zh-CN')
  })

const recentProvidersOfPicker = computed(() => {
  const recentIds = recentProviderIdsByService[pickerServiceCode.value] || []
  if (!recentIds.length) {
    return [] as PublicProvider[]
  }

  const map = new Map(providersOfPicker.value.map((item) => [item.id, item]))
  return recentIds
    .map((id) => map.get(id))
    .filter((item): item is PublicProvider => Boolean(item))
    .filter(filterProviderWithKeyword)
    .sort((left, right) => {
      const leftScore = getProviderAvailabilityScore(pickerServiceCode.value, left.id)
      const rightScore = getProviderAvailabilityScore(pickerServiceCode.value, right.id)
      return rightScore - leftScore
    })
})

const commonProvidersOfPicker = computed(() => {
  const recentSet = new Set((recentProviderIdsByService[pickerServiceCode.value] || []))
  return sortProvidersByAvailability(
    pickerServiceCode.value,
    providersOfPicker.value
    .filter((item) => !recentSet.has(item.id))
    .filter(filterProviderWithKeyword),
  )
})

const selectedProviderIdOfPicker = computed(() => ensureDraft(pickerServiceCode.value).providerId)

const persistRecentProviderStorage = () => {
  localStorage.setItem(
    RECENT_PROVIDER_STORAGE_KEY,
    JSON.stringify({
      photography: recentProviderIdsByService.photography || [],
      makeup: recentProviderIdsByService.makeup || [],
    }),
  )
}

const markRecentProvider = (serviceCode: string, providerId: string) => {
  const current = recentProviderIdsByService[serviceCode] || []
  recentProviderIdsByService[serviceCode] = [providerId, ...current.filter((item) => item !== providerId)].slice(0, 5)
  persistRecentProviderStorage()
}

const clearRecentProviders = (serviceCode: string) => {
  recentProviderIdsByService[serviceCode] = []
  persistRecentProviderStorage()
}

const chooseProvider = (serviceCode: string, providerId: string) => {
  const draft = ensureDraft(serviceCode)
  draft.providerId = providerId
  markRecentProvider(serviceCode, providerId)
  ensureAvailabilityState(serviceCode).lastKey = ''
  showProviderPicker.value = false
}

const customerTypeColumns = computed(() =>
  customerTypes.value.map((item) => ({
    text: item.name,
    value: item.code,
  })),
)

const customerTypeLabel = computed(() => {
  if (!form.customerTypeCode) {
    return '请选择客户类型'
  }
  return customerTypes.value.find((item) => item.code === form.customerTypeCode)?.name || form.customerTypeCode
})

const availabilityStateOfPicker = computed(() => ensureAvailabilityState(pickerServiceCode.value))

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

const startColumns = computed(() =>
  timeOptions.map((value) => ({
    text: value,
    value,
    disabled:
      availabilityStateOfPicker.value.availableSlots.length > 0
        ? !availabilityStateOfPicker.value.availableSlots.includes(value)
        : false,
  })),
)

const endColumns = computed(() => {
  const draft = ensureDraft(pickerServiceCode.value)
  const validEndSlots = getValidEndSlots(pickerServiceCode.value, draft.startTime)

  return timeOptions.map((value) => ({
    text: value,
    value,
    disabled: validEndSlots.length ? !validEndSlots.includes(value) : false,
  }))
})

const resolvePublicErrorMessage = (requestError: unknown, fallback: string) => {
  const apiError = requestError as ApiErrorLike
  const message = apiError.message || fallback

  if (message.includes('Cannot GET /api/public/providers')) {
    return '公开服务者接口未生效，请重启后端服务后重试。'
  }

  if (message.includes('Cannot GET /api/public/service-types')) {
    return '公开服务类型接口未生效，请重启后端服务后重试。'
  }

  if (message.includes('Cannot GET /api/public/customer-types')) {
    return '公开客户类型接口未生效，请重启后端服务后重试。'
  }

  if (message.includes('Cannot POST /api/public/bookings')) {
    return '公开约单提交接口未生效，请重启后端服务后重试。'
  }

  if (message.includes('File too large') || message.includes('LIMIT_FILE_SIZE')) {
    return '图片不能超过 12MB，请压缩后重试。'
  }

  if (message.includes('请上传图片文件')) {
    return '请上传图片文件（支持 JPG/PNG/WEBP/HEIC）。'
  }

  if (message.includes('图片处理失败')) {
    return '当前图片格式暂不支持，请改用 JPG/PNG 后重试。'
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

const ensureAvailabilityState = (serviceCode: string) => {
  if (availabilityByService[serviceCode]) {
    return availabilityByService[serviceCode]
  }

  availabilityByService[serviceCode] = {
    loading: false,
    error: '',
    blockedSlots: [],
    availableSlots: [],
    busyRanges: [],
    freeRanges: [],
    lastKey: '',
  }

  return availabilityByService[serviceCode]
}

const getValidEndSlots = (serviceCode: string, startTime: string) => {
  const availabilityState = ensureAvailabilityState(serviceCode)
  if (!startTime || !availabilityState.freeRanges.length) {
    return [] as string[]
  }

  const range = availabilityState.freeRanges.find((item) =>
    item.startTime <= startTime && startTime < item.endTime,
  )

  if (!range) {
    return []
  }

  return timeOptions.filter((slot) => slot > startTime && slot <= range.endTime)
}

const normalizeDraftTimeByAvailability = (serviceCode: string) => {
  const draft = ensureDraft(serviceCode)
  const availabilityState = ensureAvailabilityState(serviceCode)

  if (!availabilityState.availableSlots.length) {
    return
  }

  if (!availabilityState.availableSlots.includes(draft.startTime)) {
    draft.startTime = availabilityState.availableSlots[0]
  }

  const validEndSlots = getValidEndSlots(serviceCode, draft.startTime)
  if (!validEndSlots.length) {
    draft.endTime = ''
    return
  }

  if (!validEndSlots.includes(draft.endTime)) {
    draft.endTime = validEndSlots[0]
  }
}

const loadAvailability = async (serviceCode: string) => {
  const draft = ensureDraft(serviceCode)
  const availabilityState = ensureAvailabilityState(serviceCode)

  if (!draft.providerId || !form.date) {
    availabilityState.loading = false
    availabilityState.error = ''
    availabilityState.blockedSlots = []
    availabilityState.availableSlots = []
    availabilityState.busyRanges = []
    availabilityState.freeRanges = []
    availabilityState.lastKey = ''
    return
  }

  const requestKey = `${serviceCode}-${draft.providerId}-${form.date}`
  if (availabilityState.lastKey === requestKey) {
    return
  }

  const nextSeq = (availabilityRequestSeq[serviceCode] || 0) + 1
  availabilityRequestSeq[serviceCode] = nextSeq
  availabilityState.loading = true
  availabilityState.error = ''

  try {
    const result = await publicBookingApi.getAvailability(draft.providerId, form.date, serviceCode)
    if (availabilityRequestSeq[serviceCode] !== nextSeq) {
      return
    }

    availabilityState.blockedSlots = result.blockedSlots || []
    availabilityState.availableSlots = result.availableSlots || []
    availabilityState.busyRanges = result.busyRanges || []
    availabilityState.freeRanges = result.freeRanges || []
    availabilityState.lastKey = requestKey

    const summary = ensureProviderAvailabilitySummary(serviceCode, draft.providerId)
    summary.key = form.date
    summary.loading = false
    summary.availableSlotCount = result.availableSlots?.length ?? 0
    summary.freeRangeCount = result.freeRanges?.length ?? 0

    normalizeDraftTimeByAvailability(serviceCode)
  } catch (requestError) {
    if (availabilityRequestSeq[serviceCode] !== nextSeq) {
      return
    }
    availabilityState.error = resolvePublicErrorMessage(requestError, '档期加载失败，请稍后重试')
    availabilityState.blockedSlots = []
    availabilityState.availableSlots = []
    availabilityState.busyRanges = []
    availabilityState.freeRanges = []
    availabilityState.lastKey = ''
  } finally {
    if (availabilityRequestSeq[serviceCode] === nextSeq) {
      availabilityState.loading = false
    }
  }
}

const loadProviderAvailabilitySummary = async (serviceCode: string, providerId: string) => {
  if (!form.date) {
    return
  }

  const summary = ensureProviderAvailabilitySummary(serviceCode, providerId)
  if (summary.key === form.date && (summary.loading || summary.freeRangeCount !== null)) {
    return
  }

  const seqKey = `${serviceCode}:${providerId}`
  const nextSeq = (providerAvailabilityRequestSeq[seqKey] || 0) + 1
  providerAvailabilityRequestSeq[seqKey] = nextSeq

  summary.loading = true
  summary.key = form.date

  try {
    const result = await publicBookingApi.getAvailability(providerId, form.date, serviceCode)
    if (providerAvailabilityRequestSeq[seqKey] !== nextSeq) {
      return
    }

    summary.availableSlotCount = result.availableSlots?.length ?? 0
    summary.freeRangeCount = result.freeRanges?.length ?? 0
  } catch {
    if (providerAvailabilityRequestSeq[seqKey] !== nextSeq) {
      return
    }

    summary.availableSlotCount = null
    summary.freeRangeCount = null
    summary.key = ''
  } finally {
    if (providerAvailabilityRequestSeq[seqKey] === nextSeq) {
      summary.loading = false
    }
  }
}

const prefetchProviderAvailabilitySummaries = async (serviceCode: string) => {
  const providers = providersByService[serviceCode] || []
  if (!providers.length) {
    return
  }

  const queue = [...providers]
  const workerCount = Math.min(4, queue.length)
  await Promise.all(
    Array.from({ length: workerCount }, async () => {
      while (queue.length) {
        const target = queue.shift()
        if (!target) {
          return
        }
        await loadProviderAvailabilitySummary(serviceCode, target.id)
      }
    }),
  )
}

const slotTagClass = (slot: string, serviceCode: string) => {
  const availabilityState = ensureAvailabilityState(serviceCode)
  if (availabilityState.blockedSlots.includes(slot)) {
    return 'chip border border-rose-200 bg-rose-50 text-rose-500'
  }
  if (availabilityState.availableSlots.includes(slot)) {
    return 'chip border border-emerald-200 bg-emerald-50 text-emerald-600'
  }
  return 'chip border border-slate-200 bg-slate-50 text-slate-400'
}

const applyFreeRange = (serviceCode: string, range: TimeRange) => {
  const draft = ensureDraft(serviceCode)
  draft.startTime = range.startTime
  draft.endTime = range.endTime
  showToast(`已填入 ${range.startTime} - ${range.endTime}`)
}

const refreshAvailabilityByCurrentSelection = () => {
  selectedServiceCodes.value.forEach((code) => {
    void loadAvailability(code)
  })
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

const loadCustomerTypes = async () => {
  try {
    const list = await publicBookingApi.listCustomerTypes()
    customerTypes.value = list.length
      ? list
      : [
          { id: 'fallback-personal', code: 'personal', name: '个人写真', sortOrder: 10, isActive: true },
          { id: 'fallback-couple', code: 'couple', name: '情侣', sortOrder: 20, isActive: true },
          { id: 'fallback-family', code: 'family', name: '亲子', sortOrder: 30, isActive: true },
          { id: 'fallback-business', code: 'business', name: '商业', sortOrder: 40, isActive: true },
          { id: 'fallback-other', code: 'other', name: '其他', sortOrder: 90, isActive: true },
        ]
  } catch (requestError) {
    error.value = resolvePublicErrorMessage(requestError, '客户类型加载失败，请稍后重试')
    customerTypes.value = [
      { id: 'fallback-personal', code: 'personal', name: '个人写真', sortOrder: 10, isActive: true },
      { id: 'fallback-couple', code: 'couple', name: '情侣', sortOrder: 20, isActive: true },
      { id: 'fallback-family', code: 'family', name: '亲子', sortOrder: 30, isActive: true },
      { id: 'fallback-business', code: 'business', name: '商业', sortOrder: 40, isActive: true },
      { id: 'fallback-other', code: 'other', name: '其他', sortOrder: 90, isActive: true },
    ]
  }

  if (!form.customerTypeCode && customerTypes.value.length) {
    form.customerTypeCode = customerTypes.value[0].code
  }
}

const loadProvidersForService = async (serviceCode: string) => {
  loadingProvidersByService[serviceCode] = true
  try {
    const providers = await publicBookingApi.listProviders(serviceCode)
    const expectedRole = getExpectedRoleByService(serviceCode)
    providersByService[serviceCode] = providers.filter((item) => item.role === expectedRole)
    const draft = ensureDraft(serviceCode)
    if (draft.providerId && !providersByService[serviceCode].find((item) => item.id === draft.providerId)) {
      draft.providerId = ''
    }
    if (!draft.providerId && providersByService[serviceCode].length) {
      draft.providerId = providersByService[serviceCode][0].id
    }

    void prefetchProviderAvailabilitySummaries(serviceCode)
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
      ensureAvailabilityState(code)
      if (!providersByService[code]) {
        void loadProvidersForService(code)
      }
      void loadAvailability(code)
    })
  },
  { immediate: true },
)

watch(
  () => form.date,
  () => {
    selectedServiceCodes.value.forEach((code) => {
      ensureAvailabilityState(code).lastKey = ''
      const summaries = providerAvailabilityByService[code]
      if (summaries) {
        Object.values(summaries).forEach((summary) => {
          summary.key = ''
          summary.freeRangeCount = null
          summary.availableSlotCount = null
          summary.loading = false
        })
      }
    })
    refreshAvailabilityByCurrentSelection()
    selectedServiceCodes.value.forEach((code) => {
      void prefetchProviderAvailabilitySummaries(code)
    })
  },
)

watch(
  () => selectedServiceCodes.value.map((code) => `${code}:${ensureDraft(code).providerId}`).join('|'),
  () => {
    refreshAvailabilityByCurrentSelection()
  },
)

watch(providerKeywordInput, (value) => {
  window.clearTimeout(providerKeywordTimer)
  providerKeywordTimer = window.setTimeout(() => {
    providerKeyword.value = value
  }, 260)
})

onBeforeUnmount(() => {
  window.clearTimeout(providerKeywordTimer)
})

onMounted(async () => {
  await Promise.all([loadServiceTypes(), loadCustomerTypes()])
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
  providerKeywordInput.value = ''
  providerKeyword.value = ''
  if (!providersByService[serviceCode]?.length && !loadingProvidersByService[serviceCode]) {
    void loadProvidersForService(serviceCode)
  } else {
    void prefetchProviderAvailabilitySummaries(serviceCode)
  }
  showProviderPicker.value = true
}

const openStartTimePicker = (serviceCode: string) => {
  pickerServiceCode.value = serviceCode
  const draft = ensureDraft(serviceCode)
  if (!draft.providerId) {
    showToast('请先选择服务者')
    return
  }
  showStartTimePicker.value = true
}

const openEndTimePicker = (serviceCode: string) => {
  pickerServiceCode.value = serviceCode
  const draft = ensureDraft(serviceCode)
  if (!draft.providerId) {
    showToast('请先选择服务者')
    return
  }
  if (!draft.startTime) {
    showToast('请先选择开始时间')
    return
  }
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

  if (!form.customerTypeCode) {
    error.value = '请先选择客户类型。'
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

    const validEndSlots = getValidEndSlots(serviceCode, draft.startTime)
    if (!validEndSlots.length || !validEndSlots.includes(draft.endTime)) {
      error.value = `${serviceTypeLabelMap.value.get(serviceCode) || serviceCode}当前时间不在可约档期，请重新选择。`
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
      customerTypeCode: form.customerTypeCode,
      location: form.location,
      note: form.note,
      items,
    })

    success.value = `提交成功，已创建协同单 ${result.bookingGroupId}，共 ${result.bookings.length} 条排单。默认未支付，到账后请在排单详情确认收款状态。`
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
        <Field :model-value="customerTypeLabel" label="客户类型" readonly is-link @click="showCustomerTypePicker = true" />
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

      <div class="mt-2 rounded-xl border border-emerald-100 bg-emerald-50/70 p-2.5">
        <p class="mb-1 text-xs font-bold text-slate-600">
          <i class="fa-regular fa-clock mr-1 text-emerald-500" />当日档期
        </p>

        <p v-if="availabilityByService[service.code]?.loading" class="text-xs text-slate-500">正在加载档期...</p>
        <p v-else-if="availabilityByService[service.code]?.error" class="text-xs text-amber-700">
          {{ availabilityByService[service.code]?.error }}
        </p>
        <template v-else>
          <div class="mb-1">
            <p class="mb-1 text-[11px] font-bold text-rose-500">已占用时段</p>
            <div class="flex flex-wrap gap-1">
              <span
                v-for="range in availabilityByService[service.code]?.busyRanges || []"
                :key="`${service.code}-busy-${range.startTime}-${range.endTime}`"
                class="chip border border-rose-200 bg-rose-50 text-rose-500"
              >
                {{ range.startTime }} - {{ range.endTime }}
              </span>
              <span v-if="!(availabilityByService[service.code]?.busyRanges || []).length" class="text-[11px] text-slate-400">
                当天暂无已占用时段
              </span>
            </div>
          </div>

          <div>
            <p class="mb-1 text-[11px] font-bold text-emerald-600">可约时间段</p>
            <div class="flex flex-wrap gap-1">
              <button
                v-for="range in availabilityByService[service.code]?.freeRanges || []"
                :key="`${service.code}-free-${range.startTime}-${range.endTime}`"
                type="button"
                class="chip border border-emerald-200 bg-emerald-50 text-emerald-600"
                @click="applyFreeRange(service.code, range)"
              >
                {{ range.startTime }} - {{ range.endTime }}
              </button>
              <span v-if="!(availabilityByService[service.code]?.freeRanges || []).length" class="text-[11px] text-slate-400">
                当天暂无可约时间
              </span>
            </div>
            <p v-if="(availabilityByService[service.code]?.freeRanges || []).length" class="mt-1 text-[11px] text-slate-400">
              点击任一可约时间段可一键填入开始与结束时间
            </p>
          </div>

          <div class="mt-2 flex flex-wrap gap-1">
            <span
              v-for="slot in ['08:00', '09:00', '10:00', '13:00', '15:00', '18:00']"
              :key="`${service.code}-slot-${slot}`"
              :class="slotTagClass(slot, service.code)"
            >
              {{ slot }}
            </span>
          </div>
        </template>
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
      <section class="max-h-[78vh] p-3">
        <div class="mb-2 flex items-center justify-between">
          <p class="text-sm font-extrabold text-slate-700">
            选择{{ pickerServiceCode === 'makeup' ? '妆娘' : '摄影师' }}
          </p>
          <button class="chip" type="button" @click="showProviderPicker = false">关闭</button>
        </div>

        <Field
          v-model="providerKeywordInput"
          class="mb-2 rounded-xl"
          clearable
          placeholder="搜索昵称 / 账号 / 简介关键词"
        >
          <template #left-icon>
            <i class="fa-solid fa-magnifying-glass text-slate-400" />
          </template>
        </Field>

        <div class="max-h-[58vh] overflow-y-auto">
          <article v-if="recentProvidersOfPicker.length" class="mb-2">
            <div class="mb-1 flex items-center justify-between">
              <p class="text-xs font-bold text-slate-500">最近选择</p>
              <button class="chip" type="button" @click="clearRecentProviders(pickerServiceCode)">清空</button>
            </div>

            <button
              v-for="provider in recentProvidersOfPicker"
              :key="`recent-${provider.id}`"
              type="button"
              class="mb-1 w-full rounded-xl border p-2 text-left"
              :class="selectedProviderIdOfPicker === provider.id ? 'border-blue-300 bg-blue-50' : 'border-slate-200 bg-white'"
              @click="chooseProvider(pickerServiceCode, provider.id)"
            >
              <div class="flex items-center gap-2">
                <img
                  :src="provider.avatarUrl || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=320&q=80'"
                  alt="服务者头像"
                  class="h-9 w-9 rounded-lg object-cover"
                />
                <div class="min-w-0 flex-1">
                  <p class="truncate text-xs font-extrabold text-slate-700">
                    {{ provider.nickname }}
                    <span class="chip ml-1">{{ provider.role === 'makeup_artist' ? '妆娘' : '摄影师' }}</span>
                  </p>
                  <p class="truncate text-[11px] text-slate-500">{{ provider.bio || provider.account }}</p>
                </div>
                <div class="text-right">
                  <p class="text-[11px] font-bold" :class="getProviderAvailabilityClass(pickerServiceCode, provider.id)">
                    {{ getProviderAvailabilityText(pickerServiceCode, provider.id) }}
                  </p>
                </div>
              </div>
            </button>
          </article>

          <article>
            <p class="mb-1 text-xs font-bold text-slate-500">全部可选（{{ commonProvidersOfPicker.length }}，按可约时段排序）</p>
            <button
              v-for="provider in commonProvidersOfPicker"
              :key="provider.id"
              type="button"
              class="mb-1 w-full rounded-xl border p-2 text-left"
              :class="selectedProviderIdOfPicker === provider.id ? 'border-blue-300 bg-blue-50' : 'border-slate-200 bg-white'"
              @click="chooseProvider(pickerServiceCode, provider.id)"
            >
              <div class="flex items-center gap-2">
                <img
                  :src="provider.avatarUrl || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=320&q=80'"
                  alt="服务者头像"
                  class="h-9 w-9 rounded-lg object-cover"
                />
                <div class="min-w-0 flex-1">
                  <p class="truncate text-xs font-extrabold text-slate-700">
                    {{ provider.nickname }}
                    <span class="chip ml-1">{{ provider.role === 'makeup_artist' ? '妆娘' : '摄影师' }}</span>
                  </p>
                  <p class="truncate text-[11px] text-slate-500">{{ provider.bio || provider.account }}</p>
                </div>
                <div class="text-right">
                  <p class="text-[11px] font-bold" :class="getProviderAvailabilityClass(pickerServiceCode, provider.id)">
                    {{ getProviderAvailabilityText(pickerServiceCode, provider.id) }}
                  </p>
                </div>
              </div>
            </button>

            <p v-if="!recentProvidersOfPicker.length && !commonProvidersOfPicker.length" class="py-6 text-center text-xs text-slate-400">
              暂无匹配结果，试试其他关键词
            </p>
          </article>
        </div>
      </section>
    </Popup>

    <Popup v-model:show="showDatePicker" position="bottom" round>
      <DatePicker
        v-model="selectedDateValues"
        title="选择服务日期"
        @cancel="showDatePicker = false"
        @confirm="({ selectedValues }: any) => { form.date = normalizeDate(selectedValues); showDatePicker = false }"
      />
    </Popup>

    <Popup v-model:show="showCustomerTypePicker" position="bottom" round>
      <Picker
        :columns="customerTypeColumns"
        @cancel="showCustomerTypePicker = false"
        @confirm="({ selectedOptions }: any) => { form.customerTypeCode = selectedOptions[0]?.value || form.customerTypeCode; showCustomerTypePicker = false }"
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
