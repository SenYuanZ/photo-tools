import dayjs from 'dayjs'
import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type {
  Customer,
  CustomerPayload,
  LoginPayload,
  ReminderType,
  Schedule,
  SchedulePayload,
  ThemeName,
} from '../types/models'
import { authApi, customerApi, scheduleApi, settingsApi } from '../api/app'
import { clearToken, getToken, setToken } from '../api/http'
import { isTimeOverlap } from '../utils/time'

const ACCOUNT_KEY = 'photo_order_account'

type ApiErrorLike = Error & {
  details?: {
    message?: unknown
  }
}

const normalizeSchedule = (item: Schedule): Schedule => ({
  ...item,
  referenceImages: item.referenceImages || [],
})

export const useAppStore = defineStore('app', () => {
  const isLoggedIn = ref(false)
  const account = ref(localStorage.getItem(ACCOUNT_KEY) || '')
  const theme = ref<ThemeName>('pink')
  const customers = ref<Customer[]>([])
  const schedules = ref<Schedule[]>([])
  const defaultReminders = ref<ReminderType[]>(['1d', '1h'])
  const backupEnabled = ref(true)
  const hydrated = ref(false)

  const customerMap = computed(() => new Map(customers.value.map((item) => [item.id, item])))

  const stats = computed(() => {
    const todayDate = dayjs().format('YYYY-MM-DD')
    return {
      customerCount: customers.value.length,
      todayCount: schedules.value.filter((item) => item.date === todayDate).length,
      monthCount: schedules.value.filter((item) => dayjs(item.date).isSame(dayjs(), 'month')).length,
    }
  })

  const restoreSession = async () => {
    if (hydrated.value) {
      return
    }

    const token = getToken()
    if (!token) {
      hydrated.value = true
      return
    }

    isLoggedIn.value = true
    try {
      await loadInitialData()
    } catch {
      logout()
    }

    hydrated.value = true
  }

  const loadInitialData = async () => {
    const [customersData, schedulesData, settingsData] = await Promise.all([
      customerApi.list(),
      scheduleApi.list(),
      settingsApi.get(),
    ])

    customers.value = customersData
    schedules.value = schedulesData.map(normalizeSchedule)
    theme.value = settingsData.theme
    defaultReminders.value = settingsData.defaultReminders
    backupEnabled.value = settingsData.backupEnabled
  }

  const login = async (payload: LoginPayload) => {
    const result = await authApi.login(payload)
    setToken(result.token)
    account.value = result.user.nickname || result.user.account
    localStorage.setItem(ACCOUNT_KEY, account.value)
    isLoggedIn.value = true
    await loadInitialData()
    hydrated.value = true
  }

  const logout = () => {
    isLoggedIn.value = false
    account.value = ''
    customers.value = []
    schedules.value = []
    defaultReminders.value = ['1d', '1h']
    backupEnabled.value = true
    hydrated.value = true
    clearToken()
    localStorage.removeItem(ACCOUNT_KEY)
  }

  const setTheme = async (nextTheme: ThemeName) => {
    const previous = theme.value
    theme.value = nextTheme
    try {
      await settingsApi.update({ theme: nextTheme })
    } catch {
      theme.value = previous
      throw new Error('主题保存失败')
    }
  }

  const updateSettings = async (payload: Partial<{ defaultReminders: ReminderType[]; backupEnabled: boolean }>) => {
    const updated = await settingsApi.update(payload)
    theme.value = updated.theme
    defaultReminders.value = updated.defaultReminders
    backupEnabled.value = updated.backupEnabled
  }

  const addCustomer = async (payload: CustomerPayload) => {
    const item = await customerApi.create(payload)
    customers.value.unshift(item)
    return item
  }

  const updateCustomer = async (id: string, payload: Partial<CustomerPayload>) => {
    const updated = await customerApi.update(id, payload)
    const index = customers.value.findIndex((item) => item.id === id)
    if (index >= 0) {
      customers.value[index] = updated
    }
    if (payload.location) {
      schedules.value = schedules.value.map((item) =>
        item.customerId === id
          ? {
              ...item,
              location: payload.location as string,
            }
          : item,
      )
    }
    return updated
  }

  const deleteCustomer = async (id: string) => {
    await customerApi.remove(id)
    customers.value = customers.value.filter((item) => item.id !== id)
    schedules.value = schedules.value.filter((item) => item.customerId !== id)
  }

  const getConflict = (payload: SchedulePayload, excludeId?: string) => {
    return schedules.value.find((item) => {
      if (excludeId && item.id === excludeId) {
        return false
      }
      if (item.date !== payload.date) {
        return false
      }
      return isTimeOverlap(item.startTime, item.endTime, payload.startTime, payload.endTime)
    })
  }

  const addSchedule = async (payload: SchedulePayload) => {
    try {
        const item = await scheduleApi.create(payload)
        const normalized = normalizeSchedule(item)
        schedules.value.unshift(normalized)
        return { ok: true as const, item: normalized }
    } catch (error) {
      const apiError = error as ApiErrorLike
      const conflict = ((apiError.details?.message as { conflict?: Schedule } | undefined)?.conflict ??
        getConflict(payload)) as Schedule | undefined
      if (conflict) {
        return { ok: false as const, conflict }
      }
      throw error
    }
  }

  const updateSchedule = async (id: string, payload: Partial<SchedulePayload>) => {
    try {
      const item = await scheduleApi.update(id, payload)
      const normalized = normalizeSchedule(item)
      const index = schedules.value.findIndex((current) => current.id === id)
      if (index >= 0) {
        schedules.value[index] = normalized
      }
      return { ok: true as const, item: normalized }
    } catch (error) {
      const apiError = error as ApiErrorLike
      const fallback = schedules.value.find((current) => current.id === id)
      if (fallback && payload.date && payload.startTime && payload.endTime) {
        const conflict = getConflict(
          {
            customerId: payload.customerId ?? fallback.customerId,
            date: payload.date,
            startTime: payload.startTime,
            endTime: payload.endTime,
            location: payload.location ?? fallback.location,
            note: payload.note ?? fallback.note,
            referenceImages: payload.referenceImages ?? fallback.referenceImages,
            depositStatus: payload.depositStatus ?? fallback.depositStatus,
            amount: payload.amount ?? fallback.amount,
            reminders: payload.reminders ?? fallback.reminders,
          },
          id,
        )

        if (conflict) {
          return { ok: false as const, conflict }
        }
      }

      const conflict = (apiError.details?.message as { conflict?: Schedule } | undefined)?.conflict
      if (conflict) {
        return { ok: false as const, conflict }
      }

      throw error
    }
  }

  const deleteSchedule = async (id: string) => {
    await scheduleApi.remove(id)
    schedules.value = schedules.value.filter((item) => item.id !== id)
  }

  const refreshHistory = async (month?: string, type?: string) => {
    return scheduleApi.history(month, type)
  }

  const getCustomerById = (id: string) => customerMap.value.get(id)
  const getScheduleById = (id: string) => schedules.value.find((item) => item.id === id)

  return {
    isLoggedIn,
    account,
    theme,
    customers,
    schedules,
    stats,
    defaultReminders,
    backupEnabled,
    hydrated,
    restoreSession,
    login,
    logout,
    setTheme,
    updateSettings,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    addSchedule,
    updateSchedule,
    deleteSchedule,
    refreshHistory,
    getCustomerById,
    getScheduleById,
    getConflict,
  }
})
