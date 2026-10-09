import { computed, onUnmounted, shallowRef, watch } from 'vue'
import { useRouter } from 'vue-router'
import { notificationsApi } from '@/api/notifications'
import type { NotificationFilter, NotificationItem } from '@/api/notifications/types'
import { useNotificationsStore } from '@/stores/notifications'
import { scheduleApi } from '@/api/schedules'
import { useScheduleStore } from '@/stores/schedules'
import { useCustomerStore } from '@/stores/customers'
import { normalizeCustomer, normalizeSchedule } from '@/utils/normalizers'

export function useNotificationsPage() {
  const router = useRouter()
  const store = useNotificationsStore()
  const filter = shallowRef<NotificationFilter>('all')
  const items = shallowRef<NotificationItem[]>([])
  const total = shallowRef(0)
  const page = shallowRef(0)
  const loading = shallowRef(false)
  const working = shallowRef(false)
  const error = shallowRef('')
  const hasMore = computed(() => items.value.length < total.value)
  let controller: AbortController | undefined
  let requestVersion = 0
  let disposed = false

  const load = async (append = false, silent = false) => {
    if (append && loading.value) return
    controller?.abort()
    controller = new AbortController()
    const signal = controller.signal
    const session = store.sessionVersion
    const request = ++requestVersion
    loading.value = true
    if (!silent) error.value = ''
    try {
      const lastPage = !append && silent ? Math.max(1, page.value) : 1
      const queryFilter = filter.value
      const result = await notificationsApi.list(
        { filter: queryFilter, page: append ? page.value + 1 : 1, pageSize: 20 },
        signal,
      )
      // Refresh the loaded range so a poll does not discard earlier pagination.
      if (!append) {
        for (
          let nextPage = 2;
          nextPage <= lastPage && result.items.length < result.total;
          nextPage++
        ) {
          const next = await notificationsApi.list(
            { filter: queryFilter, page: nextPage, pageSize: 20 },
            signal,
          )
          result.items.push(...next.items)
          result.total = next.total
          result.page = next.page
        }
      }
      if (
        disposed ||
        signal.aborted ||
        session !== store.sessionVersion ||
        request !== requestVersion
      )
        return
      items.value = append
        ? [
            ...items.value,
            ...result.items.filter((item) => !items.value.some((old) => old.id === item.id)),
          ]
        : result.items
      total.value = result.total
      page.value = result.page
      error.value = ''
    } catch (cause) {
      if (!signal.aborted && session === store.sessionVersion && request === requestVersion) {
        error.value = cause instanceof Error ? cause.message : '通知加载失败，请重试'
      }
    } finally {
      if (request === requestVersion) loading.value = false
    }
  }

  const open = async (item: NotificationItem) => {
    if (working.value) return
    working.value = true
    error.value = ''
    const session = store.sessionVersion
    try {
      const accepted = await store.read(item.id, !item.readAt && !item.invalidatedAt)
      if (!accepted || disposed || session !== store.sessionVersion) return
      if (filter.value === 'unread') {
        items.value = items.value.filter((old) => old.id !== item.id)
        total.value = Math.max(0, total.value - 1)
      } else {
        items.value = items.value.map((old) =>
          old.id === item.id ? { ...old, readAt: new Date().toISOString() } : old,
        )
      }
      if (item.canNavigate) {
        // Notifications may refer to a booking created after initial login.
        const detail = await scheduleApi.get(item.scheduleId)
        const schedule = normalizeSchedule(detail)
        if (disposed || session !== store.sessionVersion) return
        const schedules = useScheduleStore()
        schedules.schedules = [...schedules.schedules.filter((s) => s.id !== schedule.id), schedule]
        const customers = useCustomerStore()
        customers.customers = [
          ...customers.customers.filter((c) => c.id !== detail.customer.id),
          normalizeCustomer(detail.customer),
        ]
        await router.push({ name: 'schedule-detail', params: { id: item.scheduleId } })
      } else {
        await load()
      }
    } catch (cause) {
      if (!disposed && session === store.sessionVersion)
        error.value = cause instanceof Error ? cause.message : '操作失败，请重试'
    } finally {
      if (!disposed && session === store.sessionVersion) working.value = false
    }
  }

  const readAll = async () => {
    if (working.value) return
    working.value = true
    error.value = ''
    const session = store.sessionVersion
    const existingIds = new Set(items.value.map((item) => item.id))
    try {
      if ((await store.readAll()) && !disposed && session === store.sessionVersion) {
        if (filter.value === 'unread') {
          const removed = items.value.filter((item) => existingIds.has(item.id)).length
          items.value = items.value.filter((item) => !existingIds.has(item.id))
          total.value = Math.max(0, total.value - removed)
        } else {
          items.value = items.value.map((item) =>
            existingIds.has(item.id) && !item.readAt
              ? { ...item, readAt: new Date().toISOString() }
              : item,
          )
        }
        await load()
      }
    } catch (cause) {
      if (session === store.sessionVersion)
        error.value = cause instanceof Error ? cause.message : '操作失败，请重试'
    } finally {
      if (!disposed && session === store.sessionVersion) working.value = false
    }
  }

  watch(
    filter,
    () => {
      items.value = []
      total.value = 0
      page.value = 0
      void load()
    },
    { immediate: true },
  )
  watch(
    () => store.syncVersion,
    () => {
      if (!working.value) void load(false, true)
    },
  )
  watch(
    () => store.sessionVersion,
    () => {
      controller?.abort()
      requestVersion++
      loading.value = false
      working.value = false
      items.value = []
      total.value = 0
      page.value = 0
      error.value = ''
    },
  )
  onUnmounted(() => {
    disposed = true
    controller?.abort()
    requestVersion++
  })
  return { store, filter, items, total, loading, working, error, hasMore, load, open, readAll }
}
