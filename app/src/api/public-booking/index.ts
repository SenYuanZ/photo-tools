import { request } from '@/api/core/client'
import { uploadImage } from '@/api/core/upload'
import type { CustomerTypeItem } from '@/api/customer-types/types'
import type { ServiceTypeItem } from '@/api/service-types/types'
import type {
  CreatePublicBookingResponse,
  PublicAvailability,
  PublicBookingRequest,
  PublicOrderQuery,
  PublicOrderQueryResponse,
  PublicProvider,
} from '@/api/public-booking/types'

export const publicBookingApi = {
  listProviders(serviceTypeCode?: string, roleCode?: string) {
    return request<PublicProvider[]>('/public/providers', {
      query: { serviceTypeCode, roleCode },
      skipAuth: true,
    })
  },
  listPhotographers() {
    return this.listProviders('photography')
  },
  listServiceTypes() {
    return request<ServiceTypeItem[]>('/public/service-types', { skipAuth: true })
  },
  listCustomerTypes() {
    return request<CustomerTypeItem[]>('/public/customer-types', { skipAuth: true })
  },
  getAvailability(providerId: string, date: string, serviceTypeCode?: string) {
    return request<PublicAvailability>('/public/availability', {
      query: { providerId, date, serviceTypeCode },
      skipAuth: true,
    })
  },
  create(payload: PublicBookingRequest) {
    return request<CreatePublicBookingResponse>('/public/bookings', {
      method: 'POST',
      body: payload,
      skipAuth: true,
    })
  },
  queryOrders(params: PublicOrderQuery) {
    return request<PublicOrderQueryResponse>('/public/orders', {
      query: {
        bookingGroupId: params.bookingGroupId,
        modelPhone: params.modelPhone,
        modelName: params.modelName,
      },
      skipAuth: true,
    })
  },
  uploadReferenceImage(file: File, onProgress?: (percent: number) => void) {
    return uploadImage({
      path: '/public/reference-images',
      file,
      skipAuth: true,
      onProgress,
    })
  },
}
