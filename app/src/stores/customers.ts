import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { customerApi } from '@/api/customers'
import type { Customer, CustomerRequest } from '@/api/customers/types'
import { normalizeCustomer } from '@/utils/normalizers'
import { useScheduleStore } from '@/stores/schedules'

const mergeCustomer = (list: Customer[], item: Customer) => {
  const index = list.findIndex((current) => current.id === item.id)
  if (index >= 0) {
    list[index] = item
    return
  }
  list.unshift(item)
}

export const useCustomerStore = defineStore('customers', () => {
  const customers = ref<Customer[]>([])
  const customerMap = computed(() => new Map(customers.value.map((item) => [item.id, item])))

  const load = async () => {
    customers.value = (await customerApi.list()).map(normalizeCustomer)
  }

  const addCustomer = async (payload: CustomerRequest) => {
    const item = normalizeCustomer(await customerApi.create(payload))
    customers.value.unshift(item)
    return item
  }

  const updateCustomer = async (id: string, payload: Partial<CustomerRequest>) => {
    const item = normalizeCustomer(await customerApi.update(id, payload))
    mergeCustomer(customers.value, item)
    if (payload.location) useScheduleStore().updateCustomerLocation(id, payload.location)
    return item
  }

  const deleteCustomer = async (id: string) => {
    await customerApi.remove(id)
    customers.value = customers.value.filter((item) => item.id !== id)
    useScheduleStore().removeByCustomerId(id)
  }

  const findOrCreateTemporary = async (
    temporary: NonNullable<import('@/api/schedules/types').ScheduleRequest['temporaryCustomer']>,
    fallbackType: string | undefined,
    scheduleContext: Pick<
      import('@/api/schedules/types').ScheduleRequest,
      'note' | 'depositStatus' | 'location'
    >,
  ) => {
    const phone = temporary.phone.trim()
    const existing = customers.value.find((item) => item.phone === phone)
    if (existing) return existing
    if (!fallbackType) throw new Error('请先在数据库中配置可用的客户类型')

    try {
      const created = normalizeCustomer(
        await customerApi.create({
          name: temporary.name.trim(),
          phone,
          isLongTerm: false,
          type: temporary.type || fallbackType,
          style: '',
          hobby: '',
          specialNeed: scheduleContext.note || '',
          depositStatus: scheduleContext.depositStatus,
          tailPaymentDate: '',
          outfit: '',
          location: scheduleContext.location,
          companions: '',
          tags: ['临时客户'],
        }),
      )
      mergeCustomer(customers.value, created)
      return created
    } catch (error) {
      if (!(error instanceof Error) || !error.message.includes('已存在')) throw error
      const matched = (await customerApi.list(phone))
        .map(normalizeCustomer)
        .find((item) => item.phone === phone)
      if (!matched) throw error
      mergeCustomer(customers.value, matched)
      return matched
    }
  }

  const getCustomerById = (id: string) => customerMap.value.get(id)
  const reset = () => {
    customers.value = []
  }

  return {
    customers,
    load,
    reset,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    findOrCreateTemporary,
    getCustomerById,
  }
})
