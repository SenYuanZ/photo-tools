<script setup lang="ts">
import { nextTick, reactive, ref } from 'vue'
import { showFailToast, showSuccessToast } from 'vant'

defineOptions({ name: 'AiQaPage' })
import {
  getKnowledgeChunks,
  getKnowledgeDocument,
  listKnowledgeDocuments,
  streamChat,
  type KnowledgeDocument,
  type KnowledgeSource,
} from '../api/ai'

interface ChatMessage {
  id: number
  role: 'user' | 'assistant'
  text: string
  sources?: KnowledgeSource[]
  loading?: boolean
}

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

function createSessionId() {
  return `sess_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

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
  const assistant = reactive<ChatMessage>({ id: ++messageId, role: 'assistant', text: '', loading: true })
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
    assistant.text = `连接错误：${(error as Error).message || '暂时无法连接问答服务'}`
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
  if (!(target instanceof HTMLImageElement) || !target.classList.contains('generated-image')) return
  previewImage.value = target.currentSrc || target.src
}

const savePreviewImage = () => {
  if (!previewImage.value) return
  const link = document.createElement('a')
  link.href = `${import.meta.env.VITE_API_BASE_URL || '/api'}/ai-image-proxy?url=${encodeURIComponent(previewImage.value)}`
  link.download = `agnes-image-${Date.now()}.png`
  document.body.appendChild(link)
  link.click()
  link.remove()
  showSuccessToast('图片已开始保存')
}

const renderMarkdown = (text: string) => {
  const escaped = text.replace(/[&<>]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[char] || char)
  return escaped
    .replace(/!\[([^\]]*)\]\(((?:https?:\/\/|data:image\/)[^\s)]+)\)/g, '<img class="generated-image" src="$2" alt="$1" loading="eager" decoding="async" fetchpriority="high" style="aspect-ratio:16/9">')
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
    showFailToast((error as Error).message || '知识库加载失败')
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
    showFailToast((error as Error).message || '原文加载失败')
  }
}

const originBadge = (document: KnowledgeDocument): { label: string; cls: string } | null => {
  switch (document.origin) {
    case 'builtin':
      return { label: '内置', cls: 'bg-blue-50 text-blue-600' }
    case 'custom':
      return { label: '自定义', cls: 'bg-emerald-50 text-emerald-600' }
    case 'upload':
      return { label: '上传', cls: 'bg-amber-50 text-amber-600' }
    default:
      return null
  }
}
</script>

<template>
  <section class="ai-page bounce-in">
    <header class="card ai-header">
      <div>
        <p class="ai-kicker"><i class="fa-solid fa-wand-magic-sparkles" /> 摄影灵感小助手</p>
        <h1 class="title-font text-3xl text-rose-500">ai问答</h1>
        <p class="mt-1 text-xs text-slate-500">把拍摄难题交给我，一起拍出更有趣的画面吧</p>
      </div>
      <div class="ai-actions">
        <button type="button" class="ai-action" @click="openKnowledge"><i class="fa-solid fa-book-open" />知识库</button>
        <button type="button" class="ai-action" :disabled="isStreaming" @click="newChat"><i class="fa-solid fa-plus" />新会话</button>
      </div>
    </header>

    <main ref="chatContainer" class="chat-container" @click="openGeneratedImage">
      <div v-if="!messages.length" class="welcome-card card">
        <div class="welcome-icon"><i class="fa-solid fa-camera-retro" /></div>
        <h2 class="title-font text-2xl text-slate-700">你好！我是摄影知识助手</h2>
        <p class="mt-2 text-sm text-slate-500">可以从这些方向开始问我：</p>
        <div class="topic-list">
          <button v-for="topic in topics" :key="topic" type="button" class="topic-tag" @click="useTopic(topic)">{{ topic }}</button>
        </div>
        <p class="text-xs text-slate-400">试试问：“什么是光圈？”或“如何拍摄剪影？”</p>
      </div>

      <article v-for="message in messages" :key="message.id" class="message" :class="`message-${message.role}`">
        <div v-if="message.role === 'assistant'" class="assistant-avatar"><i class="fa-solid fa-camera" /></div>
        <div class="message-bubble" :class="{ 'assistant-bubble': message.role === 'assistant' }">
          <div v-if="message.loading" class="typing-indicator"><i /><i /><i /></div>
          <div v-else-if="message.role === 'assistant'" class="markdown-body" v-html="renderMarkdown(message.text)" />
          <span v-else>{{ message.text }}</span>
          <div v-if="message.sources?.length" class="sources">
            <span><i class="fa-solid fa-book-open" />参考来源</span>
            <button v-for="source in message.sources" :key="source.chunkId || source.source" type="button" class="source-tag" @click="toggleSource(source)">
              {{ source.source }}
            </button>
            <pre v-for="source in message.sources" v-show="expandedSource === source.source" :key="`${source.source}-preview`" class="source-preview">{{ source.text }}</pre>
          </div>
        </div>
      </article>
    </main>

    <footer class="chat-input-area">
      <form class="chat-form" @submit.prevent="submitQuestion">
        <textarea v-model="question" rows="1" placeholder="输入你的摄影问题..." @input="resizeInput" @keydown.enter.exact.prevent="submitQuestion" />
        <button type="submit" :disabled="!question.trim() || isStreaming" aria-label="发送"><i class="fa-solid fa-paper-plane" /></button>
      </form>
      <p>支持多轮对话 · 基于摄影知识库流式回答</p>
    </footer>

    <div v-if="showKnowledge" class="knowledge-overlay" @click.self="showKnowledge = false">
      <section class="knowledge-panel card">
        <header class="knowledge-header">
          <div><h2 class="text-lg font-extrabold">知识库</h2><p class="text-xs text-slate-500">共 {{ knowledgeDocuments.length }} 个文档 · {{ totalChunks }} 个分块 · 仅可查看</p></div>
          <button type="button" class="close-button" aria-label="关闭" @click="showKnowledge = false">×</button>
        </header>

        <div v-if="knowledgeLoading" class="empty-knowledge">正在加载知识库...</div>
        <div v-else-if="!knowledgeDocuments.length" class="empty-knowledge">知识库暂无文档。</div>
        <article v-for="document in knowledgeDocuments" v-else :key="document.source" class="knowledge-item">
          <div class="knowledge-item-top"><div class="min-w-0"><p class="truncate font-bold">{{ document.source }}</p><p class="text-xs text-slate-400">{{ document.category || '未分类' }} · {{ document.chunkCount }} 个分块<span v-if="originBadge(document)" class="ml-1.5 rounded-full px-1.5 py-0.5 align-middle text-[10px] font-semibold" :class="originBadge(document)!.cls">{{ originBadge(document)!.label }}</span></p></div><div class="knowledge-actions"><button type="button" @click="viewDocument(document)">{{ viewingSource === document.source ? '收起' : '查看' }}</button></div></div>
          <div v-if="viewingSource === document.source" class="editor-card soft-blue">
            <pre class="knowledge-viewer">{{ viewingContent }}</pre>
          </div>
        </article>
      </section>
    </div>

    <div v-if="previewImage" class="image-preview-overlay" @click.self="previewImage = ''">
      <section class="image-preview-panel" aria-label="生成图片预览">
        <button type="button" class="close-button image-preview-close" aria-label="关闭预览" @click="previewImage = ''">×</button>
        <img :src="previewImage" alt="生成图片预览" />
        <button type="button" class="image-save-button" @click="savePreviewImage"><i class="fa-solid fa-download" />保存图片</button>
      </section>
    </div>
  </section>
</template>

<style scoped>
.ai-page { display: flex; height: calc(100dvh - 68px - env(safe-area-inset-bottom)); min-height: 0; flex-direction: column; gap: 12px; overflow: hidden; padding-top: 20px; }
.ai-header { display: flex; flex-shrink: 0; align-items: center; justify-content: space-between; gap: 12px; padding: 16px; }
.ai-kicker { margin-bottom: 3px; color: var(--theme-accent-strong); font-size: 12px; font-weight: 800; }
.ai-kicker i { margin-right: 4px; }
.ai-actions { display: flex; flex-shrink: 0; gap: 6px; }
.ai-action, .knowledge-actions button { border: 1px solid var(--theme-accent-soft); border-radius: 10px; background: var(--theme-accent-bg); color: var(--theme-accent-strong); cursor: pointer; font-size: 11px; font-weight: 800; padding: 8px 9px; }
.ai-action i { margin-right: 3px; }
.ai-action:disabled { opacity: .45; }
.chat-container { flex: 1; min-height: 0; overflow-y: auto; overscroll-behavior: contain; padding: 8px 2px 12px; scroll-behavior: smooth; }
.welcome-card { margin: 12px 0; padding: 28px 16px; text-align: center; }
.welcome-icon { display: grid; width: 58px; height: 58px; margin: 0 auto 12px; place-items: center; border-radius: 20px; background: linear-gradient(135deg, #ffe0ed, #fff1c9); color: var(--theme-accent); font-size: 28px; }
.topic-list { display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; margin: 20px auto; max-width: 440px; }
.topic-tag, .source-tag { border: 1px solid var(--theme-accent-soft); border-radius: 999px; background: var(--theme-accent-bg); color: var(--theme-accent-strong); cursor: pointer; font-size: 12px; padding: 6px 11px; }
.message { display: flex; gap: 8px; margin: 0 4px 18px; animation: bounce-in 300ms ease-out; }
.message-user { justify-content: flex-end; }
.message-bubble { max-width: 82%; border-radius: 17px 17px 5px 17px; background: linear-gradient(135deg, #fff0f7, #ffe5f0); padding: 10px 13px; color: #51495f; font-size: 14px; line-height: 1.65; white-space: pre-wrap; word-break: break-word; }
.assistant-avatar { display: grid; width: 30px; height: 30px; flex: 0 0 30px; place-items: center; border-radius: 11px; background: #fff0c7; color: #d89e24; }
.assistant-bubble { max-width: 90%; padding: 3px 2px; background: transparent; }
.markdown-body :deep(p) { margin: 0 0 9px; }
.markdown-body :deep(p:last-child) { margin-bottom: 0; }
.markdown-body :deep(h3), .markdown-body :deep(h4) { margin: 9px 0 4px; color: var(--theme-accent-strong); }
.markdown-body :deep(ul) { margin: 5px 0; padding-left: 20px; }
.markdown-body :deep(code) { border-radius: 5px; background: var(--theme-accent-bg); padding: 2px 5px; color: var(--theme-accent-strong); }
.markdown-body :deep(.generated-image) { display: block; width: min(100%, 520px); margin-top: 8px; border-radius: 14px; box-shadow: 0 8px 18px var(--theme-shadow); cursor: zoom-in; background: linear-gradient(110deg, #eee 8%, #f7f7f7 18%, #eee 33%); background-size: 200% 100%; animation: shimmer 1.4s linear infinite; }
@keyframes shimmer { to { background-position: -200% 0; } }
.typing-indicator { display: flex; gap: 4px; padding: 10px 2px; }
.typing-indicator i { width: 7px; height: 7px; border-radius: 50%; background: var(--theme-accent); animation: typing 1.2s infinite; }
.typing-indicator i:nth-child(2) { animation-delay: .18s; }.typing-indicator i:nth-child(3) { animation-delay: .36s; }
.sources { display: flex; flex-wrap: wrap; align-items: center; gap: 5px; margin-top: 10px; border-top: 1px dashed var(--line); padding-top: 8px; font-size: 11px; color: #8b8195; }
.source-tag { padding: 4px 8px; font-size: 10px; }.source-preview { width: 100%; max-height: 160px; overflow: auto; margin: 2px 0 0; border-radius: 9px; background: #fff; padding: 8px; font-size: 11px; white-space: pre-wrap; }
.chat-input-area { flex-shrink: 0; padding: 8px 0 4px; }.chat-form { display: flex; align-items: flex-end; gap: 8px; border: 1px solid var(--theme-form-border); border-radius: 16px; background: #fff; padding: 7px 7px 7px 12px; box-shadow: 0 7px 15px var(--theme-shadow); }.chat-form:focus-within { border-color: var(--theme-accent); }.chat-form textarea { min-height: 36px; max-height: 120px; flex: 1; resize: none; border: 0; outline: 0; color: var(--ink); font: inherit; font-size: 13px; line-height: 1.5; padding: 7px 0; }.chat-form textarea::placeholder { color: #b0a7b8; }.chat-form button { display: grid; width: 36px; height: 36px; flex: 0 0 36px; place-items: center; border: 0; border-radius: 11px; background: linear-gradient(135deg, var(--theme-accent), var(--theme-accent-strong)); color: #fff; cursor: pointer; }.chat-form button:disabled { background: #e8e6eb; color: #aaa5b0; cursor: not-allowed; }.chat-input-area > p { margin-top: 6px; text-align: center; color: #aaa1b0; font-size: 10px; }
.knowledge-overlay { position: fixed; inset: 0; z-index: 100; display: flex; align-items: flex-end; justify-content: center; background: rgba(63, 59, 79, .3); padding: 12px; }.knowledge-panel { width: min(700px, 100%); max-height: 92vh; overflow-y: auto; padding: 16px; }.knowledge-header, .knowledge-item-top, .editor-actions { display: flex; align-items: center; justify-content: space-between; gap: 8px; }.close-button { border: 0; background: transparent; color: #8d8495; cursor: pointer; font-size: 26px; line-height: 1; }.knowledge-tools { display: flex; gap: 8px; margin: 14px 0; }.btn-primary, .btn-secondary { min-height: 38px; border-radius: 11px; padding: 0 12px; font-size: 12px; font-weight: 800; }.btn-primary { border: 0; background: linear-gradient(135deg, var(--theme-accent), var(--theme-accent-strong)); color: #fff; }.btn-secondary { border: 1px solid var(--theme-accent-soft); background: var(--theme-accent-bg); color: var(--theme-accent-strong); }.btn-primary:disabled { opacity: .45; }.text-entry, .editor-card { margin-bottom: 12px; border-radius: 14px; padding: 12px; }.knowledge-viewer { max-height: 320px; overflow: auto; margin: 0; white-space: pre-wrap; font: inherit; font-size: 12px; line-height: 1.6; color: var(--ink); }.knowledge-item { margin-top: 8px; border: 1px solid var(--line); border-radius: 12px; background: #fff; padding: 11px; }.knowledge-actions { display: flex; gap: 5px; }.knowledge-actions button { padding: 5px 7px; }.empty-knowledge { padding: 22px 8px; text-align: center; color: #9991a0; font-size: 13px; }.editor-actions { margin-top: 10px; }.editor-actions > * { flex: 1; }
.image-preview-overlay { position: fixed; inset: 0; z-index: 110; display: grid; place-items: center; background: rgba(35, 29, 44, .82); padding: 20px; }.image-preview-panel { position: relative; display: flex; width: min(860px, 100%); max-height: calc(100dvh - 40px); flex-direction: column; align-items: center; gap: 12px; }.image-preview-panel img { max-width: 100%; max-height: calc(100dvh - 116px); border-radius: 16px; object-fit: contain; box-shadow: 0 18px 48px rgba(0, 0, 0, .35); }.image-preview-close { position: absolute; right: 0; top: -32px; color: #fff; }.image-save-button { min-height: 40px; border: 0; border-radius: 12px; background: linear-gradient(135deg, var(--theme-accent), var(--theme-accent-strong)); color: #fff; cursor: pointer; font-size: 13px; font-weight: 800; padding: 0 16px; }.image-save-button i { margin-right: 5px; }
@keyframes typing { 0%, 60%, 100% { opacity: .35; transform: translateY(0); } 30% { opacity: 1; transform: translateY(-4px); } }
@media (max-width: 430px) { .ai-page { height: calc(100dvh - 68px - env(safe-area-inset-bottom)); }.ai-header { align-items: flex-start; flex-direction: column; }.ai-actions { width: 100%; }.ai-action { flex: 1; }.message-bubble { max-width: 88%; }.knowledge-tools > * { flex: 1; padding: 0 6px; } }
</style>
