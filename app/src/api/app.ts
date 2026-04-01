import type { Customer, CustomerPayload, LoginPayload, Schedule, SchedulePayload } from '../types/models'
import { getToken, request } from './http'

export interface LoginResponse {
  token: string
  user: {
    id: string
    account: string
    nickname: string
  }
}

export interface DashboardOverview {
  customerCount: number
  todayCount: number
  tomorrowCount: number
  futureCount: number
  monthCount: number
}

export interface SettingsData {
  id: number
  userId: string
  theme: 'pink' | 'blue' | 'yellow'
  defaultReminders: ('1d' | '1h')[]
  backupEnabled: boolean
}

export const authApi = {
  login(payload: LoginPayload) {
    return request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: payload,
      skipAuth: true,
    })
  },
}

export const dashboardApi = {
  overview() {
    return request<DashboardOverview>('/dashboard/overview')
  },
}

export const customerApi = {
  list(keyword?: string) {
    const query = keyword ? `?keyword=${encodeURIComponent(keyword)}` : ''
    return request<Customer[]>(`/customers${query}`)
  },
  create(payload: CustomerPayload) {
    return request<Customer>('/customers', {
      method: 'POST',
      body: payload,
    })
  },
  update(id: string, payload: Partial<CustomerPayload>) {
    return request<Customer>(`/customers/${id}`, {
      method: 'PATCH',
      body: payload,
    })
  },
  remove(id: string) {
    return request<{ success: boolean }>(`/customers/${id}`, {
      method: 'DELETE',
    })
  },
}

export const scheduleApi = {
  list(params?: { tab?: 'today' | 'tomorrow' | 'future'; date?: string }) {
    const search = new URLSearchParams()
    if (params?.tab) {
      search.set('tab', params.tab)
    }
    if (params?.date) {
      search.set('date', params.date)
    }
    const query = search.toString()
    return request<Schedule[]>(`/schedules${query ? `?${query}` : ''}`)
  },
  get(id: string) {
    return request<Schedule & { customer: Customer }>(`/schedules/${id}`)
  },
  create(payload: SchedulePayload) {
    return request<Schedule>('/schedules', {
      method: 'POST',
      body: payload,
    })
  },
  update(id: string, payload: Partial<SchedulePayload>) {
    return request<Schedule>(`/schedules/${id}`, {
      method: 'PATCH',
      body: payload,
    })
  },
  remove(id: string) {
    return request<{ success: boolean }>(`/schedules/${id}`, {
      method: 'DELETE',
    })
  },
  history(month?: string, type?: string) {
    const search = new URLSearchParams()
    if (month) {
      search.set('month', month)
    }
    if (type && type !== 'all') {
      search.set('type', type)
    }
    const query = search.toString()
    return request<(Schedule & { customer: Customer })[]>(`/history${query ? `?${query}` : ''}`)
  },
  uploadReferenceImages(files: File[]) {
    const formData = new FormData()
    files.forEach((file) => {
      formData.append('files', file)
    })
    return request<{ urls: string[]; thumbnails: string[] }>('/schedules/reference-images', {
      method: 'POST',
      body: formData,
    })
  },
  uploadReferenceImage(file: File, onProgress?: (percent: number) => void) {
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:3000/api'
    const token = getToken()

    return new Promise<{ url: string; thumbnail: string }>((resolve, reject) => {
      const formData = new FormData()
      formData.append('files', file)

      const xhr = new XMLHttpRequest()
      xhr.open('POST', `${API_BASE_URL}/schedules/reference-images`, true)
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`)
      }

      xhr.upload.onprogress = (event) => {
        if (!event.lengthComputable || !onProgress) {
          return
        }
        const percent = Math.min(99, Math.max(0, Math.round((event.loaded / event.total) * 100)))
        onProgress(percent)
      }

      xhr.onerror = () => {
        reject(new Error('上传失败，请检查网络后重试'))
      }

      xhr.onload = () => {
        try {
          const payload = xhr.responseText ? JSON.parse(xhr.responseText) : null
          if (xhr.status >= 200 && xhr.status < 300 && payload?.urls?.length) {
            onProgress?.(100)
            resolve({
              url: payload.urls[0],
              thumbnail: payload.thumbnails?.[0] || payload.urls[0],
            })
            return
          }
          reject(new Error(payload?.message || '上传失败'))
        } catch {
          reject(new Error('上传失败'))
        }
      }

      xhr.send(formData)
    })
  },
}

export const settingsApi = {
  get() {
    return request<SettingsData>('/settings')
  },
  update(payload: Partial<Pick<SettingsData, 'theme' | 'defaultReminders' | 'backupEnabled'>>) {
    return request<SettingsData>('/settings', {
      method: 'PATCH',
      body: payload,
    })
  },
}
