import { computed, ref, watch, type ComputedRef } from 'vue'
import { showConfirmDialog, showFailToast, showSuccessToast } from 'vant'
import { streamScene, type SceneAdviceItem, type SceneSource, type ShootPlanResult } from '@/api/ai'
import type { Schedule } from '@/api/schedules/types'
import { scheduleApi } from '@/api/schedules'
import { formatSavedShootPlanTime, readSavedShootPlan } from './aiPlanCache'

export const useScheduleAiAssistant = (
  scheduleId: ComputedRef<string>,
  schedule: ComputedRef<Schedule | undefined>,
  onSaved: () => Promise<void>,
) => {
  const formatAdviceItem = (value: SceneAdviceItem) => {
    if (typeof value === 'string') return value
    const title = value.title || ''
    const detail = value.detail || value.content || value.text || value.description || ''
    return [title, detail].filter(Boolean).join('：') || '待补充'
  }

  const showAssistant = ref(false)
  const isGenerating = ref(false)
  const rawText = ref('')
  const result = ref<ShootPlanResult | null>(null)
  const sources = ref<SceneSource[]>([])
  const warnings = ref<string[]>([])
  const error = ref('')
  const isCached = ref(false)
  const generatedAt = ref('')
  const isPersisted = ref(false)
  let abortController: AbortController | null = null

  const timeline = computed(() => result.value?.sections?.timeline || [])
  const shooting = computed(() => result.value?.sections?.shooting || [])
  const poses = computed(() => result.value?.sections?.poses || [])
  const lighting = computed(() => result.value?.sections?.lighting || [])
  const risks = computed(() => result.value?.sections?.risks || [])
  const questions = computed(() => result.value?.sections?.questions || [])

  const resetResult = () => {
    rawText.value = ''
    result.value = null
    sources.value = []
    warnings.value = []
    error.value = ''
    isCached.value = false
    generatedAt.value = ''
    isPersisted.value = false
  }

  const loadCachedResult = () => {
    const cached = readSavedShootPlan(schedule.value?.serviceMeta)
    if (!cached) return false

    result.value = cached.result
    rawText.value = ''
    sources.value = []
    warnings.value = []
    error.value = ''
    isCached.value = true
    generatedAt.value = cached.generatedAt || ''
    isPersisted.value = true
    return true
  }

  const openAssistant = () => {
    showAssistant.value = true
    if (isGenerating.value) return
    if (result.value && isPersisted.value) {
      if (!isCached.value) loadCachedResult()
      return
    }
    if (!loadCachedResult()) void generate()
  }

  const closeAssistant = () => {
    if (isGenerating.value) return
    showAssistant.value = false
  }

  const generate = async () => {
    if (!scheduleId.value || isGenerating.value) return
    abortController?.abort()
    abortController = new AbortController()
    isGenerating.value = true
    resetResult()

    try {
      await streamScene(
        scheduleId.value,
        'shoot_plan',
        {
          onToken: (token) => {
            rawText.value += token
          },
          onDone: async (nextResult, nextSources, nextWarnings) => {
            result.value = nextResult
            sources.value = nextSources
            warnings.value = nextWarnings
            try {
              const saved = await scheduleApi.saveAiScene(scheduleId.value, {
                scene: 'shoot_plan',
                result: nextResult,
                saveToNote: false,
              })
              const cached = readSavedShootPlan(saved.serviceMeta)
              isCached.value = false
              generatedAt.value = cached?.generatedAt || new Date().toISOString()
              isPersisted.value = true
              try {
                await onSaved()
              } catch {
                // The plan is already persisted; a list refresh is only a UI convenience.
              }
            } catch {
              warnings.value = [
                ...warnings.value,
                '方案已生成，但缓存保存失败；下次打开时可能需要重新生成。',
              ]
            }
          },
          onError: (message) => {
            error.value = message
          },
        },
        abortController.signal,
      )
    } catch (cause) {
      if ((cause as Error).name !== 'AbortError') {
        error.value = (cause as Error).message || '拍摄方案生成失败'
      }
    } finally {
      isGenerating.value = false
      abortController = null
    }
  }

  const stop = () => {
    abortController?.abort()
    isGenerating.value = false
  }

  const renderText = () => {
    const current = result.value
    if (!current) return rawText.value
    if (current.format === 'markdown') return current.markdown || rawText.value
    const lines = [current.title || 'AI 拍摄方案', current.summary || '']
    if (timeline.value.length) {
      lines.push('时间安排：')
      timeline.value.forEach((item) => {
        lines.push(`- ${item.time || ''} ${item.title || ''} ${item.detail || ''}`.trim())
      })
    }
    for (const [label, values] of [
      ['怎么拍', shooting.value],
      ['通用动作参考', poses.value],
      ['打光思路', lighting.value],
      ['风险提醒', risks.value],
      ['待确认事项', questions.value],
    ] as const) {
      if (!values.length) continue
      lines.push(`${label}：`, ...values.map((value) => `- ${formatAdviceItem(value)}`))
    }
    return lines.filter(Boolean).join('\n')
  }

  const copyResult = async () => {
    const text = renderText()
    if (!text) return
    try {
      await navigator.clipboard.writeText(text)
      showSuccessToast('方案已复制')
    } catch {
      showFailToast('复制失败，请手动复制')
    }
  }

  const saveResult = async () => {
    if (!result.value || !scheduleId.value) return
    try {
      await showConfirmDialog({
        title: '保存拍摄方案',
        message: '方案将追加到排单备注，并保存为最近一次 AI 方案。是否继续？',
        confirmButtonText: '确认保存',
        cancelButtonText: '取消',
      })
      await scheduleApi.saveAiScene(scheduleId.value, {
        scene: 'shoot_plan',
        result: result.value,
        saveToNote: true,
      })
      isPersisted.value = true
      await onSaved()
      showSuccessToast('方案已保存，排单备注已追加摘要')
    } catch (cause) {
      if ((cause as Error).message !== 'cancel') {
        showFailToast((cause as Error).message || '方案保存失败')
      }
    }
  }

  const retry = () => void generate()

  watch(scheduleId, () => {
    abortController?.abort()
    isGenerating.value = false
    resetResult()
  })

  return {
    showAssistant,
    isGenerating,
    rawText,
    result,
    sources,
    warnings,
    error,
    isCached,
    generatedAt,
    generatedAtText: computed(() => formatSavedShootPlanTime(generatedAt.value)),
    timeline,
    shooting,
    poses,
    lighting,
    risks,
    questions,
    openAssistant,
    closeAssistant,
    generate,
    stop,
    copyResult,
    saveResult,
    retry,
    renderText,
    formatAdviceItem,
  }
}
