export const useLatestRequest = () => {
  let sequence = 0

  const begin = (): number => {
    sequence += 1
    return sequence
  }
  const isLatest = (requestId: number): boolean => requestId === sequence
  const invalidate = (): void => {
    sequence += 1
  }

  return { begin, isLatest, invalidate }
}

export const useKeyedLatestRequest = () => {
  const sequences = new Map<string, number>()

  const begin = (key: string): number => {
    const next = (sequences.get(key) || 0) + 1
    sequences.set(key, next)
    return next
  }
  const isLatest = (key: string, requestId: number): boolean => sequences.get(key) === requestId
  const invalidate = (key: string): void => {
    sequences.set(key, (sequences.get(key) || 0) + 1)
  }

  return { begin, isLatest, invalidate }
}
