import { request } from '@/api/core/client'
import { uploadImage } from '@/api/core/upload'
import type {
  Schedule,
  ScheduleDetail,
  ScheduleListQuery,
  ScheduleRequest,
} from '@/api/schedules/types'

export const scheduleApi = {
  list(params?: ScheduleListQuery) {
    return request<Schedule[]>('/schedules', {
      query: { tab: params?.tab, date: params?.date },
    })
  },
  get(id: string) {
    return request<ScheduleDetail>(`/schedules/${id}`)
  },
  create(payload: ScheduleRequest) {
    return request<Schedule>('/schedules', { method: 'POST', body: payload })
  },
  update(id: string, payload: Partial<ScheduleRequest>) {
    return request<Schedule>(`/schedules/${id}`, { method: 'PATCH', body: payload })
  },
  complete(id: string) {
    return request<Schedule>(`/schedules/${id}/complete`, { method: 'POST' })
  },
  remove(id: string) {
    return request<{ success: boolean }>(`/schedules/${id}`, { method: 'DELETE' })
  },
  history(month?: string, type?: string) {
    return request<ScheduleDetail[]>('/history', {
      query: { month, type: type === 'all' ? undefined : type },
    })
  },
  uploadReferenceImages(files: File[]) {
    const formData = new FormData()
    files.forEach((file) => formData.append('files', file))
    return request<{ urls: string[]; thumbnails: string[] }>('/schedules/reference-images', {
      method: 'POST',
      body: formData,
    })
  },
  uploadReferenceImage(file: File, onProgress?: (percent: number) => void) {
    return uploadImage({ path: '/schedules/reference-images', file, onProgress })
  },
}
