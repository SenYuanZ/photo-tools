import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { customerTypeApi } from '@/api/customer-types'
import type { CustomerTypeItem } from '@/api/customer-types/types'
import type { Customer } from '@/api/customers/types'
import { rolesApi } from '@/api/roles'
import type { RoleItem } from '@/api/roles/types'
import type { Schedule } from '@/api/schedules/types'
import { serviceTypeApi } from '@/api/service-types'
import type { ServiceTypeItem } from '@/api/service-types/types'

export const useCatalogStore = defineStore('catalog', () => {
  const customerTypes = ref<CustomerTypeItem[]>([])
  const serviceTypes = ref<ServiceTypeItem[]>([])
  const roles = ref<RoleItem[]>([])

  const customerTypeMap = computed(
    () => new Map(customerTypes.value.map((item) => [item.code, item.name])),
  )
  const serviceTypeMap = computed(
    () => new Map(serviceTypes.value.map((item) => [item.code, item.name])),
  )
  const roleMap = computed(() => new Map(roles.value.map((item) => [item.code, item.name])))

  const load = async (customers: Customer[], schedules: Schedule[]) => {
    const rolesPromise = rolesApi.list()
    const customerTypesPromise = customerTypeApi.list().catch(() => {
      const fallbackCodes = [...new Set(customers.map((item) => item.type).filter(Boolean))]
      return fallbackCodes.map((code, index) => ({
        id: `fallback-${code}`,
        code,
        name: code,
        sortOrder: (index + 1) * 10,
        isActive: true,
      }))
    })
    const serviceTypesPromise = serviceTypeApi.list().catch(() => {
      const fallbackCodes = [
        ...new Set(schedules.map((item) => item.serviceTypeCode).filter(Boolean)),
      ]
      return (fallbackCodes.length ? fallbackCodes : ['photography']).map((code, index) => ({
        id: `fallback-${code}`,
        code,
        name: code,
        sortOrder: (index + 1) * 10,
        isActive: true,
      }))
    })

    const [roleData, customerTypeData, serviceTypeData] = await Promise.all([
      rolesPromise,
      customerTypesPromise,
      serviceTypesPromise,
    ])
    roles.value = roleData
    customerTypes.value = customerTypeData
    serviceTypes.value = serviceTypeData
  }

  const getCustomerTypeName = (code: string) => {
    if (!code) return '未设置'
    return customerTypeMap.value.get(code) || code
  }
  const getServiceTypeName = (code: string) => serviceTypeMap.value.get(code) || code
  const getRoleName = (code: string) => roleMap.value.get(code) || code

  const reset = () => {
    customerTypes.value = []
    serviceTypes.value = []
    roles.value = []
  }

  return {
    customerTypes,
    serviceTypes,
    roles,
    load,
    reset,
    getCustomerTypeName,
    getServiceTypeName,
    getRoleName,
  }
})
