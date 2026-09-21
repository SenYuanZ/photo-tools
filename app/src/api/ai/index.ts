import { request } from '@/api/core/client'
import { AI_API_BASE_URL } from '@/api/core/config'
import type {
  KnowledgeChunk,
  KnowledgeDocumentDetail,
  KnowledgeListResponse,
  KnowledgeSource,
  StreamChatHandlers,
} from '@/api/ai/types'

export type {
  KnowledgeChunk,
  KnowledgeDocument,
  KnowledgeDocumentDetail,
  KnowledgeListResponse,
  KnowledgeSource,
  StreamChatHandlers,
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
