type ErrorPayload = {
  message?: unknown
  error?: unknown
  statusCode?: unknown
}

const resolveNestedMessage = (value: unknown): string | undefined => {
  if (typeof value === 'string') return value
  if (Array.isArray(value)) return value.map(String).join('，')
  if (value && typeof value === 'object' && 'message' in value) {
    return resolveNestedMessage((value as { message?: unknown }).message)
  }
  return undefined
}

export const resolveApiErrorMessage = (payload: unknown, fallback = '请求失败'): string => {
  if (!payload || typeof payload !== 'object') return fallback
  return resolveNestedMessage((payload as ErrorPayload).message) ?? fallback
}

export class ApiError extends Error {
  readonly status: number
  readonly details: unknown

  constructor(status: number, message: string, details?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.details = details
  }
}
