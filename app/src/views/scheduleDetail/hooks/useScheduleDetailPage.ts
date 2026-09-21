import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import dayjs from 'dayjs'
import { showConfirmDialog, showImagePreview } from 'vant'
import { scheduleApi } from '@/api/schedules'
import { depositStatusText, timeHourOptions, timeMinuteOptions } from '@/constants/options'
import { useCatalogStore } from '@/stores/catalog'
import { useCustomerStore } from '@/stores/customers'
import { useScheduleStore } from '@/stores/schedules'
import { useUploadQueue, type UploadItem } from '@/hooks/useUploadQueue'
import { formatCnDate, isAfterTime } from '@/utils/time'

export function useScheduleDetailPage() {
  const route = useRoute()
  const router = useRouter()
  const catalogStore = useCatalogStore()
  const customerStore = useCustomerStore()
  const scheduleStore = useScheduleStore()

  const scheduleId = computed(() => String(route.params.id ?? ''))
  const schedule = computed(() => scheduleStore.getScheduleById(scheduleId.value))
  const customer = computed(() =>
    schedule.value ? customerStore.getCustomerById(schedule.value.customerId) : undefined,
  )

  const isEditing = ref(false)
  const feedback = ref('')
  const showDatePicker = ref(false)
  const showRestoreDatePicker = ref(false)
  const showStartTimePicker = ref(false)
  const showEndTimePicker = ref(false)
  const referenceFileList = ref<UploadItem[]>([])
  const uploadQueue = useUploadQueue({
    items: referenceFileList,
    upload: scheduleApi.uploadReferenceImage,
    onError: (message) => {
      feedback.value = message
    },
  })
  const uploadingReferences = uploadQueue.uploading
  const failedReferenceUploads = uploadQueue.failedItems

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

  const getReferenceUrls = uploadQueue.getUploadedUrls

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
      await scheduleStore.updateSchedule(schedule.value.id, { reminders: [...list] })
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

    const result = await scheduleStore.updateSchedule(schedule.value.id, {
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

    if (
      (paymentForm.depositStatus === 'paid' || paymentForm.depositStatus === 'full') &&
      amount <= 0
    ) {
      feedback.value = '已支付或全款状态时金额必须大于 0。'
      return
    }

    try {
      const result = await scheduleStore.updateSchedule(schedule.value.id, {
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

    const result = await scheduleStore.updateSchedule(schedule.value.id, {
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

      const updated = await scheduleStore.completeSchedule(schedule.value.id)
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
    const result = await scheduleStore.updateSchedule(schedule.value.id, {
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
    await scheduleStore.deleteSchedule(schedule.value.id)
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

  const onAfterReadReference = uploadQueue.uploadItems
  const retryReferenceUpload = uploadQueue.retry

  return {
    router,
    catalogStore,
    schedule,
    customer,
    isEditing,
    feedback,
    showDatePicker,
    showRestoreDatePicker,
    showStartTimePicker,
    showEndTimePicker,
    uploadingReferences,
    referenceFileList,
    failedReferenceUploads,
    selectedDateValues,
    selectedRestoreDateValues,
    selectedStartTimeValues,
    selectedEndTimeValues,
    timeColumns,
    isStored,
    isCompleted,
    detailRoleCodes,
    editForm,
    paymentForm,
    getReferenceUrls,
    normalizeDate,
    openDate,
    openStartTime,
    openEndTime,
    toggleReminder,
    saveEdit,
    savePaymentStatus,
    storeSchedule,
    completeSchedule,
    openRestoreDate,
    restoreSchedule,
    remove,
    copyPhone,
    navigateToMap,
    previewReferences,
    onAfterReadReference,
    retryReferenceUpload,
    depositStatusText,
    formatCnDate,
  }
}
