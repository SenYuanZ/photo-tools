import { storage } from '@/utils/storage'

const TOKEN_KEY = 'photo_order_token'

let unauthorizedHandler: (() => void | Promise<void>) | undefined
let handlingUnauthorized = false

export const getToken = (): string => storage.get(TOKEN_KEY)
export const setToken = (token: string): void => storage.set(TOKEN_KEY, token)
export const clearToken = (): void => storage.remove(TOKEN_KEY)

export const setUnauthorizedHandler = (handler: () => void | Promise<void>): void => {
  unauthorizedHandler = handler
}

export const notifyUnauthorized = (): void => {
  if (!unauthorizedHandler || handlingUnauthorized) return

  handlingUnauthorized = true
  Promise.resolve(unauthorizedHandler()).finally(() => {
    handlingUnauthorized = false
  })
}
