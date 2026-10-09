import { createApp, type Component } from 'vue'
import { getActivePinia } from 'pinia'

// Capture before lifecycle tests enable fake timers.
const realSetTimeout = globalThis.setTimeout

export function mount(component: Component) {
  const element = document.createElement('div')
  const app = createApp(component)
  const pinia = getActivePinia()
  if (pinia) app.use(pinia)
  app.mount(element)
  return { text: () => element.textContent ?? '', unmount: () => app.unmount() }
}

export const flushPromises = () => new Promise<void>((resolve) => realSetTimeout(resolve, 0))
