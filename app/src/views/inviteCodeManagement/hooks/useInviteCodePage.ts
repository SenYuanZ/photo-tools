import dayjs from 'dayjs'
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import { inviteCodeApi } from '@/api/invite-codes'
import type { InviteCodeItem } from '@/api/invite-codes/types'
import { getErrorMessage } from '@/utils/error'

export const useInviteCodePage = () => {
  const router = useRouter()
  const loading = ref(false)
  const creating = ref(false)
  const editing = ref(false)
  const showCreatePopup = ref(false)
  const showEditPopup = ref(false)
  const list = ref<InviteCodeItem[]>([])
  const createForm = reactive({ code: '', isActive: true, maxUses: '', expiresAt: '', note: '' })
  const editForm = reactive({
    id: '',
    code: '',
    isActive: true,
    maxUses: '',
    expiresAt: '',
    note: '',
    usedCount: 0,
  })
  const listView = computed(() =>
    list.value.map((item) => ({
      ...item,
      isActive: Boolean(item.isActive),
      usedText:
        item.maxUses === null
          ? `已用 ${item.usedCount} 次 / 不限次数`
          : `已用 ${item.usedCount} 次 / 剩余 ${Math.max(0, item.maxUses - item.usedCount)} 次`,
      expiresText: item.expiresAt ? dayjs(item.expiresAt).format('YYYY-MM-DD HH:mm') : '永不过期',
    })),
  )

  const loadList = async () => {
    loading.value = true
    try {
      list.value = (await inviteCodeApi.list()).map((item) => ({
        ...item,
        isActive: Boolean(item.isActive),
      }))
    } finally {
      loading.value = false
    }
  }
  onMounted(() => void loadList())

  const openCreate = () => {
    Object.assign(createForm, {
      code: '',
      isActive: true,
      maxUses: '',
      expiresAt: '',
      note: '',
    })
    showCreatePopup.value = true
  }
  const openEdit = (item: InviteCodeItem) => {
    Object.assign(editForm, {
      id: item.id,
      code: item.code,
      isActive: Boolean(item.isActive),
      maxUses: item.maxUses === null ? '' : String(item.maxUses),
      expiresAt: item.expiresAt ? dayjs(item.expiresAt).format('YYYY-MM-DDTHH:mm') : '',
      note: item.note || '',
      usedCount: item.usedCount,
    })
    showEditPopup.value = true
  }
  const createInviteCode = async () => {
    if (!createForm.code.trim()) {
      showToast('请输入邀请码')
      return
    }
    creating.value = true
    try {
      await inviteCodeApi.create({
        code: createForm.code.trim().toUpperCase(),
        isActive: createForm.isActive,
        maxUses: createForm.maxUses === '' ? null : Number(createForm.maxUses),
        expiresAt: createForm.expiresAt ? new Date(createForm.expiresAt).toISOString() : null,
        note: createForm.note.trim(),
      })
      showCreatePopup.value = false
      await loadList()
      showToast('邀请码已创建')
    } catch (error) {
      showToast(getErrorMessage(error, '创建失败'))
    } finally {
      creating.value = false
    }
  }
  const updateInviteCode = async () => {
    if (!editForm.id) return
    if (!editForm.code.trim()) {
      showToast('邀请码不能为空')
      return
    }
    if (editForm.maxUses !== '' && Number(editForm.maxUses) < editForm.usedCount) {
      showToast(`最大次数不能小于已使用次数（${editForm.usedCount}）`)
      return
    }
    editing.value = true
    try {
      await inviteCodeApi.update(editForm.id, {
        code: editForm.code.trim().toUpperCase(),
        isActive: editForm.isActive,
        maxUses: editForm.maxUses === '' ? null : Number(editForm.maxUses),
        expiresAt: editForm.expiresAt ? new Date(editForm.expiresAt).toISOString() : null,
        note: editForm.note.trim(),
      })
      showEditPopup.value = false
      await loadList()
      showToast('邀请码已更新')
    } catch (error) {
      showToast(getErrorMessage(error, '更新失败'))
    } finally {
      editing.value = false
    }
  }
  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code)
      showToast('邀请码已复制')
    } catch {
      showToast('复制失败，请手动复制')
    }
  }

  return {
    router,
    loading,
    creating,
    editing,
    showCreatePopup,
    showEditPopup,
    createForm,
    editForm,
    listView,
    openCreate,
    openEdit,
    createInviteCode,
    updateInviteCode,
    copyCode,
  }
}
