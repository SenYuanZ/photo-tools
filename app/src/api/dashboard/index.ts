import { request } from '@/api/core/client'
import type { DashboardOverview } from '@/api/dashboard/types'

export const dashboardApi = {
  overview() {
    return request<DashboardOverview>('/dashboard/overview')
  },
}
