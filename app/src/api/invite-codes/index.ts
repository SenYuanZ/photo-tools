import { request } from '@/api/core/client'
import type {
  CreateInviteCodeRequest,
  InviteCodeItem,
  UpdateInviteCodeRequest,
} from '@/api/invite-codes/types'

export const inviteCodeApi = {
  list() {
    return request<InviteCodeItem[]>('/invite-codes')
  },
  create(payload: CreateInviteCodeRequest) {
    return request<InviteCodeItem>('/invite-codes', { method: 'POST', body: payload })
  },
  update(id: string, payload: UpdateInviteCodeRequest) {
    return request<InviteCodeItem>(`/invite-codes/${id}`, {
      method: 'PATCH',
      body: payload,
    })
  },
}
