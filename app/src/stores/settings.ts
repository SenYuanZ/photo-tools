import { defineStore } from 'pinia'
import { ref } from 'vue'
import { settingsApi } from '@/api/settings'
import type { UpdateSettingsRequest } from '@/api/settings/types'
import type { ReminderType, ThemeName } from '@/types/common'

export const useSettingsStore = defineStore('settings', () => {
  const theme = ref<ThemeName>('pink')
  const defaultReminders = ref<ReminderType[]>(['1d', '1h'])
  const backupEnabled = ref(true)

  const applySettings = (value: {
    theme: ThemeName
    defaultReminders: ReminderType[]
    backupEnabled: boolean
  }) => {
    theme.value = value.theme
    defaultReminders.value = value.defaultReminders
    backupEnabled.value = value.backupEnabled
  }

  const load = async () => applySettings(await settingsApi.get())

  const setTheme = async (nextTheme: ThemeName) => {
    const previous = theme.value
    theme.value = nextTheme
    try {
      applySettings(await settingsApi.update({ theme: nextTheme }))
    } catch {
      theme.value = previous
      throw new Error('主题保存失败')
    }
  }

  const updateSettings = async (payload: UpdateSettingsRequest) => {
    applySettings(await settingsApi.update(payload))
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
