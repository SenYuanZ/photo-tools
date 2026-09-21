import type { Customer } from '@/api/customers/types'
import type { ProfileData } from '@/api/profile/types'
import type { Schedule } from '@/api/schedules/types'
import type { ScheduleStatus, UserRole } from '@/types/common'

export const normalizeCustomer = (item: Customer): Customer => {
  const rawFlag = (item as unknown as { isLongTerm?: unknown }).isLongTerm
  return {
    ...item,
    isLongTerm: !(rawFlag === false || rawFlag === 0 || rawFlag === '0'),
  }
}

export const normalizeSchedule = (item: Schedule): Schedule => ({
  ...item,
  serviceTypeCode: item.serviceTypeCode || 'photography',
  serviceRoleCodes: item.serviceRoleCodes || [],
  bookingGroupId: item.bookingGroupId ?? null,
  serviceMeta: item.serviceMeta ?? null,
  referenceImages: item.referenceImages || [],
  status: ((item as Schedule & { status?: ScheduleStatus }).status ?? 'normal') as ScheduleStatus,
})

export const normalizeProfile = (profile: ProfileData, fallbackRole: UserRole): ProfileData => ({
  ...profile,
  roles: profile.roles?.length ? profile.roles : [profile.role || fallbackRole],
  avatarUrl: profile.avatarUrl || '',
  bio: profile.bio || '',
  portfolioImages: profile.portfolioImages || [],
  portfolioPublic: Boolean(profile.portfolioPublic),
})
