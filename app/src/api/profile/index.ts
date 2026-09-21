import { request } from '@/api/core/client'
import { uploadImage } from '@/api/core/upload'
import type {
  ProfileData,
  ProfileRolesData,
  UpdateProfileRequest,
  UpdateProfileRolesRequest,
} from '@/api/profile/types'

export const profileApi = {
  get() {
    return request<ProfileData>('/profile')
  },
  update(payload: UpdateProfileRequest) {
    return request<ProfileData>('/profile', { method: 'PATCH', body: payload })
  },
  getRoles() {
    return request<ProfileRolesData>('/profile/roles')
  },
  updateRoles(payload: UpdateProfileRolesRequest) {
    return request<ProfileRolesData>('/profile/roles', { method: 'PATCH', body: payload })
  },
  uploadPortfolioImage(file: File, onProgress?: (percent: number) => void) {
    return uploadImage({ path: '/profile/portfolio-images', file, onProgress })
  },
}
