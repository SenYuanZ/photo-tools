import type { UserRole } from '@/types/common'

export interface ProfileData {
  id: string
  account: string
  nickname: string
  role: UserRole
  roles: string[]
  avatarUrl: string
  bio: string
  portfolioImages: string[]
  portfolioPublic: boolean
}

export type UpdateProfileRequest = Partial<
  Pick<ProfileData, 'nickname' | 'avatarUrl' | 'bio' | 'portfolioImages' | 'portfolioPublic'>
>

export interface ProfileRolesData {
  availableRoles: Array<{ code: string; name: string }>
  selectedRoles: Array<{ code: string; name: string; isPrimary: boolean }>
  primaryRoleCode: string
}

export interface UpdateProfileRolesRequest {
  roleCodes: string[]
  primaryRoleCode?: string
}
