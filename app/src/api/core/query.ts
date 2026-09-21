export type QueryValue = string | number | boolean | null | undefined
export type QueryParams = Record<string, QueryValue | QueryValue[]>

export const buildQuery = (params?: QueryParams): string => {
  if (!params) return ''

  const search = new URLSearchParams()
  Object.entries(params).forEach(([key, rawValue]) => {
    const values = Array.isArray(rawValue) ? rawValue : [rawValue]
    values.forEach((value) => {
      if (value === null || value === undefined || value === '') return
      search.append(key, String(value))
    })
  })

  const query = search.toString()
  return query ? `?${query}` : ''
}
