import { beforeEach, describe, expect, it, vi } from 'vitest'
import { clearToken, setToken, setUnauthorizedHandler } from '@/api/core/auth'
import { request } from '@/api/core/client'

describe('request', () => {
  beforeEach(() => {
    clearToken()
    vi.restoreAllMocks()
  })

  it('adds query parameters, JSON body and authorization', async () => {
    setToken('token-1')
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    await request('/items', {
      method: 'POST',
      query: { page: 1 },
      body: { name: 'test' },
    })

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/items?page=1')
    expect(new Headers(init.headers).get('Authorization')).toBe('Bearer token-1')
    expect(init.body).toBe('{"name":"test"}')
  })

  it('supports empty 204 responses', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 204 })))
    await expect(request('/empty')).resolves.toBeUndefined()
  })

  it('throws ApiError and invokes the unauthorized handler once', async () => {
    const unauthorized = vi.fn()
    setUnauthorizedHandler(unauthorized)
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ message: '登录已过期' }), {
          status: 401,
          headers: { 'content-type': 'application/json' },
        }),
      ),
    )

    await expect(request('/profile')).rejects.toMatchObject({
      status: 401,
      message: '登录已过期',
    })
    expect(unauthorized).toHaveBeenCalledOnce()
  })
})
