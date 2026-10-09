import { getToken, notifyUnauthorized } from '@/api/core/auth'
import { API_BASE_URL } from '@/api/core/config'
import { ApiError, resolveApiErrorMessage } from '@/api/core/error'
import { buildQuery, type QueryParams } from '@/api/core/query'

export type RequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown
  query?: QueryParams
  skipAuth?: boolean
  baseUrl?: string
}

const parseResponse = async (response: Response): Promise<unknown> => {
  if (response.status === 204) return undefined

  const contentType = response.headers.get('content-type') || ''
  if (contentType.includes('application/json')) return response.json()

  const text = await response.text()
  return text || undefined
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, query, skipAuth = false, baseUrl = API_BASE_URL, ...init } = options
  const isFormData = body instanceof FormData
  const headers = new Headers(init.headers || {})
  const token = skipAuth ? null : getToken()

  if (body !== undefined && !isFormData) headers.set('Content-Type', 'application/json')
  if (!skipAuth) {
    if (token) headers.set('Authorization', `Bearer ${token}`)
  }

  const response = await fetch(`${baseUrl}${path}${buildQuery(query)}`, {
    ...init,
    headers,
    body: body === undefined ? undefined : isFormData ? body : JSON.stringify(body),
  })
  const data = await parseResponse(response)

  if (!response.ok) {
    // A late response from an old account must not sign out the new session.
    if (response.status === 401 && !skipAuth && !init.signal?.aborted && token === getToken())
      notifyUnauthorized()
    throw new ApiError(response.status, resolveApiErrorMessage(data), data)
  }

  return data as T
}
