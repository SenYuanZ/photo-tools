import { getToken } from '@/api/core/auth'
import { request } from '@/api/core/client'
import { API_BASE_URL } from '@/api/core/config'
import { AI_API_BASE_URL } from '@/api/core/config'
import type {
  KnowledgeChunk,
  KnowledgeDocumentDetail,
  KnowledgeListResponse,
  KnowledgeSource,
  StreamChatHandlers,
  SceneStreamHandlers,
  SceneSource,
  SceneType,
  ShootPlanResult,
} from '@/api/ai/types'

export type {
  KnowledgeChunk,
  KnowledgeDocument,
  KnowledgeDocumentDetail,
  KnowledgeListResponse,
  KnowledgeSource,
  StreamChatHandlers,
  SceneStreamHandlers,
  SceneAdviceItem,
  SceneSource,
  SceneType,
  ShootPlanResult,
} from '@/api/ai/types'

const aiRequest = <T>(path: string): Promise<T> =>
  request<T>(path, { baseUrl: AI_API_BASE_URL, skipAuth: true })

export const listKnowledgeDocuments = () => aiRequest<KnowledgeListResponse>('/knowledge/list')

export const getKnowledgeChunks = (source: string) =>
  request<{ chunks: KnowledgeChunk[] }>('/knowledge/chunks', {
    baseUrl: AI_API_BASE_URL,
    skipAuth: true,
    query: { source },
  })

export const getKnowledgeDocument = (source: string) =>
  request<KnowledgeDocumentDetail>('/knowledge/document', {
    baseUrl: AI_API_BASE_URL,
    skipAuth: true,
    query: { source },
  })

export const streamChat = async (
  sessionId: string,
  question: string,
  handlers: StreamChatHandlers,
  signal?: AbortSignal,
): Promise<void> => {
  const response = await fetch(`${AI_API_BASE_URL}/chat/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, question }),
    signal,
  })

  if (!response.ok || !response.body) {
    throw new Error(`问答服务连接失败（${response.status}）`)
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  const handleLine = async (line: string) => {
    if (!line.startsWith('data: ')) return
    try {
      const event = JSON.parse(line.slice(6)) as {
        type?: string
        token?: string
        fullResponse?: string
        sources?: KnowledgeSource[]
        error?: string
      }
      if (event.type === 'token') await handlers.onToken(event.token || '')
      if (event.type === 'done') {
        await handlers.onDone(event.fullResponse || '', event.sources || [])
      }
      if (event.type === 'error') await handlers.onError(event.error || '问答服务返回错误')
    } catch {
      // Malformed or incomplete SSE frames are ignored until the next complete event.
    }
  }

  while (true) {
    const { done, value } = await reader.read()
    buffer += decoder.decode(value || new Uint8Array(), { stream: !done })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''
    for (const line of lines) await handleLine(line)
    if (done) break
  }
}

export const streamScene = async (
  scheduleId: string,
  scene: SceneType,
  handlers: SceneStreamHandlers,
  signal?: AbortSignal,
): Promise<void> => {
  const token = getToken()
  const response = await fetch(`${API_BASE_URL}/ai/scene/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ scheduleId, scene }),
    signal,
  })

  if (!response.ok || !response.body) {
    let message = `场景生成服务连接失败（${response.status}）`
    try {
      const payload = (await response.json()) as { message?: string }
      if (payload.message) message = payload.message
    } catch {
      // Keep the status-based fallback when the server did not return JSON.
    }
    throw new Error(message)
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  const handleLine = async (line: string) => {
    if (!line.startsWith('data: ')) return
    try {
      const event = JSON.parse(line.slice(6)) as {
        type?: string
        token?: string
        result?: ShootPlanResult
        sources?: SceneSource[]
        warnings?: string[]
        error?: string
      }
      if (event.type === 'token') await handlers.onToken(event.token || '')
      if (event.type === 'done') {
        await handlers.onDone(event.result || {}, event.sources || [], event.warnings || [])
      }
      if (event.type === 'error') await handlers.onError(event.error || '拍摄方案生成失败')
    } catch {
      // Ignore incomplete or malformed SSE frames until the next complete frame.
    }
  }

  while (true) {
    const { done, value } = await reader.read()
    buffer += decoder.decode(value || new Uint8Array(), { stream: !done })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''
    for (const line of lines) await handleLine(line)
    if (done) break
  }
}
