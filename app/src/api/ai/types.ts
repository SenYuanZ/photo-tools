export interface KnowledgeSource {
  source: string
  category?: string
  chunkId?: string
  text: string
}

export interface KnowledgeDocument {
  source: string
  category?: string
  chunkCount: number
  origin?: 'builtin' | 'custom' | 'upload'
}

export interface KnowledgeListResponse {
  documents: KnowledgeDocument[]
  totalChunks: number
}

export interface KnowledgeDocumentDetail {
  source: string
  category?: string
  content: string
}

export interface KnowledgeChunk {
  text: string
  chunkId?: string
}

export interface StreamChatHandlers {
  onToken: (token: string) => void | Promise<void>
  onDone: (response: string, sources: KnowledgeSource[]) => void | Promise<void>
  onError: (message: string) => void | Promise<void>
}

export type SceneType = 'shoot_plan'

export interface SceneTimelineItem {
  time?: string
  title?: string
  detail?: string
}

export type SceneAdviceItem =
  | string
  | {
      title?: string
      detail?: string
      text?: string
      content?: string
      description?: string
    }

export interface ShootPlanResult {
  title?: string
  summary?: string
  sections?: {
    timeline?: SceneTimelineItem[]
    shooting?: SceneAdviceItem[]
    poses?: SceneAdviceItem[]
    lighting?: SceneAdviceItem[]
    risks?: SceneAdviceItem[]
    questions?: SceneAdviceItem[]
  }
  markdown?: string
  format?: 'structured' | 'markdown'
}

export type SceneSource = KnowledgeSource

export interface SceneStreamHandlers {
  onToken: (token: string) => void | Promise<void>
  onDone: (
    result: ShootPlanResult,
    sources: SceneSource[],
    warnings: string[],
  ) => void | Promise<void>
  onError: (message: string) => void | Promise<void>
}
