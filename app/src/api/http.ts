const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

const TOKEN_KEY = 'photo_order_token'

export const getToken = () => localStorage.getItem(TOKEN_KEY) || ''

export const setToken = (token: string) => {
  localStorage.setItem(TOKEN_KEY, token)
}

export const clearToken = () => {
  localStorage.removeItem(TOKEN_KEY)
}

type RequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown
  skipAuth?: boolean
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const isFormData = options.body instanceof FormData
  const headers = new Headers(options.headers || {})
  if (!isFormData) {
    headers.set('Content-Type', 'application/json')
  }

  if (!options.skipAuth) {
    const token = getToken()
    if (token) {
      headers.set('Authorization', `Bearer ${token}`)
    }
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
    body: options.body ? (isFormData ? (options.body as FormData) : JSON.stringify(options.body)) : undefined,
  })

  const contentType = response.headers.get('content-type') || ''
  const data = contentType.includes('application/json') ? await response.json() : null

  if (!response.ok) {
    const message = data?.message
    const error = new Error('请求失败') as Error & { details?: unknown }
    error.details = data
    if (Array.isArray(message)) {
      error.message = message.join('，')
      throw error
    }
    if (typeof message === 'string') {
      error.message = message
      throw error
    }
    if (typeof message === 'object' && message !== null && 'message' in message) {
      error.message = String((message as { message: string }).message)
      throw error
    }
    throw error
  }

  return data as T
}
