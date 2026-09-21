import { request } from '@/api/core/client'
import type { CustomerTypeItem } from '@/api/customer-types/types'

export const customerTypeApi = {
  list() {
    return request<CustomerTypeItem[]>('/customer-types')
  },
}
