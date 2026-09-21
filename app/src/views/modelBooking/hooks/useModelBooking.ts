import dayjs from 'dayjs'
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { showImagePreview, showToast } from 'vant'
import type { UploaderFileListItem } from 'vant'
import { publicBookingApi } from '@/api/public-booking'
import type { CustomerTypeItem, PublicProvider } from '@/api/public-booking/types'
import { rolesApi } from '@/api/roles'
import { timeOptions } from '@/constants/options'
import { normalizeDatePickerValue } from '@/hooks/useDateTimePicker'
import { useKeyedLatestRequest } from '@/hooks/useLatestRequest'
import { uploadQueueItem, type UploadItem } from '@/hooks/useUploadQueue'
import { isAfterTime } from '@/utils/time'
import type {
  AvailabilityState,
  ProviderAvailabilitySummary,
  ServiceDraft,
  TimeRange,
} from '@/views/modelBooking/types'
import { resolvePublicErrorMessage } from '@/views/modelBooking/utils/errors'
import { useRecentProviders } from '@/views/modelBooking/hooks/useRecentProviders'

export function useModelBooking() {
  const router = useRouter()

  const form = reactive({
    modelName: '',
    modelPhone: '',
    date: dayjs().format('YYYY-MM-DD'),
    customerTypeCode: '',
    companions: '',
    location: '',
    note: '',
  })

  const selectedServiceCodes = ref<string[]>(['slot-1'])
  const selectedRoleCode = ref('all')
  const customerTypes = ref<CustomerTypeItem[]>([])
  const roleOptions = ref<Array<{ code: string; name: string }>>([
    { code: 'all', name: '全部角色' },
  ])

  const providersByService = reactive<Record<string, PublicProvider[]>>({})
  const loadingProvidersByService = reactive<Record<string, boolean>>({})
  const availabilityByService = reactive<Record<string, AvailabilityState>>({})
  const availabilityRequests = useKeyedLatestRequest()
  const providerAvailabilityByService = reactive<
    Record<string, Record<string, ProviderAvailabilitySummary>>
  >({})
  const providerAvailabilityRequests = useKeyedLatestRequest()

  const serviceDrafts = reactive<Record<string, ServiceDraft>>({
    'slot-1': {
      providerId: '',
      startTime: '10:00',
      endTime: '11:00',
      requirement: '',
      selectedRoleCode: '',
      referenceFileList: [],
    },
  })

  const selectedDateValues = ref(form.date.split('-'))

  const showDatePicker = ref(false)
  const showCustomerTypePicker = ref(false)
  const showProviderPicker = ref(false)
  const showStartTimePicker = ref(false)
  const showEndTimePicker = ref(false)
  const showRolePicker = ref(false)

  const pickerServiceCode = ref('slot-1')

  const uploading = ref(false)
  const submitting = ref(false)

  const error = ref('')
  const success = ref('')
  const providerKeywordInput = ref('')
  const providerKeyword = ref('')
  const { recentProviderIdsByService, markRecentProvider, clearRecentProviders } =
    useRecentProviders()

  let providerKeywordTimer = 0

  const activeServices = computed(() =>
    selectedServiceCodes.value.map((code, index) => ({
      code,
      name: `服务者 ${index + 1}`,
    })),
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
    const recentSet = new Set(recentProviderIdsByService[pickerServiceCode.value] || [])
    return sortProvidersByAvailability(
      pickerServiceCode.value,
      providersOfPicker.value
        .filter((item) => !recentSet.has(item.id))
        .filter(filterProviderWithKeyword),
    )
  })

  const selectedProviderIdOfPicker = computed(() => ensureDraft(pickerServiceCode.value).providerId)

  const chooseProvider = (serviceCode: string, providerId: string) => {
    const draft = ensureDraft(serviceCode)
    draft.providerId = providerId
    const provider = (providersByService[serviceCode] || []).find((item) => item.id === providerId)
    const roleCodes = provider ? providerRoleCodes(provider) : []
    if (!roleCodes.includes(draft.selectedRoleCode)) {
      draft.selectedRoleCode = roleCodes[0] || ''
    }
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
    return (
      customerTypes.value.find((item) => item.code === form.customerTypeCode)?.name ||
      form.customerTypeCode
    )
  })
  const roleLabel = computed(
    () =>
      roleOptions.value.find((item) => item.code === selectedRoleCode.value)?.name || '全部角色',
  )

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

  const providerRoleLabels = (provider: PublicProvider) => {
    const roleCodes = provider.roles?.length ? provider.roles : [provider.role]
    return roleCodes
      .map((code) => roleOptions.value.find((item) => item.code === code)?.name)
      .filter(Boolean) as string[]
  }

  const providerRoleCodes = (provider: PublicProvider) =>
    (provider.roles?.length ? provider.roles : [provider.role]).filter(Boolean)

  const roleCodeToServiceType = (roleCode: string) =>
    roleCode === 'makeup_artist' ? 'makeup' : 'photography'

  const selectedDraftRoleLabel = (serviceCode: string) => {
    const draft = ensureDraft(serviceCode)
    if (!draft.selectedRoleCode) {
      return ''
    }
    return (
      roleOptions.value.find((item) => item.code === draft.selectedRoleCode)?.name ||
      draft.selectedRoleCode
    )
  }

  const setDraftRoleCode = (serviceCode: string, roleCode: string) => {
    const draft = ensureDraft(serviceCode)
    draft.selectedRoleCode = roleCode
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

  const normalizeDate = normalizeDatePickerValue

  const ensureDraft = (serviceCode: string) => {
    if (serviceDrafts[serviceCode]) {
      return serviceDrafts[serviceCode]
    }

    serviceDrafts[serviceCode] = {
      providerId: '',
      startTime: '10:00',
      endTime: '11:00',
      requirement: '',
      selectedRoleCode: '',
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

    const range = availabilityState.freeRanges.find(
      (item) => item.startTime <= startTime && startTime < item.endTime,
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

    const nextSeq = availabilityRequests.begin(serviceCode)
    availabilityState.loading = true
    availabilityState.error = ''

    try {
      const result = await publicBookingApi.getAvailability(draft.providerId, form.date)
      if (!availabilityRequests.isLatest(serviceCode, nextSeq)) {
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
      if (!availabilityRequests.isLatest(serviceCode, nextSeq)) {
        return
      }
      availabilityState.error = resolvePublicErrorMessage(requestError, '档期加载失败，请稍后重试')
      availabilityState.blockedSlots = []
      availabilityState.availableSlots = []
      availabilityState.busyRanges = []
      availabilityState.freeRanges = []
      availabilityState.lastKey = ''
    } finally {
      if (availabilityRequests.isLatest(serviceCode, nextSeq)) {
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
    const nextSeq = providerAvailabilityRequests.begin(seqKey)

    summary.loading = true
    summary.key = form.date

    try {
      const result = await publicBookingApi.getAvailability(providerId, form.date)
      if (!providerAvailabilityRequests.isLatest(seqKey, nextSeq)) {
        return
      }

      summary.availableSlotCount = result.availableSlots?.length ?? 0
      summary.freeRangeCount = result.freeRanges?.length ?? 0
    } catch {
      if (!providerAvailabilityRequests.isLatest(seqKey, nextSeq)) {
        return
      }

      summary.availableSlotCount = null
      summary.freeRangeCount = null
      summary.key = ''
    } finally {
      if (providerAvailabilityRequests.isLatest(seqKey, nextSeq)) {
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

  const loadCustomerTypes = async () => {
    try {
      const list = await publicBookingApi.listCustomerTypes()
      customerTypes.value = list.length
        ? list
        : [
            {
              id: 'fallback-personal',
              code: 'personal',
              name: '个人写真',
              sortOrder: 10,
              isActive: true,
            },
            {
              id: 'fallback-couple',
              code: 'couple',
              name: '情侣',
              sortOrder: 20,
              isActive: true,
            },
            {
              id: 'fallback-family',
              code: 'family',
              name: '亲子',
              sortOrder: 30,
              isActive: true,
            },
            {
              id: 'fallback-business',
              code: 'business',
              name: '商业',
              sortOrder: 40,
              isActive: true,
            },
            {
              id: 'fallback-other',
              code: 'other',
              name: '其他',
              sortOrder: 90,
              isActive: true,
            },
          ]
    } catch (requestError) {
      error.value = resolvePublicErrorMessage(requestError, '客户类型加载失败，请稍后重试')
      customerTypes.value = [
        {
          id: 'fallback-personal',
          code: 'personal',
          name: '个人写真',
          sortOrder: 10,
          isActive: true,
        },
        {
          id: 'fallback-couple',
          code: 'couple',
          name: '情侣',
          sortOrder: 20,
          isActive: true,
        },
        {
          id: 'fallback-family',
          code: 'family',
          name: '亲子',
          sortOrder: 30,
          isActive: true,
        },
        {
          id: 'fallback-business',
          code: 'business',
          name: '商业',
          sortOrder: 40,
          isActive: true,
        },
        {
          id: 'fallback-other',
          code: 'other',
          name: '其他',
          sortOrder: 90,
          isActive: true,
        },
      ]
    }

    if (!form.customerTypeCode && customerTypes.value.length) {
      form.customerTypeCode = customerTypes.value[0].code
    }
  }

  const loadRoles = async () => {
    try {
      const list = await rolesApi.list()
      roleOptions.value = [
        { code: 'all', name: '全部角色' },
        ...list.map((item) => ({ code: item.code, name: item.name })),
      ]
    } catch {
      roleOptions.value = [{ code: 'all', name: '全部角色' }]
    }
  }

  const loadProvidersForService = async (serviceCode: string) => {
    loadingProvidersByService[serviceCode] = true
    try {
      const providers = await publicBookingApi.listProviders(
        undefined,
        selectedRoleCode.value === 'all' ? undefined : selectedRoleCode.value,
      )
      providersByService[serviceCode] = providers
      const draft = ensureDraft(serviceCode)
      if (
        draft.providerId &&
        !providersByService[serviceCode].find((item) => item.id === draft.providerId)
      ) {
        draft.providerId = ''
      }
      // 选择第一个服务者
      // if (!draft.providerId && providersByService[serviceCode].length) {
      //   draft.providerId = providersByService[serviceCode][0].id
      // }

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
        selectedServiceCodes.value = ['slot-1']
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
    () =>
      selectedServiceCodes.value.map((code) => `${code}:${ensureDraft(code).providerId}`).join('|'),
    () => {
      refreshAvailabilityByCurrentSelection()
    },
  )

  watch(selectedRoleCode, () => {
    selectedServiceCodes.value.forEach((code) => {
      providersByService[code] = []
      void loadProvidersForService(code)
    })
  })

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
    await Promise.all([loadCustomerTypes(), loadRoles()])
    await Promise.all(selectedServiceCodes.value.map((code) => loadProvidersForService(code)))
  })

  const addServiceSlot = () => {
    if (selectedServiceCodes.value.length >= 6) {
      showToast('一次最多选择 6 位服务者')
      return
    }
    const next = `slot-${Date.now()}`
    selectedServiceCodes.value = [...selectedServiceCodes.value, next]
  }

  const removeServiceSlot = (serviceCode: string) => {
    if (selectedServiceCodes.value.length <= 1) {
      showToast('至少保留一位服务者')
      return
    }
    selectedServiceCodes.value = selectedServiceCodes.value.filter((item) => item !== serviceCode)
    delete serviceDrafts[serviceCode]
    delete providersByService[serviceCode]
    delete loadingProvidersByService[serviceCode]
    delete availabilityByService[serviceCode]
    availabilityRequests.invalidate(serviceCode)
    delete providerAvailabilityByService[serviceCode]
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

  const uploadSingle = (item: UploadItem) =>
    uploadQueueItem(item, publicBookingApi.uploadReferenceImage)

  const onAfterRead = async (
    serviceCode: string,
    value: UploaderFileListItem | UploaderFileListItem[],
  ) => {
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
    form.companions = ''
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

    const items = [] as Array<{
      serviceTypeCode: string
      providerId: string
      startTime: string
      endTime: string
      requirement: string
      referenceImages: string[]
      serviceRoleCodes?: string[]
    }>

    for (const [index, serviceCode] of selectedServiceCodes.value.entries()) {
      const draft = ensureDraft(serviceCode)
      const serviceLabel = `服务者 ${index + 1}`
      const providerLabel = '服务者'

      if (!draft.providerId) {
        error.value = `请选择${providerLabel}。`
        return
      }

      if (!draft.startTime || !draft.endTime) {
        error.value = `请补全${serviceLabel}的服务时间。`
        return
      }

      if (!draft.requirement.trim()) {
        error.value = `请填写${serviceLabel}的需求说明。`
        return
      }

      if (!isAfterTime(draft.startTime, draft.endTime)) {
        error.value = `${serviceLabel}的结束时间必须晚于开始时间。`
        return
      }

      const validEndSlots = getValidEndSlots(serviceCode, draft.startTime)
      if (!validEndSlots.length || !validEndSlots.includes(draft.endTime)) {
        error.value = `${serviceLabel}当前时间不在可约档期，请重新选择。`
        return
      }

      const currentProvider = selectedProvider(serviceCode)
      const providerRoleCodesList = currentProvider ? providerRoleCodes(currentProvider) : []
      const selectedRoleCode = draft.selectedRoleCode || providerRoleCodesList[0] || 'photographer'
      const serviceTypeCode = roleCodeToServiceType(selectedRoleCode)

      items.push({
        serviceTypeCode,
        providerId: draft.providerId,
        startTime: draft.startTime,
        endTime: draft.endTime,
        requirement: draft.requirement.trim(),
        referenceImages: draft.referenceFileList
          .map((item) => item.uploadedUrl || item.url)
          .filter(Boolean) as string[],
        serviceRoleCodes: [selectedRoleCode],
      })
    }

    submitting.value = true
    try {
      const result = await publicBookingApi.create({
        modelName: form.modelName,
        modelPhone: form.modelPhone,
        date: form.date,
        customerTypeCode: form.customerTypeCode,
        companions: form.companions,
        location: form.location,
        note: form.note,
        items,
      })

      success.value = `提交成功，已创建协同单 ${result.bookingGroupId}，共 ${result.bookings.length} 条排单。默认未支付，到账后请在排单详情确认收款状态。`
      window.setTimeout(() => {
        router.push({
          name: 'public-order-detail',
          params: { bookingGroupId: result.bookingGroupId },
        })
      }, 500)
      resetFormAfterSuccess()
    } catch (requestError) {
      error.value = resolvePublicErrorMessage(requestError, '提交失败，请稍后重试')
    } finally {
      submitting.value = false
    }
  }

  return {
    router,
    form,
    selectedRoleCode,
    roleOptions,
    providersByService,
    loadingProvidersByService,
    availabilityByService,
    serviceDrafts,
    selectedDateValues,
    showDatePicker,
    showCustomerTypePicker,
    showProviderPicker,
    showStartTimePicker,
    showEndTimePicker,
    showRolePicker,
    pickerServiceCode,
    uploading,
    submitting,
    error,
    success,
    providerKeywordInput,
    activeServices,
    getProviderAvailabilityText,
    getProviderAvailabilityClass,
    recentProvidersOfPicker,
    commonProvidersOfPicker,
    selectedProviderIdOfPicker,
    clearRecentProviders,
    chooseProvider,
    customerTypeColumns,
    customerTypeLabel,
    roleLabel,
    selectedProviderLabel,
    selectedProvider,
    providerRoleLabels,
    providerRoleCodes,
    selectedDraftRoleLabel,
    setDraftRoleCode,
    previewProviderPortfolio,
    startColumns,
    endColumns,
    normalizeDate,
    slotTagClass,
    applyFreeRange,
    addServiceSlot,
    removeServiceSlot,
    openDate,
    openProviderPicker,
    openStartTimePicker,
    openEndTimePicker,
    onAfterRead,
    retryUpload,
    submit,
  }
}
