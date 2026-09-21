import { nextTick, reactive, ref } from 'vue'
import { showFailToast, showSuccessToast } from 'vant'
import {
  getKnowledgeChunks,
  getKnowledgeDocument,
  listKnowledgeDocuments,
  streamChat,
  type KnowledgeDocument,
  type KnowledgeSource,
} from '@/api/ai'
import { API_BASE_URL } from '@/api/core/config'
import { getErrorMessage } from '@/utils/error'

interface ChatMessage {
  id: number
  role: 'user' | 'assistant'
  text: string
  sources?: KnowledgeSource[]
  loading?: boolean
}

const createSessionId = () => `sess_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`

export const useAiQaPage = () => {
  const topics = ['曝光三要素', '构图技巧', '布光方法', '镜头选择', '后期调色', '实战场景']
  const messages = ref<ChatMessage[]>([])
  const question = ref('')
  const isStreaming = ref(false)
  const showKnowledge = ref(false)
  const knowledgeLoading = ref(false)
  const knowledgeDocuments = ref<KnowledgeDocument[]>([])
  const totalChunks = ref(0)
  const expandedSource = ref('')
  const viewingSource = ref('')
  const viewingContent = ref('')
  const chatContainer = ref<HTMLElement | null>(null)
  const previewImage = ref('')
  let messageId = 0
  let sessionId = createSessionId()

  const scrollToBottom = async () => {
    await nextTick()
    if (chatContainer.value) chatContainer.value.scrollTop = chatContainer.value.scrollHeight
  }
  const newChat = () => {
    if (isStreaming.value) return
    messages.value = []
    sessionId = createSessionId()
    question.value = ''
  }
  const submitQuestion = async () => {
    const text = question.value.trim()
    if (!text || isStreaming.value) return
    messages.value.push({ id: ++messageId, role: 'user', text })
    question.value = ''
    const assistant = reactive<ChatMessage>({
      id: ++messageId,
      role: 'assistant',
      text: '',
      loading: true,
    })
    messages.value.push(assistant)
    isStreaming.value = true
    await scrollToBottom()

    try {
      await streamChat(sessionId, text, {
        onToken: async (token) => {
          assistant.loading = false
          assistant.text += token
          await scrollToBottom()
        },
        onDone: async (response, sources) => {
          assistant.loading = false
          assistant.text = response || assistant.text
          assistant.sources = sources
          await scrollToBottom()
        },
        onError: (message) => {
          assistant.loading = false
          assistant.text = `连接错误：${message}`
        },
      })
    } catch (error) {
      assistant.loading = false
      assistant.text = `连接错误：${getErrorMessage(error, '暂时无法连接问答服务')}`
    } finally {
      isStreaming.value = false
      await scrollToBottom()
    }
  }
  const useTopic = (topic: string) => {
    question.value = `请介绍一下${topic}，并给出实拍建议。`
  }
  const resizeInput = (event: Event) => {
    const input = event.target as HTMLTextAreaElement
    input.style.height = 'auto'
    input.style.height = `${Math.min(input.scrollHeight, 120)}px`
  }
  const openGeneratedImage = (event: MouseEvent) => {
    const target = event.target
    if (!(target instanceof HTMLImageElement) || !target.classList.contains('generated-image'))
      return
    previewImage.value = target.currentSrc || target.src
  }
  const savePreviewImage = () => {
    if (!previewImage.value) return
    const link = document.createElement('a')
    link.href = `${API_BASE_URL}/ai-image-proxy?url=${encodeURIComponent(previewImage.value)}`
    link.download = `agnes-image-${Date.now()}.png`
    document.body.appendChild(link)
    link.click()
    link.remove()
    showSuccessToast('图片已开始保存')
  }
  const renderMarkdown = (text: string) => {
    const escaped = text.replace(
      /[&<>]/g,
      (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[char] || char,
    )
    return escaped
      .replace(
        /!\[([^\]]*)\]\(((?:https?:\/\/|data:image\/)[^\s)]+)\)/g,
        '<img class="generated-image" src="$2" alt="$1" loading="eager" decoding="async" fetchpriority="high" style="aspect-ratio:16/9">',
      )
      .replace(/^### (.+)$/gm, '<h4>$1</h4>')
      .replace(/^## (.+)$/gm, '<h3>$1</h3>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/^- (.+)$/gm, '<li>$1</li>')
      .replace(/((?:<li>.*<\/li>\n?)+)/g, '<ul>$1</ul>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>')
      .replace(/^/, '<p>')
      .concat('</p>')
  }
  const loadKnowledge = async () => {
    knowledgeLoading.value = true
    try {
      const data = await listKnowledgeDocuments()
      knowledgeDocuments.value = data.documents || []
      totalChunks.value = data.totalChunks || 0
    } catch (error) {
      showFailToast(getErrorMessage(error, '知识库加载失败'))
    } finally {
      knowledgeLoading.value = false
    }
  }
  const openKnowledge = async () => {
    showKnowledge.value = true
    await loadKnowledge()
  }
  const toggleSource = async (source: KnowledgeSource) => {
    expandedSource.value = expandedSource.value === source.source ? '' : source.source
    if (expandedSource.value === source.source && !source.text) {
      try {
        const data = await getKnowledgeChunks(source.source)
        source.text = data.chunks.map((chunk) => chunk.text).join('\n\n')
      } catch {
        showFailToast('引用内容加载失败')
      }
    }
  }
  const viewDocument = async (document: KnowledgeDocument) => {
    if (viewingSource.value === document.source) {
      viewingSource.value = ''
      viewingContent.value = ''
      return
    }
    try {
      const data = await getKnowledgeDocument(document.source)
      viewingSource.value = data.source
      viewingContent.value = data.content
    } catch (error) {
      showFailToast(getErrorMessage(error, '原文加载失败'))
    }
  }
  const originBadge = (document: KnowledgeDocument): { label: string; cls: string } | null => {
    if (document.origin === 'builtin') return { label: '内置', cls: 'bg-blue-50 text-blue-600' }
    if (document.origin === 'custom')
      return { label: '自定义', cls: 'bg-emerald-50 text-emerald-600' }
    if (document.origin === 'upload') return { label: '上传', cls: 'bg-amber-50 text-amber-600' }
    return null
  }

  return {
    topics,
    messages,
    question,
    isStreaming,
    showKnowledge,
    knowledgeLoading,
    knowledgeDocuments,
    totalChunks,
    expandedSource,
    viewingSource,
    viewingContent,
    chatContainer,
    previewImage,
    newChat,
    submitQuestion,
    useTopic,
    resizeInput,
    openGeneratedImage,
    savePreviewImage,
    renderMarkdown,
    openKnowledge,
    toggleSource,
    viewDocument,
    originBadge,
  }
}
