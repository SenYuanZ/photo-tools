import { describe, expect, it } from 'vitest'
import { ApiError, resolveApiErrorMessage } from '@/api/core/error'

describe('API errors', () => {
  it.each([
    [{ message: '无权限' }, '无权限'],
    [{ message: ['字段一错误', '字段二错误'] }, '字段一错误，字段二错误'],
    [{ message: { message: '排单冲突' } }, '排单冲突'],
    [{ error: 'ignored' }, '请求失败'],
  ])('normalizes NestJS error payloads', (payload, expected) => {
    expect(resolveApiErrorMessage(payload)).toBe(expected)
  })

  it('retains status and raw response details', () => {
    const details = { statusCode: 409, message: { conflict: { id: 'schedule-1' } } }
    const error = new ApiError(409, '排单冲突', details)
    expect(error.status).toBe(409)
    expect(error.details).toBe(details)
  })
})
