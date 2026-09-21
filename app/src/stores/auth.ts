import { ref } from 'vue'
import { defineStore } from 'pinia'
import { authApi } from '@/api/auth'
import type { LoginRequest } from '@/api/auth/types'
import { clearToken, getToken, setToken } from '@/api/core/auth'
import { profileApi } from '@/api/profile'
import type { ProfileData, ProfileRolesData, UpdateProfileRequest } from '@/api/profile/types'
import type { UserRole } from '@/types/common'
import { normalizeProfile } from '@/utils/normalizers'
import { storage } from '@/utils/storage'
import { useCatalogStore } from '@/stores/catalog'
import { useCustomerStore } from '@/stores/customers'
import { useScheduleStore } from '@/stores/schedules'
import { useSettingsStore } from '@/stores/settings'

const ACCOUNT_KEY = 'photo_order_account'
const ROLE_KEY = 'photo_order_role'

export const useAuthStore = defineStore('auth', () => {
  const isLoggedIn = ref(false)
  const account = ref(storage.get(ACCOUNT_KEY))
  const userRole = ref<UserRole>(storage.get(ROLE_KEY, 'photographer'))
  const profile = ref<ProfileData | null>(null)
  const hydrated = ref(false)

  const persistIdentity = () => {
    storage.set(ACCOUNT_KEY, account.value)
    storage.set(ROLE_KEY, userRole.value)
  }

  const applyProfile = (value: ProfileData) => {
    profile.value = normalizeProfile(value, userRole.value)
    account.value = profile.value.nickname || profile.value.account
    userRole.value = profile.value.role || userRole.value
    persistIdentity()
  }

  const loadInitialData = async () => {
    const customerStore = useCustomerStore()
    const scheduleStore = useScheduleStore()
    const settingsStore = useSettingsStore()

    const [, , , profileData] = await Promise.all([
      customerStore.load(),
      scheduleStore.load(),
      settingsStore.load(),
      profileApi.get(),
    ])
    applyProfile(profileData)
    await useCatalogStore().load(customerStore.customers, scheduleStore.schedules)
  }

  const restoreSession = async () => {
    if (hydrated.value) return
    if (!getToken()) {
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

  const login = async (payload: LoginRequest) => {
    const result = await authApi.login(payload)
    setToken(result.token)
    account.value = result.user.nickname || result.user.account
    userRole.value =
      result.user.roles?.[0] || result.user.role || storage.get(ROLE_KEY, 'photographer')
    persistIdentity()
    isLoggedIn.value = true
    await loadInitialData()
    hydrated.value = true
  }

  const updateProfile = async (payload: UpdateProfileRequest) => {
    applyProfile(await profileApi.update(payload))
    return profile.value as ProfileData
  }

  const applyProfileRoles = (value: ProfileRolesData) => {
    userRole.value = value.primaryRoleCode
    if (profile.value) {
      profile.value = {
        ...profile.value,
        role: value.primaryRoleCode,
        roles: value.selectedRoles.map((item) => item.code),
      }
    }
    persistIdentity()
  }

  const logout = () => {
    isLoggedIn.value = false
    account.value = ''
    userRole.value = 'photographer'
    profile.value = null
    hydrated.value = true
    clearToken()
    storage.remove(ACCOUNT_KEY)
    storage.remove(ROLE_KEY)
    useCustomerStore().reset()
    useScheduleStore().reset()
    useCatalogStore().reset()
    useSettingsStore().reset()
  }

  return {
    isLoggedIn,
    account,
    userRole,
    profile,
    hydrated,
    restoreSession,
    login,
    logout,
    updateProfile,
    applyProfileRoles,
  }
})
