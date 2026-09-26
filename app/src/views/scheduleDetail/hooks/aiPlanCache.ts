import type { SavedShootPlan, ShootPlanResult } from '@/api/ai'

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === 'object' && !Array.isArray(value))

const isShootPlanResult = (value: unknown): value is ShootPlanResult => {
  if (!isRecord(value)) return false
  if (value.format === 'markdown') return typeof value.markdown === 'string'
  if (value.format === 'structured') return isRecord(value.sections)
  return Boolean(
    typeof value.title === 'string' ||
    typeof value.summary === 'string' ||
    isRecord(value.sections) ||
    typeof value.markdown === 'string',
  )
}

export const readSavedShootPlan = (serviceMeta: unknown): SavedShootPlan | null => {
  if (!isRecord(serviceMeta) || !isRecord(serviceMeta.aiPlan)) return null

  const cached = serviceMeta.aiPlan
  if (cached.scene !== 'shoot_plan' || !isShootPlanResult(cached.result)) return null

  return {
    scene: 'shoot_plan',
    generatedAt: typeof cached.generatedAt === 'string' ? cached.generatedAt : undefined,
    result: cached.result,
  }
}

export const formatSavedShootPlanTime = (value?: string) => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}
