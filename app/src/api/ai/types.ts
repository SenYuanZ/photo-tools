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
