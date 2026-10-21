import dayjs from 'dayjs'
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { showImagePreview, showToast } from 'vant'
import { publicBookingApi } from '@/api/public-booking'
import type { CustomerTypeItem, PublicProvider } from '@/api/public-booking/types'
import { rolesApi } from '@/api/roles'
import { useKeyedLatestRequest } from '@/hooks/useLatestRequest'
import { isAfterTime } from '@/utils/time'
import {
  availableStarts,
  fitsRange,
  freeRangesFromBusy,
  toMinutes,
  toTime,
} from '@/views/modelBooking/utils/availability'
import type {
  AvailabilityState,
  ProviderAvailabilitySummary,
  ServiceDraft,
} from '@/views/modelBooking/types'
import { resolvePublicErrorMessage } from '@/views/modelBooking/utils/errors'
import { useBookingSteps } from '@/views/modelBooking/hooks/useBookingSteps'
import { useBookingProviderLink } from '@/views/modelBooking/hooks/useBookingProviderLink'
import { useRecentProviders } from '@/views/modelBooking/hooks/useRecentProviders'
import type { PublicBookingAiBrief } from '@/api/public-booking/types'
import {
  MODEL_BOOKING_THEME_OPTIONS,
  type ModelBookingAiBriefForm,
} from '@/views/modelBooking/types'

const createAiBriefForm = (): ModelBookingAiBriefForm => ({
  themeType: 'cosplay',
  workName: '',
  outfit: '',
  visualGoal: '',
  avoid: '',
})

export function useModelBooking() {
  const router = useRouter()

  const form = reactive({
    modelName: '',
    modelPhone: '',
    date: dayjs().format('YYYY-MM-DD'),
    customerTypeCode: '',
    companions: '',
    location: '待商议',
    note: '',
    aiBrief: createAiBriefForm(),
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
      durationMinutes: 60,
      customDuration: false,
      timeSource: 'auto',
      startTime: '',
      endTime: '',
      requirement: '',
      selectedRoleCode: '',
    },
  })

  const showProviderPicker = ref(false)
  const showStartTimePicker = ref(false)

  const pickerServiceCode = ref('slot-1')

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
    if (
      selectedRoleCode.value !== 'all' &&
      !providerRoleCodes(provider).includes(selectedRoleCode.value)
    )
      return false
    if (!keyword) return true
    return [provider.nickname, provider.account, provider.bio, ...providerRoleLabels(provider)]
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
        busyRanges: [],
        freeRanges: [],
        error: '',
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
    if (summary.error) return '加载失败，可重试'
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
    if (
      selectedServiceCodes.value.some(
        (code) => code !== serviceCode && serviceDrafts[code]?.providerId === providerId,
      )
    ) {
      showToast('该服务者已添加，请在原安排中修改')
      return
    }
    if (draft.providerId === providerId) {
      showProviderPicker.value = false
      return
    }
    draft.providerId = providerId
    draft.startTime = ''
    draft.endTime = ''
    draft.timeSource = 'auto'
    const provider = (providersByService[serviceCode] || []).find((item) => item.id === providerId)
    const roleCodes = provider ? providerRoleCodes(provider) : []
    draft.selectedRoleCode = roleCodes.length === 1 ? roleCodes[0] : ''
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

  const providerRoleCodes = (provider: PublicProvider) => [
    ...new Set((provider.roles?.length ? provider.roles : [provider.role]).filter(Boolean)),
  ]

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
    const provider = selectedProvider(serviceCode)
    if (!provider || !providerRoleCodes(provider).includes(roleCode)) return
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

  const ensureDraft = (serviceCode: string) => {
    if (serviceDrafts[serviceCode]) {
      return serviceDrafts[serviceCode]
    }

    serviceDrafts[serviceCode] = {
      providerId: '',
      durationMinutes: 60,
      customDuration: false,
      timeSource: 'auto',
      startTime: '',
      endTime: '',
      requirement: '',
      selectedRoleCode: '',
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

  const selectEarliestTime = (serviceCode: string) => {
    const draft = ensureDraft(serviceCode)
    const availability = ensureAvailabilityState(serviceCode)
    const ready =
      !availability.loading &&
      !availability.error &&
      availability.lastKey === `${serviceCode}-${draft.providerId}-${form.date}`
    draft.startTime = ready
      ? availableStarts(availability.freeRanges, draft.durationMinutes)[0] || ''
      : ''
    draft.endTime = draft.startTime
      ? toTime(toMinutes(draft.startTime) + draft.durationMinutes)
      : ''
    draft.timeSource = 'auto'
  }
  const setDuration = (serviceCode: string, minutes: number, custom = false) => {
    if (!Number.isInteger(minutes) || minutes < 1 || minutes > 900) return
    const draft = ensureDraft(serviceCode)
    draft.durationMinutes = minutes
    draft.customDuration = custom
    selectEarliestTime(serviceCode)
  }
  const setStartTime = (serviceCode: string, time: string) => {
    const draft = ensureDraft(serviceCode)
    const availability = ensureAvailabilityState(serviceCode)
    if (
      availability.loading ||
      availability.error ||
      availability.lastKey !== `${serviceCode}-${draft.providerId}-${form.date}` ||
      !fitsRange(availability.freeRanges, time, draft.durationMinutes)
    )
      return false
    draft.startTime = time
    draft.endTime = toTime(toMinutes(time) + draft.durationMinutes)
    draft.timeSource = 'manual'
    return true
  }
  const getValidEndSlots = (serviceCode: string, startTime: string) => {
    const draft = ensureDraft(serviceCode)
    return fitsRange(
      ensureAvailabilityState(serviceCode).freeRanges,
      startTime,
      draft.durationMinutes,
    )
      ? [toTime(toMinutes(startTime) + draft.durationMinutes)]
      : []
  }

  const loadAvailability = async (serviceCode: string) => {
    const draft = ensureDraft(serviceCode)
    const availabilityState = ensureAvailabilityState(serviceCode)

    if (!draft.providerId || !form.date) {
      availabilityRequests.invalidate(serviceCode)
      draft.startTime = ''
      draft.endTime = ''
      availabilityState.loading = false
      availabilityState.error = ''
      availabilityState.blockedSlots = []
      availabilityState.availableSlots = []
      availabilityState.busyRanges = []
      availabilityState.freeRanges = []
      availabilityState.lastKey = ''
      return
    }

    const requestDate = form.date
    const requestProviderId = draft.providerId
    const requestKey = `${serviceCode}-${requestProviderId}-${requestDate}`
    if (availabilityState.lastKey === requestKey) {
      return
    }

    const nextSeq = availabilityRequests.begin(serviceCode)
    availabilityState.loading = true
    availabilityState.error = ''
    availabilityState.lastKey = ''
    draft.startTime = ''
    draft.endTime = ''

    try {
      const result = await publicBookingApi.getAvailability(requestProviderId, requestDate)
      if (
        !availabilityRequests.isLatest(serviceCode, nextSeq) ||
        draft.providerId !== requestProviderId ||
        form.date !== requestDate
      ) {
        return
      }

      availabilityState.blockedSlots = result.blockedSlots || []
      availabilityState.availableSlots = result.availableSlots || []
      availabilityState.busyRanges = result.busyRanges || []
      availabilityState.freeRanges = freeRangesFromBusy(result.busyRanges || [])
      availabilityState.lastKey = requestKey

      const summary = ensureProviderAvailabilitySummary(serviceCode, draft.providerId)
      summary.key = form.date
      summary.loading = false
      summary.availableSlotCount = result.availableSlots?.length ?? 0
      summary.freeRanges = freeRangesFromBusy(result.busyRanges || [])
      summary.busyRanges = result.busyRanges || []
      summary.error = ''
      summary.freeRangeCount = summary.freeRanges.length

      availabilityState.loading = false
      selectEarliestTime(serviceCode)
    } catch (requestError) {
      if (
        !availabilityRequests.isLatest(serviceCode, nextSeq) ||
        draft.providerId !== requestProviderId ||
        form.date !== requestDate
      ) {
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

    const requestDate = form.date
    const summary = ensureProviderAvailabilitySummary(serviceCode, providerId)
    if (summary.key === form.date && (summary.loading || summary.freeRangeCount !== null)) {
      return
    }

    const seqKey = `${serviceCode}:${providerId}`
    const nextSeq = providerAvailabilityRequests.begin(seqKey)

    summary.loading = true
    summary.key = form.date

    try {
      const result = await publicBookingApi.getAvailability(providerId, requestDate)
      if (
        !providerAvailabilityRequests.isLatest(seqKey, nextSeq) ||
        form.date !== requestDate ||
        !selectedServiceCodes.value.includes(serviceCode)
      ) {
        return
      }

      summary.availableSlotCount = result.availableSlots?.length ?? 0
      summary.freeRanges = freeRangesFromBusy(result.busyRanges || [])
      summary.busyRanges = result.busyRanges || []
      summary.error = ''
      summary.freeRangeCount = summary.freeRanges.length
    } catch {
      if (
        !providerAvailabilityRequests.isLatest(seqKey, nextSeq) ||
        form.date !== requestDate ||
        !selectedServiceCodes.value.includes(serviceCode)
      ) {
        return
      }

      summary.availableSlotCount = null
      summary.freeRangeCount = null
      summary.key = ''
      summary.error = '档期加载失败，请重试'
      summary.busyRanges = []
      summary.freeRanges = []
    } finally {
      if (providerAvailabilityRequests.isLatest(seqKey, nextSeq) && form.date === requestDate) {
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

  const providerLoads = new Map<string, Promise<void>>()
  const loadProvidersForService = (serviceCode: string): Promise<void> => {
    const pending = providerLoads.get(serviceCode)
    if (pending) return pending
    const request = fetchProvidersForService(serviceCode).finally(() =>
      providerLoads.delete(serviceCode),
    )
    providerLoads.set(serviceCode, request)
    return request
  }

  const fetchProvidersForService = async (serviceCode: string) => {
    loadingProvidersByService[serviceCode] = true
    try {
      const providers = await publicBookingApi.listProviders()
      providersByService[serviceCode] = providers
      const draft = ensureDraft(serviceCode)
      if (
        draft.providerId &&
        !providersByService[serviceCode].find((item) => item.id === draft.providerId)
      ) {
        draft.providerId = ''
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
        ensureDraft(code).startTime = ''
        ensureDraft(code).endTime = ''
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
    if (serviceCode === selectedServiceCodes.value[0]) providerLink.dismiss()
    selectedServiceCodes.value = selectedServiceCodes.value.filter((item) => item !== serviceCode)
    delete serviceDrafts[serviceCode]
    delete providersByService[serviceCode]
    delete loadingProvidersByService[serviceCode]
    delete availabilityByService[serviceCode]
    availabilityRequests.invalidate(serviceCode)
    delete providerAvailabilityByService[serviceCode]
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

  const resetFormAfterSuccess = () => {
    form.modelName = ''
    form.modelPhone = ''
    form.date = dayjs().format('YYYY-MM-DD')
    form.companions = ''
    form.location = '待商议'
    form.note = ''
    Object.assign(form.aiBrief, createAiBriefForm())
    steps.locationMode.value = '待商议'
    steps.locationText.value = ''
    Object.keys(steps.preferenceSelections).forEach((key) => {
      steps.preferenceSelections[key as keyof typeof steps.preferenceSelections] = []
    })

    selectedServiceCodes.value.forEach((code) => {
      const draft = ensureDraft(code)
      draft.requirement = ''
    })
  }

  const buildAiBrief = (): PublicBookingAiBrief | undefined => {
    const normalized = Object.entries({ ...form.aiBrief, ...steps.preferenceBrief.value }).reduce<
      Record<string, string>
    >((result, [key, value]) => {
      const trimmed = value.trim()
      if (trimmed) result[key] = trimmed
      return result
    }, {})

    return Object.keys(normalized).length ? (normalized as PublicBookingAiBrief) : undefined
  }

  const submit = async () => {
    error.value = ''
    success.value = ''

    if (submitting.value) return
    if (providerLink.blocked.value) {
      error.value = providerLink.message.value
      return
    }

    if (!form.modelName.trim() || !form.modelPhone.trim() || !form.date || !form.location.trim()) {
      error.value = '请先补全姓名、手机号、日期和地点。'
      return
    }

    if (!/^1[3-9]\d{9}$/.test(form.modelPhone.trim())) {
      error.value = '请填写有效的 11 位手机号。'
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

      if (!isAfterTime(draft.startTime, draft.endTime)) {
        error.value = `${serviceLabel}的结束时间必须晚于开始时间。`
        return
      }

      const availability = ensureAvailabilityState(serviceCode)
      if (
        availability.loading ||
        availability.error ||
        availability.lastKey !== `${serviceCode}-${draft.providerId}-${form.date}`
      ) {
        error.value = `${serviceLabel}的档期尚未加载成功，请重试。`
        return
      }
      const validEndSlots = getValidEndSlots(serviceCode, draft.startTime)
      if (!validEndSlots.length || !validEndSlots.includes(draft.endTime)) {
        error.value = `${serviceLabel}当前时间不在可约档期，请重新选择。`
        return
      }

      const currentProvider = selectedProvider(serviceCode)
      const providerRoleCodesList = currentProvider ? providerRoleCodes(currentProvider) : []
      const selectedRoleCode = draft.selectedRoleCode
      if (!selectedRoleCode || !providerRoleCodesList.includes(selectedRoleCode)) {
        error.value = `请选择${serviceLabel}的本次服务角色。`
        return
      }
      const serviceTypeCode = roleCodeToServiceType(selectedRoleCode)

      items.push({
        serviceTypeCode,
        providerId: draft.providerId,
        startTime: draft.startTime,
        endTime: draft.endTime,
        requirement: draft.requirement.trim(),
        referenceImages: [],
        serviceRoleCodes: [selectedRoleCode],
      })
    }

    submitting.value = true
    try {
      const result = await publicBookingApi.create({
        modelName: form.modelName.trim(),
        modelPhone: form.modelPhone.trim(),
        date: form.date,
        customerTypeCode: form.customerTypeCode,
        companions: form.companions,
        location: form.location,
        note: form.note,
        aiBrief: buildAiBrief(),
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

  const providerLink = useBookingProviderLink({
    firstServiceCode: () => selectedServiceCodes.value[0]!,
    prepareProviders: (code) =>
      providerLoads.get(code) ??
      (providersByService[code] ? Promise.resolve() : loadProvidersForService(code)),
    addProvider: (code, provider) => {
      const providers = providersByService[code] || []
      providersByService[code] = [...providers.filter((item) => item.id !== provider.id), provider]
    },
    clearSelection: (code) => {
      const draft = ensureDraft(code)
      draft.providerId = ''
      draft.selectedRoleCode = ''
      draft.startTime = ''
      draft.endTime = ''
      ensureAvailabilityState(code).lastKey = ''
    },
    selectProvider: chooseProvider,
  })

  const chooseProviderManually = (code: string, providerId: string) => {
    if (code === selectedServiceCodes.value[0]) providerLink.dismiss()
    chooseProvider(code, providerId)
  }

  const steps = useBookingSteps({
    form,
    activeServices,
    serviceDrafts,
    availabilityByService,
    error,
    providerLinkBlocked: providerLink.blocked,
    providerLinkMessage: providerLink.message,
  })

  return {
    ...steps,
    router,
    form,
    loadProvidersForService,
    loadAvailability,
    loadProviderAvailabilitySummary,
    providerAvailabilityByService,
    setDuration,
    setStartTime,
    customerTypes,
    selectedRoleCode,
    roleOptions,
    providersByService,
    loadingProvidersByService,
    availabilityByService,
    serviceDrafts,
    showProviderPicker,
    showStartTimePicker,
    pickerServiceCode,
    submitting,
    providerLinkState: providerLink.state,
    providerLinkBlocked: providerLink.blocked,
    providerLinkMessage: providerLink.message,
    retryProviderLink: providerLink.retry,
    dismissProviderLink: providerLink.dismiss,
    error,
    success,
    providerKeywordInput,
    activeServices,
    aiBriefThemeOptions: MODEL_BOOKING_THEME_OPTIONS,
    getProviderAvailabilityText,
    getProviderAvailabilityClass,
    recentProvidersOfPicker,
    commonProvidersOfPicker,
    selectedProviderIdOfPicker,
    clearRecentProviders,
    chooseProvider: chooseProviderManually,
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
    addServiceSlot,
    removeServiceSlot,
    openProviderPicker,
    openStartTimePicker,
    submit,
  }
}
