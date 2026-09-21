import { inject, provide, type InjectionKey } from 'vue'
import type { useModelBooking } from '@/views/modelBooking/hooks/useModelBooking'

type ModelBookingContext = ReturnType<typeof useModelBooking>

const modelBookingKey: InjectionKey<ModelBookingContext> = Symbol('model-booking')

export function provideModelBooking(context: ModelBookingContext) {
  provide(modelBookingKey, context)
}

export function useModelBookingContext() {
  const context = inject(modelBookingKey)
  if (!context) {
    throw new Error('Model booking components must be rendered inside the model booking page.')
  }
  return context
}
