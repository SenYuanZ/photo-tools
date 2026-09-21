import { reactive } from 'vue'
import { storage } from '@/utils/storage'

const STORAGE_KEY = 'photo_order_recent_providers'

const normalizeStoredProviders = (value: unknown): Record<string, string[]> => {
  if (!value || typeof value !== 'object') return {}
  return Object.entries(value).reduce<Record<string, string[]>>((result, [key, item]) => {
    result[key] = Array.isArray(item)
      ? item.filter((entry): entry is string => typeof entry === 'string')
      : []
    return result
  }, {})
}

export const useRecentProviders = () => {
  const recentProviderIdsByService = reactive<Record<string, string[]>>(
    normalizeStoredProviders(storage.getJson<unknown>(STORAGE_KEY, {})),
  )

  const persist = () => storage.setJson(STORAGE_KEY, recentProviderIdsByService)

  const markRecentProvider = (serviceCode: string, providerId: string) => {
    const current = recentProviderIdsByService[serviceCode] || []
    recentProviderIdsByService[serviceCode] = [
      providerId,
      ...current.filter((item) => item !== providerId),
    ].slice(0, 5)
    persist()
  }

  const clearRecentProviders = (serviceCode: string) => {
    recentProviderIdsByService[serviceCode] = []
    persist()
  }

  return { recentProviderIdsByService, markRecentProvider, clearRecentProviders }
}
