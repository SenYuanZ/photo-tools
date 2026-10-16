import { computed, nextTick, reactive, shallowRef, watch, type Ref } from 'vue'
import type {
  ModelBookingAiBriefForm,
  ServiceDraft,
  AvailabilityState,
} from '@/views/modelBooking/types'
import { fitsRange } from '@/views/modelBooking/utils/availability'

interface StepsOptions {
  form: {
    date: string
    location: string
    customerTypeCode: string
    aiBrief: ModelBookingAiBriefForm
  }
  activeServices: Ref<Array<{ code: string; name: string }>>
  serviceDrafts: Record<string, ServiceDraft>
  availabilityByService: Record<string, AvailabilityState>
  error: Ref<string>
}

export function useBookingSteps(options: StepsOptions) {
  const step = shallowRef(0)
  const locationMode = shallowRef('待商议')
  const locationText = shallowRef('')
  const preferenceSelections = reactive<
    Record<'styles' | 'outfits' | 'poses' | 'avoids', string[]>
  >({ styles: [], outfits: [], poses: [], avoids: [] })
  const preferenceGroups = [
    {
      key: 'styles' as const,
      title: '画面风格',
      options: [
        '亮调',
        '暗调',
        '特效合成',
        '清新自然',
        '电影氛围',
        '甜酷个性',
        '复古胶片',
        '角色还原',
        '由摄影师建议',
      ],
    },
    {
      key: 'outfits' as const,
      title: '服装与造型',
      options: ['自备服装', '需要妆造', '自带道具', '需要造型建议'],
    },
    {
      key: 'poses' as const,
      title: '画面与动作',
      options: ['自然抓拍', '半身特写', '全身构图', '动态画面', '需要动作引导'],
    },
    {
      key: 'avoids' as const,
      title: '不希望出现',
      options: ['过度磨皮', '夸张动作', '亲密互动', '过度曝光'],
    },
  ]
  watch([locationMode, locationText], () => {
    options.form.location = locationMode.value === '待商议' ? '待商议' : locationText.value.trim()
  })
  const preferenceBrief = computed(() => ({
    workName: [options.form.aiBrief.workName, ...preferenceSelections.styles]
      .filter(Boolean)
      .join('、'),
    outfit: [options.form.aiBrief.outfit, ...preferenceSelections.outfits]
      .filter(Boolean)
      .join('、'),
    visualGoal: [options.form.aiBrief.visualGoal, ...preferenceSelections.poses]
      .filter(Boolean)
      .join('、'),
    avoid: [options.form.aiBrief.avoid, ...preferenceSelections.avoids].filter(Boolean).join('、'),
  }))
  const preferenceSummary = computed(
    () => Object.values(preferenceBrief.value).filter(Boolean).join('；') || '暂无特别偏好',
  )
  const togglePreference = (key: keyof typeof preferenceSelections, value: string) => {
    const selected = preferenceSelections[key]
    preferenceSelections[key] = selected.includes(value)
      ? selected.filter((item) => item !== value)
      : [...selected, value]
  }
  const navigateStep = async (target: number) => {
    options.error.value = ''
    let next = Math.max(0, Math.min(3, target))
    if (
      next > 0 &&
      (!options.form.date || !options.form.location.trim() || !options.form.customerTypeCode)
    ) {
      next = 0
      options.error.value = '请选择日期、客户类型，并填写地点或选择待商议。'
    } else if (next > 1) {
      const invalid = options.activeServices.value.find(({ code }) => {
        const draft = options.serviceDrafts[code]
        const availability = options.availabilityByService[code]
        return (
          !draft?.providerId ||
          !availability ||
          availability.loading ||
          availability.error ||
          availability.lastKey !== `${code}-${draft.providerId}-${options.form.date}` ||
          !fitsRange(availability.freeRanges, draft.startTime, draft.durationMinutes)
        )
      })
      if (invalid) {
        next = 1
        options.error.value = '请先选择服务者，等待档期加载后确认可约时间。'
      }
    }
    step.value = next
    await nextTick()
    document.querySelector<HTMLElement>('.bk-step-title')?.focus({ preventScroll: true })
    window.scrollTo({ top: 0, behavior: 'instant' })
  }
  return {
    step,
    locationMode,
    locationText,
    preferenceSelections,
    preferenceGroups,
    preferenceBrief,
    preferenceSummary,
    togglePreference,
    navigateStep,
  }
}
