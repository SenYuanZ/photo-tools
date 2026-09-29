import dayjs from 'dayjs'

export type HomeTab = 'today' | 'tomorrow' | 'future' | 'stored'
export type HomeScheduleTransition = 'stored' | 'restored'

const homeTabs: HomeTab[] = ['today', 'tomorrow', 'future', 'stored']

export const parseHomeTab = (value: unknown): HomeTab | undefined =>
  typeof value === 'string' && homeTabs.includes(value as HomeTab) ? (value as HomeTab) : undefined

export const getHomeTabForDate = (
  date: string,
  today = dayjs().format('YYYY-MM-DD'),
): Exclude<HomeTab, 'stored'> => {
  if (date === today) return 'today'
  if (date === dayjs(today).add(1, 'day').format('YYYY-MM-DD')) return 'tomorrow'
  return 'future'
}

export const getHomeTransitionFeedback = (transition: unknown, tab: HomeTab): string => {
  if (transition === 'stored') return '订单已暂存，已移至暂存订单。'
  if (transition !== 'restored') return ''

  const targetLabel = tab === 'today' ? '今日排单' : tab === 'tomorrow' ? '明日排单' : '未来排单'
  return `订单已恢复，已移至${targetLabel}。`
}
