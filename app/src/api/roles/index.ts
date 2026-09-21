import { request } from '@/api/core/client'
import type { RoleItem } from '@/api/roles/types'

export const rolesApi = {
  list() {
    return request<RoleItem[]>('/roles')
  },
}
