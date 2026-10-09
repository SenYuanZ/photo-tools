import { onUnmounted, shallowRef, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useNotificationsStore } from '@/stores/notifications'

export function useNotificationPolling() {
  const auth = useAuthStore()
  const store = useNotificationsStore()
  const route = useRoute()
  const bannerVisible = shallowRef(false)
  let timer: ReturnType<typeof setTimeout> | undefined
  let bannerTimer: ReturnType<typeof setTimeout> | undefined
  let controller: AbortController | undefined
  let generation = 0

  const dismiss = () => {
    bannerVisible.value = false
    clearTimeout(bannerTimer)
  }
  const stop = () => {
    generation++
    clearTimeout(timer)
    controller?.abort()
    controller = undefined
    dismiss()
  }
  const ready = () => auth.isLoggedIn && auth.hydrated && !!auth.profile
  const visible = () => document.visibilityState !== 'hidden'
  const poll = async () => {
    if (!ready() || !visible()) return
    const current = generation
    controller = new AbortController()
    try {
      const isNew = await store.refresh(controller.signal)
      if (current !== generation) return
      if (isNew && route.name !== 'notifications') {
        bannerVisible.value = true
        clearTimeout(bannerTimer)
        bannerTimer = setTimeout(dismiss, 6000)
      }
    } catch {
      /* notification outages do not affect the authenticated session */
    } finally {
      if (current === generation && ready() && visible()) {
        timer = setTimeout(() => void poll(), 60000)
      }
    }
  }
  const onVisibility = () => {
    stop()
    if (ready() && document.visibilityState !== 'hidden') void poll()
  }
  watch(
    () => [ready(), auth.profile?.id] as const,
    () => {
      stop()
      store.reset()
      if (ready()) void poll()
    },
    { immediate: true },
  )
  watch(
    () => route.name,
    (name) => {
      if (name === 'notifications') dismiss()
    },
  )
  document.addEventListener('visibilitychange', onVisibility)
  onUnmounted(() => {
    stop()
    document.removeEventListener('visibilitychange', onVisibility)
  })
  return { bannerVisible, dismiss }
}
