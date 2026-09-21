import { describe, expect, it } from 'vitest'
import { buildQuery } from '@/api/core/query'

describe('buildQuery', () => {
  it('serializes scalar and repeated values while omitting empty values', () => {
    expect(
      buildQuery({
        keyword: '张 三',
        page: 2,
        enabled: false,
        empty: '',
        missing: undefined,
        tags: ['摄影', '', '妆造'],
      }),
    ).toBe(
      '?keyword=%E5%BC%A0+%E4%B8%89&page=2&enabled=false&tags=%E6%91%84%E5%BD%B1&tags=%E5%A6%86%E9%80%A0',
    )
  })

  it('returns an empty suffix when no usable values exist', () => {
    expect(buildQuery({ empty: '', missing: null })).toBe('')
  })
})
