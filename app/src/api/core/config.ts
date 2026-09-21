export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '')
export const AI_API_BASE_URL = (
  import.meta.env.VITE_AI_API_BASE_URL || 'http://localhost:3001'
).replace(/\/$/, '')
