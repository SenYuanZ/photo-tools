import { computed, ref, type ComputedRef } from 'vue'
import { showConfirmDialog, showFailToast, showSuccessToast } from 'vant'
import { streamScene, type SceneAdviceItem, type SceneSource, type ShootPlanResult } from '@/api/ai'
import { scheduleApi } from '@/api/schedules'

export const useScheduleAiAssistant = (
  scheduleId: ComputedRef<string>,
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
  let abortController: AbortController | null = null

  const timeline = computed(() => result.value?.sections?.timeline || [])
  const shooting = computed(() => result.value?.sections?.shooting || [])
  const poses = computed(() => result.value?.sections?.poses || [])
  const lighting = computed(() => result.value?.sections?.lighting || [])
  const risks = computed(() => result.value?.sections?.risks || [])
  const questions = computed(() => result.value?.sections?.questions || [])

  const openAssistant = () => {
    showAssistant.value = true
    if (!result.value && !isGenerating.value) void generate()
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
    rawText.value = ''
    result.value = null
    sources.value = []
    warnings.value = []
    error.value = ''

    try {
      await streamScene(
        scheduleId.value,
        'shoot_plan',
        {
          onToken: (token) => {
            rawText.value += token
          },
          onDone: (nextResult, nextSources, nextWarnings) => {
            result.value = nextResult
            sources.value = nextSources
            warnings.value = nextWarnings
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
      await onSaved()
      showSuccessToast('方案已保存，排单备注已追加摘要')
    } catch (cause) {
      if ((cause as Error).message !== 'cancel') {
        showFailToast((cause as Error).message || '方案保存失败')
      }
    }
  }

  const retry = () => void generate()

  return {
    showAssistant,
    isGenerating,
    rawText,
    result,
    sources,
    warnings,
    error,
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
