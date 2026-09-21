import type { UserRole } from '@/types/common'

export interface LoginRequest {
  account: string
  password: string
}

export interface RegisterRequest {
  account: string
  nickname: string
  password: string
  inviteCode: string
  role?: UserRole
}

export interface LoginResponse {
  token: string
  user: {
    id: string
    account: string
    nickname: string
    role: UserRole
    roles: string[]
  }
}
