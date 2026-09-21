import { request } from '@/api/core/client'
import type { LoginRequest, LoginResponse, RegisterRequest } from '@/api/auth/types'

export const authApi = {
  login(payload: LoginRequest) {
    return request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: payload,
      skipAuth: true,
    })
  },
  register(payload: RegisterRequest) {
    return request<LoginResponse>('/auth/register', {
      method: 'POST',
      body: payload,
      skipAuth: true,
    })
  },
}
