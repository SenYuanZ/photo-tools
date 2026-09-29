import { defineStore } from 'pinia'
import { ref } from 'vue'
import { settingsApi } from '@/api/settings'
import type { UpdateSettingsRequest } from '@/api/settings/types'
import type { ReminderType, ThemeName } from '@/types/common'

type SettingsState = {
  theme: ThemeName
  defaultReminders: ReminderType[]
  backupEnabled: boolean
}

export const useSettingsStore = defineStore('settings', () => {
  const theme = ref<ThemeName>('pink')
  const defaultReminders = ref<ReminderType[]>(['1d', '1h'])
  const backupEnabled = ref(true)

  const applySettings = (value?: Partial<SettingsState> | null) => {
    if (!value) return
    if (value.theme) theme.value = value.theme
    if (Array.isArray(value.defaultReminders)) {
      defaultReminders.value = value.defaultReminders
    }
    if (typeof value.backupEnabled === 'boolean') {
      backupEnabled.value = value.backupEnabled
    }
  }

  const load = async () => applySettings(await settingsApi.get())

  const setTheme = async (nextTheme: ThemeName) => {
    const previous = theme.value
    theme.value = nextTheme
    try {
      const response = await settingsApi.update({ theme: nextTheme })
      applySettings({ theme: nextTheme })
      applySettings(response)
    } catch {
      theme.value = previous
      throw new Error('主题保存失败')
    }
  }

  const updateSettings = async (payload: UpdateSettingsRequest) => {
    const response = await settingsApi.update(payload)
    applySettings(payload)
    applySettings(response)
  }

  const reset = () => {
    theme.value = 'pink'
    defaultReminders.value = ['1d', '1h']
    backupEnabled.value = true
  }

  return {
    theme,
    defaultReminders,
    backupEnabled,
    load,
    setTheme,
    updateSettings,
    reset,
  }
})
