import { defineStore } from 'pinia'
import { shallowRef } from 'vue'
import { notificationsApi } from '@/api/notifications'

export const useNotificationsStore = defineStore('notifications', () => {
  const unreadCount = shallowRef(0)
  const syncVersion = shallowRef(0)
  const sessionVersion = shallowRef(0)
  const initialized = shallowRef(false)
  const latestSeenId = shallowRef(0)
  let requestVersion = 0

  const reset = () => {
    sessionVersion.value++
    requestVersion++
    unreadCount.value = 0
    syncVersion.value = 0
    initialized.value = false
    latestSeenId.value = 0
  }

  const refresh = async (signal?: AbortSignal) => {
    const session = sessionVersion.value
    const request = ++requestVersion
    const summary = await notificationsApi.summary(signal)
    if (signal?.aborted || session !== sessionVersion.value || request !== requestVersion)
      return false
    const latest = summary.latestId ?? 0
    const isNew = initialized.value && latest > latestSeenId.value
    latestSeenId.value = Math.max(latestSeenId.value, latest)
    unreadCount.value = summary.unreadCount
    initialized.value = true
    syncVersion.value++
    return isNew
  }

  const read = async (id: number, wasUnread: boolean) => {
    const session = sessionVersion.value
    await notificationsApi.read(id)
    if (session !== sessionVersion.value) return false
    requestVersion++
    if (wasUnread) unreadCount.value = Math.max(0, unreadCount.value - 1)
    // A failed count refresh must not turn a successful read into an error.
    try {
      await refresh()
    } catch {
      /* retry on the next poll */
    }
    return session === sessionVersion.value
  }

  const readAll = async () => {
    const session = sessionVersion.value
    const previousCount = unreadCount.value
    const previousLatest = latestSeenId.value
    await notificationsApi.readAll()
    if (session !== sessionVersion.value) return false
    requestVersion++
    unreadCount.value =
      latestSeenId.value === previousLatest ? 0 : Math.max(0, unreadCount.value - previousCount)
    try {
      await refresh()
    } catch {
      /* retry the authoritative count on the next poll */
    }
    return session === sessionVersion.value
  }

  return {
    unreadCount,
    syncVersion,
    sessionVersion,
    initialized,
    latestSeenId,
    reset,
    refresh,
    read,
    readAll,
  }
})
