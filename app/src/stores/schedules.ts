import dayjs from 'dayjs'
import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { ApiError } from '@/api/core/error'
import { scheduleApi } from '@/api/schedules'
import type { Schedule, ScheduleRequest } from '@/api/schedules/types'
import { isTimeOverlap } from '@/utils/time'
import { normalizeSchedule } from '@/utils/normalizers'
import { useCatalogStore } from '@/stores/catalog'
import { useCustomerStore } from '@/stores/customers'

const getApiConflict = (error: unknown): Schedule | undefined => {
  if (!(error instanceof ApiError) || !error.details || typeof error.details !== 'object') {
    return undefined
  }
  const message = (error.details as { message?: unknown }).message
  if (!message || typeof message !== 'object') return undefined
  return (message as { conflict?: Schedule }).conflict
}

export const useScheduleStore = defineStore('schedules', () => {
  const schedules = ref<Schedule[]>([])
  const activeSchedules = computed(() => schedules.value.filter((item) => item.status === 'normal'))
  const storedSchedules = computed(() => schedules.value.filter((item) => item.status === 'stored'))
  const stats = computed(() => {
    const todayDate = dayjs().format('YYYY-MM-DD')
    return {
      customerCount: useCustomerStore().customers.length,
      todayCount: activeSchedules.value.filter((item) => item.date === todayDate).length,
      monthCount: activeSchedules.value.filter((item) => dayjs(item.date).isSame(dayjs(), 'month'))
        .length,
    }
  })

  const load = async () => {
    schedules.value = (await scheduleApi.list()).map(normalizeSchedule)
  }

  const getConflict = (payload: ScheduleRequest, excludeId?: string) =>
    schedules.value.find((item) => {
      if (excludeId && item.id === excludeId) return false
      if (item.date !== payload.date) return false
      return isTimeOverlap(item.startTime, item.endTime, payload.startTime, payload.endTime)
    })

  const addSchedule = async (payload: ScheduleRequest) => {
    let schedulePayload: ScheduleRequest = { ...payload }
    if (!schedulePayload.customerId && schedulePayload.temporaryCustomer) {
      const customer = await useCustomerStore().findOrCreateTemporary(
        schedulePayload.temporaryCustomer,
        schedulePayload.temporaryCustomer.type || useCatalogStore().customerTypes[0]?.code,
        schedulePayload,
      )
      schedulePayload = {
        ...schedulePayload,
        customerId: customer.id,
        temporaryCustomer: undefined,
      }
    }

    try {
      const item = normalizeSchedule(await scheduleApi.create(schedulePayload))
      schedules.value.unshift(item)
      return { ok: true as const, item }
    } catch (error) {
      const conflict = getApiConflict(error) ?? getConflict(schedulePayload)
      if (conflict) return { ok: false as const, conflict }
      throw error
    }
  }

  const updateSchedule = async (id: string, payload: Partial<ScheduleRequest>) => {
    try {
      const item = normalizeSchedule(await scheduleApi.update(id, payload))
      const index = schedules.value.findIndex((current) => current.id === id)
      if (index >= 0) schedules.value[index] = item
      return { ok: true as const, item }
    } catch (error) {
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
        if (conflict) return { ok: false as const, conflict }
      }

      const apiConflict = getApiConflict(error)
      if (apiConflict) return { ok: false as const, conflict: apiConflict }
      throw error
    }
  }

  const completeSchedule = async (id: string) => {
    const item = normalizeSchedule(await scheduleApi.complete(id))
    const index = schedules.value.findIndex((current) => current.id === id)
    if (index >= 0) schedules.value[index] = item
    return item
  }

  const deleteSchedule = async (id: string) => {
    await scheduleApi.remove(id)
    schedules.value = schedules.value.filter((item) => item.id !== id)
  }

  const refreshHistory = (month?: string, type?: string) => scheduleApi.history(month, type)
  const getScheduleById = (id: string) => schedules.value.find((item) => item.id === id)

  const updateCustomerLocation = (customerId: string, location: string) => {
    schedules.value = schedules.value.map((item) =>
      item.customerId === customerId ? { ...item, location } : item,
    )
  }
  const removeByCustomerId = (customerId: string) => {
    schedules.value = schedules.value.filter((item) => item.customerId !== customerId)
  }
  const reset = () => {
    schedules.value = []
  }

  return {
    schedules,
    activeSchedules,
    storedSchedules,
    stats,
    load,
    reset,
    addSchedule,
    updateSchedule,
    completeSchedule,
    deleteSchedule,
    refreshHistory,
    getScheduleById,
    getConflict,
    updateCustomerLocation,
    removeByCustomerId,
  }
})
