const AI_API_BASE_URL = (import.meta.env.VITE_AI_API_BASE_URL || 'http://localhost:3001').replace(/\/$/, '')

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

const aiRequest = async <T>(path: string, options: RequestInit = {}): Promise<T> => {
  const response = await fetch(`${AI_API_BASE_URL}${path}`, options)
  const contentType = response.headers.get('content-type') || ''
  const data = contentType.includes('application/json') ? await response.json() : null

  if (!response.ok) {
    const message = data?.message
    throw new Error(typeof message === 'string' ? message : `请求失败（${response.status}）`)
  }

  return data as T
}

export const listKnowledgeDocuments = () => aiRequest<KnowledgeListResponse>('/knowledge/list')

export const getKnowledgeChunks = (source: string) =>
  aiRequest<{ chunks: KnowledgeChunk[] }>(`/knowledge/chunks?source=${encodeURIComponent(source)}`)

export const getKnowledgeDocument = (source: string) =>
  aiRequest<KnowledgeDocumentDetail>(`/knowledge/document?source=${encodeURIComponent(source)}`)

export const saveKnowledgeDocument = (source: string, content: string, category?: string) =>
  aiRequest(`/knowledge/document?source=${encodeURIComponent(source)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content, ...(category ? { category } : {}) }),
  })

export const deleteKnowledgeDocument = (source: string) =>
  aiRequest(`/knowledge/document/${encodeURIComponent(source)}`, { method: 'DELETE' })

export const uploadKnowledgeDocument = (file: File) => {
  const body = new FormData()
  body.append('file', file)
  return aiRequest('/knowledge/upload', { method: 'POST', body })
}

export const addKnowledgeText = (source: string, content: string, category?: string) =>
  aiRequest('/knowledge/text', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ source, content, ...(category ? { category } : {}) }),
  })

export const reindexKnowledge = () => aiRequest('/knowledge/reindex', { method: 'POST' })

export interface StreamChatHandlers {
  onToken: (token: string) => void | Promise<void>
  onDone: (response: string, sources: KnowledgeSource[]) => void | Promise<void>
  onError: (message: string) => void | Promise<void>
}

export const streamChat = async (
  sessionId: string,
  question: string,
  handlers: StreamChatHandlers,
  signal?: AbortSignal,
) => {
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
      if (event.type === 'done') await handlers.onDone(event.fullResponse || '', event.sources || [])
      if (event.type === 'error') await handlers.onError(event.error || '问答服务返回错误')
    } catch {
      // Ignore incomplete or malformed SSE frames.
    }
  }

  while (true) {
    const { done, value } = await reader.read()
    buffer += decoder.decode(value || new Uint8Array(), { stream: !done })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''
    for (const line of lines) {
      await handleLine(line)
    }
    if (done) break
  }
}
