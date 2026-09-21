import { request } from '@/api/core/client'
import type { ServiceTypeItem } from '@/api/service-types/types'

export const serviceTypeApi = {
  list() {
    return request<ServiceTypeItem[]>('/service-types')
  },
}
