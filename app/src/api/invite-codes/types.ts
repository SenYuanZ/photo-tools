export interface InviteCodeItem {
  id: string
  code: string
  isActive: boolean | number
  maxUses: number | null
  usedCount: number
  remainingUses: number | null
  expiresAt: string | null
  note: string
  createdAt: string
  updatedAt: string
}

export interface CreateInviteCodeRequest {
  code: string
  isActive?: boolean
  maxUses?: number | null
  expiresAt?: string | null
  note?: string
}

export type UpdateInviteCodeRequest = Partial<
  Pick<CreateInviteCodeRequest, 'code' | 'isActive' | 'maxUses' | 'expiresAt' | 'note'>
>
