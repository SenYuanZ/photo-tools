import { ref } from 'vue'

export const normalizeDatePickerValue = (values: string[]): string => {
  const [year, month, day] = values
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export const useDateTimePicker = (date: string, startTime: string, endTime: string) => {
  const selectedDateValues = ref(date.split('-'))
  const selectedStartTimeValues = ref(startTime.split(':'))
  const selectedEndTimeValues = ref(endTime.split(':'))

  const syncDate = (value: string) => {
    selectedDateValues.value = value.split('-')
  }
  const syncStartTime = (value: string) => {
    selectedStartTimeValues.value = value.split(':')
  }
  const syncEndTime = (value: string) => {
    selectedEndTimeValues.value = value.split(':')
  }

  return {
    selectedDateValues,
    selectedStartTimeValues,
    selectedEndTimeValues,
    syncDate,
    syncStartTime,
    syncEndTime,
  }
}
