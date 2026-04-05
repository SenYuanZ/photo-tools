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
  UserRole,
} from '../types/models'
import {
  authApi,
  customerApi,
  customerTypeApi,
  profileApi,
  scheduleApi,
  serviceTypeApi,
  settingsApi,
  type CustomerTypeItem,
  type ProfileData,
  type ServiceTypeItem,
} from '../api/app'
import { clearToken, getToken, setToken } from '../api/http'
import { isTimeOverlap } from '../utils/time'

const ACCOUNT_KEY = 'photo_order_account'
const ROLE_KEY = 'photo_order_role'

type ApiErrorLike = Error & {
  details?: {
    message?: unknown
  }
}

const mergeCustomer = (list: Customer[], item: Customer) => {
  const index = list.findIndex((current) => current.id === item.id)
  if (index >= 0) {
    list[index] = item
    return
  }
  list.unshift(item)
}

const normalizeSchedule = (item: Schedule): Schedule => ({
  ...item,
  serviceTypeCode: item.serviceTypeCode || 'photography',
  bookingGroupId: item.bookingGroupId ?? null,
  serviceMeta: item.serviceMeta ?? null,
  referenceImages: item.referenceImages || [],
})

const normalizeCustomer = (item: Customer): Customer => {
  const rawFlag = (item as unknown as { isLongTerm?: unknown }).isLongTerm
  return {
    ...item,
    isLongTerm: !(rawFlag === false || rawFlag === 0 || rawFlag === '0'),
  }
}

export const useAppStore = defineStore('app', () => {
  const isLoggedIn = ref(false)
  const account = ref(localStorage.getItem(ACCOUNT_KEY) || '')
  const userRole = ref<UserRole>((localStorage.getItem(ROLE_KEY) as UserRole) || 'photographer')
  const theme = ref<ThemeName>('pink')
  const customers = ref<Customer[]>([])
  const customerTypes = ref<CustomerTypeItem[]>([])
  const serviceTypes = ref<ServiceTypeItem[]>([])
  const profile = ref<ProfileData | null>(null)
  const schedules = ref<Schedule[]>([])
  const defaultReminders = ref<ReminderType[]>(['1d', '1h'])
  const backupEnabled = ref(true)
  const hydrated = ref(false)

  const customerMap = computed(() => new Map(customers.value.map((item) => [item.id, item])))
  const customerTypeMap = computed(() => new Map(customerTypes.value.map((item) => [item.code, item.name])))
  const serviceTypeMap = computed(() => new Map(serviceTypes.value.map((item) => [item.code, item.name])))

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
    const [customersData, schedulesData, settingsData, profileData] = await Promise.all([
      customerApi.list(),
      scheduleApi.list(),
      settingsApi.get(),
      profileApi.get(),
    ])

    let customerTypeData: CustomerTypeItem[] = []
    let serviceTypeData: ServiceTypeItem[] = []
    try {
      customerTypeData = await customerTypeApi.list()
    } catch {
      const fallbackCodes = [...new Set(customersData.map((item) => item.type).filter(Boolean))]
      customerTypeData = fallbackCodes.map((code, index) => ({
        id: `fallback-${code}`,
        code,
        name: code,
        sortOrder: (index + 1) * 10,
        isActive: true,
      }))
    }

    try {
      serviceTypeData = await serviceTypeApi.list()
    } catch {
      const fallbackCodes = [...new Set(schedulesData.map((item) => item.serviceTypeCode).filter(Boolean))]
      serviceTypeData = (fallbackCodes.length ? fallbackCodes : ['photography']).map((code, index) => ({
        id: `fallback-${code}`,
        code,
        name: code,
        sortOrder: (index + 1) * 10,
        isActive: true,
      }))
    }

    customers.value = customersData.map(normalizeCustomer)
    customerTypes.value = customerTypeData
    serviceTypes.value = serviceTypeData
    profile.value = {
      ...profileData,
      avatarUrl: profileData.avatarUrl || '',
      bio: profileData.bio || '',
      portfolioImages: profileData.portfolioImages || [],
      portfolioPublic: Boolean(profileData.portfolioPublic),
    }
    schedules.value = schedulesData.map(normalizeSchedule)
    theme.value = settingsData.theme
    defaultReminders.value = settingsData.defaultReminders
    backupEnabled.value = settingsData.backupEnabled
    account.value = profile.value.nickname || profile.value.account
    userRole.value = profile.value.role || userRole.value
    localStorage.setItem(ACCOUNT_KEY, account.value)
    localStorage.setItem(ROLE_KEY, userRole.value)
  }

  const login = async (payload: LoginPayload) => {
    const result = await authApi.login(payload)
    setToken(result.token)
    account.value = result.user.nickname || result.user.account
    userRole.value = result.user.role || (localStorage.getItem(ROLE_KEY) as UserRole) || 'photographer'
    localStorage.setItem(ROLE_KEY, userRole.value)
    localStorage.setItem(ACCOUNT_KEY, account.value)
    isLoggedIn.value = true
    await loadInitialData()
    hydrated.value = true
  }

  const logout = () => {
    isLoggedIn.value = false
    account.value = ''
    userRole.value = 'photographer'
    customers.value = []
    customerTypes.value = []
    serviceTypes.value = []
    profile.value = null
    schedules.value = []
    defaultReminders.value = ['1d', '1h']
    backupEnabled.value = true
    hydrated.value = true
    clearToken()
    localStorage.removeItem(ACCOUNT_KEY)
    localStorage.removeItem(ROLE_KEY)
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

  const updateProfile = async (payload: Partial<Pick<ProfileData, 'nickname' | 'avatarUrl' | 'bio' | 'portfolioImages' | 'portfolioPublic'>>) => {
    const updated = await profileApi.update(payload)
    profile.value = {
      ...updated,
      avatarUrl: updated.avatarUrl || '',
      bio: updated.bio || '',
      portfolioImages: updated.portfolioImages || [],
      portfolioPublic: Boolean(updated.portfolioPublic),
    }
    account.value = profile.value.nickname || profile.value.account
    userRole.value = profile.value.role || userRole.value
    localStorage.setItem(ACCOUNT_KEY, account.value)
    localStorage.setItem(ROLE_KEY, userRole.value)
    return profile.value
  }

  const addCustomer = async (payload: CustomerPayload) => {
    const item = await customerApi.create(payload)
    const normalized = normalizeCustomer(item)
    customers.value.unshift(normalized)
    return normalized
  }

  const updateCustomer = async (id: string, payload: Partial<CustomerPayload>) => {
    const updated = await customerApi.update(id, payload)
    const normalized = normalizeCustomer(updated)
    const index = customers.value.findIndex((item) => item.id === id)
    if (index >= 0) {
      customers.value[index] = normalized
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
    return normalized
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
    let schedulePayload: SchedulePayload = { ...payload }

    if (!schedulePayload.customerId && schedulePayload.temporaryCustomer) {
      const temporary = schedulePayload.temporaryCustomer
      const phone = temporary.phone.trim()

      let customer = customers.value.find((item) => item.phone === phone)

      if (!customer) {
        try {
          const fallbackType = temporary.type || customerTypes.value[0]?.code
          if (!fallbackType) {
            throw new Error('请先在数据库中配置可用的客户类型')
          }

          const created = await customerApi.create({
            name: temporary.name.trim(),
            phone,
            isLongTerm: false,
            type: fallbackType,
            style: '',
            hobby: '',
            specialNeed: schedulePayload.note || '',
            depositStatus: schedulePayload.depositStatus,
            tailPaymentDate: '',
            outfit: '',
            location: schedulePayload.location,
            companions: '',
            tags: ['临时客户'],
          })

          customer = normalizeCustomer(created)
          mergeCustomer(customers.value, customer)
        } catch (error) {
          const message = (error as Error).message || ''
          if (!message.includes('已存在')) {
            throw error
          }

          const remoteList = await customerApi.list(phone)
          const matched = remoteList.map(normalizeCustomer).find((item) => item.phone === phone)
          if (!matched) {
            throw error
          }

          customer = matched
          mergeCustomer(customers.value, matched)
        }
      }

      schedulePayload = {
        ...schedulePayload,
        customerId: customer.id,
        temporaryCustomer: undefined,
      }
    }

    try {
      const item = await scheduleApi.create(schedulePayload)
      const normalized = normalizeSchedule(item)
      schedules.value.unshift(normalized)
      return { ok: true as const, item: normalized }
    } catch (error) {
      const apiError = error as ApiErrorLike
      const conflict = ((apiError.details?.message as { conflict?: Schedule } | undefined)?.conflict ??
        getConflict(schedulePayload)) as Schedule | undefined
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
  const getCustomerTypeName = (code: string) => {
    if (!code) {
      return '未设置'
    }
    return customerTypeMap.value.get(code) || code
  }
  const getServiceTypeName = (code: string) => serviceTypeMap.value.get(code) || code
  const getScheduleById = (id: string) => schedules.value.find((item) => item.id === id)

  return {
    isLoggedIn,
    account,
    userRole,
    theme,
    customers,
    customerTypes,
    serviceTypes,
    profile,
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
    updateProfile,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    addSchedule,
    updateSchedule,
    deleteSchedule,
    refreshHistory,
    getCustomerById,
    getCustomerTypeName,
    getServiceTypeName,
    getScheduleById,
    getConflict,
  }
})
