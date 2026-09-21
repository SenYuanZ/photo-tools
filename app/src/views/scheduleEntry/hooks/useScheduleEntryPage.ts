import dayjs from 'dayjs'
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { scheduleApi } from '@/api/schedules'
import {
  depositStatusOptions,
  depositStatusText,
  timeHourOptions,
  timeMinuteOptions,
} from '@/constants/options'
import { useAuthStore } from '@/stores/auth'
import { useCatalogStore } from '@/stores/catalog'
import { useCustomerStore } from '@/stores/customers'
import { useScheduleStore } from '@/stores/schedules'
import { useSettingsStore } from '@/stores/settings'
import { useUploadQueue, type UploadItem } from '@/hooks/useUploadQueue'
import { isAfterTime } from '@/utils/time'

export function useScheduleEntryPage() {
  const route = useRoute()
  const router = useRouter()
  const authStore = useAuthStore()
  const catalogStore = useCatalogStore()
  const customerStore = useCustomerStore()
  const scheduleStore = useScheduleStore()
  const settingsStore = useSettingsStore()

  const customerIdFromQuery =
    typeof route.query.customerId === 'string' ? route.query.customerId : ''
  const dateFromQuery =
    typeof route.query.date === 'string' ? route.query.date : dayjs().format('YYYY-MM-DD')
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
  const referenceFileList = ref<UploadItem[]>([])
  const uploadQueue = useUploadQueue({
    items: referenceFileList,
    upload: scheduleApi.uploadReferenceImage,
    onError: (message) => {
      error.value = message
    },
  })
  const uploading = uploadQueue.uploading
  const failedUploads = uploadQueue.failedItems

  const selectedDateValues = ref(form.date.split('-'))
  const selectedStartTimeValues = ref(form.startTime.split(':'))
  const selectedEndTimeValues = ref(form.endTime.split(':'))

  const customers = computed(() =>
    customerStore.customers.filter((item) => item.isLongTerm !== false),
  )
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

  const depositStatusColumns = depositStatusOptions.map(([value, text]) => ({
    text,
    value,
  }))
  const temporaryTypeColumns = computed(() =>
    catalogStore.customerTypes.map((item) => ({
      text: item.name,
      value: item.code,
    })),
  )
  const depositStatusLabel = computed(
    () =>
      depositStatusOptions.find(([value]) => value === form.depositStatus)?.[1] ?? '请选择定金状态',
  )
  const temporaryTypeLabel = computed(() =>
    form.temporaryCustomerType
      ? catalogStore.getCustomerTypeName(form.temporaryCustomerType)
      : '请选择客户类型',
  )

  const timeColumns = [timeHourOptions, timeMinuteOptions]

  const isMakeupRole = computed(() => authStore.userRole === 'makeup_artist')
  const pageTitle = computed(() => (isMakeupRole.value ? '约妆录入' : '排单录入'))
  const serviceLabel = computed(() => (isMakeupRole.value ? '约妆' : '拍摄'))
  const locationLabel = computed(() => (isMakeupRole.value ? '约妆地点' : '拍摄地点'))
  const locationPlaceholder = computed(() =>
    isMakeupRole.value ? '请输入约妆地点' : '请输入拍摄地点',
  )
  const notePlaceholder = computed(() => (isMakeupRole.value ? '填写妆造备注' : '填写拍摄备注'))
  const referenceTitle = computed(() =>
    isMakeupRole.value ? '妆容参考图（最多 6 张）' : '动作参考图（最多 6 张）',
  )
  const submitLabel = computed(() => (isMakeupRole.value ? '提交约妆' : '提交排单'))
  const selectableRoleOptions = computed(() => {
    const selectedProfileRoleSet = new Set(authStore.profile?.roles || [])
    return catalogStore.roles
      .filter((item) => selectedProfileRoleSet.size === 0 || selectedProfileRoleSet.has(item.code))
      .map((item) => ({
        code: item.code,
        name: item.name,
        description:
          item.code === 'makeup_artist'
            ? '妆造服务'
            : item.code === 'photographer'
              ? '拍摄服务'
              : '角色服务',
      }))
  })

  const selectedRoleCodes = ref<string[]>([])

  watch(
    [selectableRoleOptions, () => authStore.userRole],
    ([options, userRole]) => {
      if (selectedRoleCodes.value.length) {
        selectedRoleCodes.value = selectedRoleCodes.value.filter((code) =>
          options.some((item) => item.code === code),
        )
        if (selectedRoleCodes.value.length) {
          return
        }
      }

      const fallback = options.find((item) => item.code === userRole)?.code || options[0]?.code
      selectedRoleCodes.value = fallback ? [fallback] : []
    },
    { immediate: true },
  )

  const toggleRoleCode = (code: string) => {
    const currentSet = new Set(selectedRoleCodes.value)
    if (currentSet.has(code)) {
      if (currentSet.size === 1) {
        return
      }
      currentSet.delete(code)
    } else {
      currentSet.add(code)
    }
    selectedRoleCodes.value = [...currentSet]
  }

  const selectedRolePreview = computed(() =>
    selectedRoleCodes.value
      .map((code) => selectableRoleOptions.value.find((item) => item.code === code)?.name || code)
      .join('、'),
  )

  const serviceTypeCode = computed(() =>
    selectedRoleCodes.value.includes('makeup_artist') ? 'makeup' : 'photography',
  )

  const conflictSchedule = computed(() =>
    conflictId.value ? scheduleStore.getScheduleById(conflictId.value) : undefined,
  )
  const conflictCustomerName = computed(() => {
    if (!conflictSchedule.value) {
      return ''
    }
    return customerStore.getCustomerById(conflictSchedule.value.customerId)?.name ?? '未知客户'
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
      const customer = customerStore.getCustomerById(id)
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
    () => catalogStore.customerTypes,
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

    if (form.entryMode === 'temporary' && !catalogStore.customerTypes.length) {
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

    if (!selectedRoleCodes.value.length) {
      error.value = '请至少选择一个服务角色。'
      return
    }

    if (!isAfterTime(form.startTime, form.endTime)) {
      error.value = '结束时间必须晚于开始时间。'
      return
    }

    try {
      const result = await scheduleStore.addSchedule({
        date: form.date,
        startTime: form.startTime,
        endTime: form.endTime,
        location: form.location,
        note: form.note,
        referenceImages: uploadQueue.getUploadedUrls(),
        depositStatus: form.depositStatus as 'unpaid' | 'paid' | 'full',
        amount: Number(form.amount) || 0,
        reminders: [...settingsStore.defaultReminders],
        serviceTypeCode: serviceTypeCode.value,
        serviceRoleCodes: [...selectedRoleCodes.value],
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

  const onAfterRead = uploadQueue.uploadItems
  const retryUpload = async (item: UploadItem) => {
    error.value = ''
    await uploadQueue.retry(item)
  }

  return {
    router,
    form,
    error,
    success,
    showCustomerPicker,
    showDatePicker,
    showStartTimePicker,
    showEndTimePicker,
    showDepositPicker,
    showTemporaryTypePicker,
    uploading,
    referenceFileList,
    failedUploads,
    selectedDateValues,
    selectedStartTimeValues,
    selectedEndTimeValues,
    customerColumns,
    selectedCustomerLabel,
    depositStatusColumns,
    temporaryTypeColumns,
    depositStatusLabel,
    temporaryTypeLabel,
    timeColumns,
    pageTitle,
    serviceLabel,
    locationLabel,
    locationPlaceholder,
    notePlaceholder,
    referenceTitle,
    submitLabel,
    selectableRoleOptions,
    selectedRoleCodes,
    toggleRoleCode,
    selectedRolePreview,
    conflictSchedule,
    conflictCustomerName,
    normalizeDate,
    switchMode,
    openDate,
    openStartTime,
    openEndTime,
    submit,
    onAfterRead,
    retryUpload,
    depositStatusText,
  }
}
