import type { ReminderType, ThemeName } from '@/types/common'

export interface SettingsData {
  id: number
  userId: string
  theme: ThemeName
  defaultReminders: ReminderType[]
  backupEnabled: boolean
}

export type UpdateSettingsRequest = Partial<
  Pick<SettingsData, 'theme' | 'defaultReminders' | 'backupEnabled'>
>
