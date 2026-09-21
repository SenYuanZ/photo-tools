export const storage = {
  get(key: string, fallback = ''): string {
    return localStorage.getItem(key) ?? fallback
  },
  set(key: string, value: string): void {
    localStorage.setItem(key, value)
  },
  remove(key: string): void {
    localStorage.removeItem(key)
  },
  getJson<T>(key: string, fallback: T): T {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback

    try {
      return JSON.parse(raw) as T
    } catch {
      return fallback
    }
  },
  setJson(key: string, value: unknown): void {
    localStorage.setItem(key, JSON.stringify(value))
  },
}
