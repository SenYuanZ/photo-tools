import { computed, onBeforeUnmount, shallowRef, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { publicBookingApi } from '@/api/public-booking'
import type { PublicProvider } from '@/api/public-booking/types'
import { ApiError } from '@/api/core/error'

interface ProviderLinkOptions {
  firstServiceCode: () => string
  prepareProviders: (code: string) => Promise<void>
  addProvider: (code: string, provider: PublicProvider) => void
  clearSelection: (code: string) => void
  selectProvider: (code: string, providerId: string) => void
}

export function useBookingProviderLink(options: ProviderLinkOptions) {
  const route = useRoute()
  const router = useRouter()
  const state = shallowRef<'idle' | 'loading' | 'ready' | 'unavailable' | 'error'>('idle')
  const providerName = shallowRef('')
  let requestVersion = 0
  const blocked = computed(() => ['loading', 'unavailable', 'error'].includes(state.value))
  const message = computed(() => {
    if (state.value === 'loading') return '正在加载专属预约服务者…'
    if (state.value === 'unavailable') return '该服务者暂时无法预约，请重新选择服务者。'
    if (state.value === 'error') return '服务者信息加载失败，请重试或手动选择。'
    if (state.value === 'ready') return `已为你选择服务者：${providerName.value}`
    return ''
  })

  const load = async () => {
    const version = ++requestVersion
    const value = route.query.provider
    providerName.value = ''
    if (value === undefined) {
      state.value = 'idle'
      return
    }
    const code = options.firstServiceCode()
    options.clearSelection(code)
    if (typeof value !== 'string' || !value.trim()) {
      state.value = 'unavailable'
      return
    }
    state.value = 'loading'
    try {
      // 等当前列表请求结束后写入详情，避免列表的迟到响应清空链接预选。
      const [provider] = await Promise.all([
        publicBookingApi.getProvider(value.trim()),
        options.prepareProviders(code),
      ])
      if (version !== requestVersion) return
      options.addProvider(code, provider)
      state.value = 'ready'
      providerName.value = provider.nickname
      options.selectProvider(code, provider.id)
    } catch (error) {
      if (version !== requestVersion) return
      state.value =
        error instanceof ApiError && [400, 404].includes(error.status) ? 'unavailable' : 'error'
    }
  }

  const dismiss = () => {
    ++requestVersion
    state.value = 'idle'
    providerName.value = ''
    if (route.query.provider !== undefined) {
      const query = { ...route.query }
      delete query.provider
      void router.replace({ query })
    }
  }

  watch(() => route.query.provider, load, { immediate: true })
  onBeforeUnmount(() => {
    ++requestVersion
  })
  return { state, blocked, message, retry: load, dismiss }
}
