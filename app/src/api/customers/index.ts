import { request } from '@/api/core/client'
import type { Customer, CustomerRequest } from '@/api/customers/types'

export const customerApi = {
  list(keyword?: string) {
    return request<Customer[]>('/customers', { query: { keyword } })
  },
  create(payload: CustomerRequest) {
    return request<Customer>('/customers', { method: 'POST', body: payload })
  },
  update(id: string, payload: Partial<CustomerRequest>) {
    return request<Customer>(`/customers/${id}`, { method: 'PATCH', body: payload })
  },
  remove(id: string) {
    return request<{ success: boolean }>(`/customers/${id}`, { method: 'DELETE' })
  },
}
