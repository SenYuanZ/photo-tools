import dayjs from 'dayjs'
import { computed, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { depositStatusOptions, timeHourOptions, timeMinuteOptions } from '@/constants/options'
import { normalizeDatePickerValue, useDateTimePicker } from '@/hooks/useDateTimePicker'
import { useCatalogStore } from '@/stores/catalog'
import { useCustomerStore } from '@/stores/customers'
import { getErrorMessage } from '@/utils/error'
import { isAfterTime } from '@/utils/time'

export const useAddCustomerPage = () => {
  const customerStore = useCustomerStore()
  const catalogStore = useCatalogStore()
  const router = useRouter()
  const form = reactive({
    name: '',
    phone: '',
    type: '',
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
  const selectedTailDateValues = ref(dayjs().format('YYYY-MM-DD').split('-'))
  const {
    selectedDateValues,
    selectedStartTimeValues,
    selectedEndTimeValues,
    syncDate,
    syncStartTime,
    syncEndTime,
  } = useDateTimePicker(form.date, form.startTime, form.endTime)

  const customerTypeColumns = computed(() =>
    catalogStore.customerTypes.map((item) => ({ text: item.name, value: item.code })),
  )
  const depositStatusColumns = depositStatusOptions.map(([value, text]) => ({ text, value }))
  const timeColumns = [timeHourOptions, timeMinuteOptions]
  const customerTypeLabel = computed(
    () => catalogStore.getCustomerTypeName(form.type || '') || '请选择客户类型',
  )
  const depositStatusLabel = computed(
    () =>
      depositStatusOptions.find(([value]) => value === form.depositStatus)?.[1] ?? '请选择定金状态',
  )

  const openDate = () => {
    syncDate(form.date)
    showDatePicker.value = true
  }
  const openTailDate = () => {
    selectedTailDateValues.value = (form.tailPaymentDate || dayjs().format('YYYY-MM-DD')).split('-')
    showTailDatePicker.value = true
  }
  const openStartTime = () => {
    syncStartTime(form.startTime)
    showStartTimePicker.value = true
  }
  const openEndTime = () => {
    syncEndTime(form.endTime)
    showEndTimePicker.value = true
  }

  const saveCustomer = async () => {
    error.value = ''
    success.value = ''
    if (!catalogStore.customerTypes.length) {
      error.value = '当前未配置客户类型，请先在数据库中维护客户类型后再录入客户。'
      return
    }
    if (!form.name || !form.phone || !form.type || !form.date || !form.startTime || !form.endTime) {
      error.value = '请先填写所有必填项。'
      return
    }
    if (!isAfterTime(form.startTime, form.endTime)) {
      error.value = '结束时间要晚于开始时间哦。'
      return
    }

    try {
      const created = await customerStore.addCustomer({
        name: form.name,
        phone: form.phone,
        isLongTerm: true,
        type: form.type,
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
      window.setTimeout(() => {
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
      error.value = getErrorMessage(requestError, '保存失败，请重试')
    }
  }

  watch(
    () => catalogStore.customerTypes,
    (list) => {
      if (!form.type && list.length) form.type = list[0].code
    },
    { immediate: true },
  )

  return {
    router,
    form,
    error,
    success,
    showTypePicker,
    showDepositPicker,
    showDatePicker,
    showStartTimePicker,
    showEndTimePicker,
    showTailDatePicker,
    selectedDateValues,
    selectedTailDateValues,
    selectedStartTimeValues,
    selectedEndTimeValues,
    customerTypeColumns,
    depositStatusColumns,
    timeColumns,
    customerTypeLabel,
    depositStatusLabel,
    normalizeDate: normalizeDatePickerValue,
    openDate,
    openTailDate,
    openStartTime,
    openEndTime,
    saveCustomer,
  }
}
