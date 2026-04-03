<script setup lang="ts">
import dayjs from 'dayjs'
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Button, Cell, CellGroup, Field, Popup, Switch, showToast } from 'vant'
import { inviteCodeApi, type InviteCodeItem } from '../api/app'
import PageHeader from '../components/PageHeader.vue'

const router = useRouter()

const loading = ref(false)
const creating = ref(false)
const editing = ref(false)
const showCreatePopup = ref(false)
const showEditPopup = ref(false)

const list = ref<InviteCodeItem[]>([])

const createForm = reactive({
  code: '',
  isActive: true,
  maxUses: '',
  expiresAt: '',
  note: '',
})

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
    list.value = await inviteCodeApi.list()
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  void loadList()
})

const openCreate = () => {
  createForm.code = ''
  createForm.isActive = true
  createForm.maxUses = ''
  createForm.expiresAt = ''
  createForm.note = ''
  showCreatePopup.value = true
}

const openEdit = (item: InviteCodeItem) => {
  editForm.id = item.id
  editForm.code = item.code
  editForm.isActive = item.isActive
  editForm.maxUses = item.maxUses === null ? '' : String(item.maxUses)
  editForm.expiresAt = item.expiresAt ? dayjs(item.expiresAt).format('YYYY-MM-DDTHH:mm') : ''
  editForm.note = item.note || ''
  editForm.usedCount = item.usedCount
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
    showToast((error as Error).message || '创建失败')
  } finally {
    creating.value = false
  }
}

const updateInviteCode = async () => {
  if (!editForm.id) {
    return
  }
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
    showToast((error as Error).message || '更新失败')
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
</script>

<template>
  <section class="bounce-in">
    <PageHeader title="邀请码管理" back @back="router.back()" />

    <article class="card mb-3 p-3 soft-pink">
      <div class="mb-2 flex items-center justify-between">
        <p class="text-sm font-extrabold"><i class="fa-solid fa-ticket mr-1 text-rose-500" />邀请码列表</p>
        <Button size="small" round type="primary" @click="openCreate">新增邀请码</Button>
      </div>
      <p class="text-xs text-slate-600">邀请码支持停用、限次与过期时间管理，注册摄影师时必须填写有效邀请码。</p>
    </article>

    <div v-if="loading" class="card p-3 text-sm text-slate-500">加载中...</div>

    <div v-else class="space-y-2">
      <article v-for="item in listView" :key="item.id" class="card p-3">
        <div class="mb-1 flex items-center justify-between gap-2">
          <p class="font-extrabold tracking-wide text-slate-700">{{ item.code }}</p>
          <span class="chip" :class="item.isActive ? 'border-emerald-200 text-emerald-700' : 'border-slate-200 text-slate-500'">
            {{ item.isActive ? '启用中' : '已停用' }}
          </span>
        </div>
        <p class="text-xs text-slate-500">{{ item.usedText }}</p>
        <p class="text-xs text-slate-500">过期时间：{{ item.expiresText }}</p>
        <p class="text-xs text-slate-500">备注：{{ item.note || '无' }}</p>
        <div class="mt-2 grid grid-cols-2 gap-2">
          <Button size="small" round plain type="primary" @click="copyCode(item.code)">复制</Button>
          <Button size="small" round plain type="primary" @click="openEdit(item)">编辑</Button>
        </div>
      </article>

      <div v-if="!listView.length" class="card p-3 text-sm text-slate-500">暂无邀请码，先创建一个吧。</div>
    </div>

    <Popup v-model:show="showCreatePopup" position="bottom" round>
      <div class="p-4">
        <p class="mb-3 text-sm font-extrabold">新增邀请码</p>
        <CellGroup inset>
          <Field v-model="createForm.code" label="邀请码" placeholder="例如 PHOTO2026" clearable />
          <Field v-model="createForm.maxUses" label="最大次数" type="number" placeholder="留空表示不限" />
          <Field v-model="createForm.expiresAt" label="过期时间" type="datetime-local" placeholder="留空表示不过期" />
          <Field v-model="createForm.note" label="备注" type="textarea" rows="2" autosize placeholder="可选备注" />
          <Cell title="启用状态" center>
            <template #right-icon>
              <Switch v-model="createForm.isActive" size="20" />
            </template>
          </Cell>
        </CellGroup>
        <Button block round type="primary" class="mt-3" :loading="creating" @click="createInviteCode">创建邀请码</Button>
      </div>
    </Popup>

    <Popup v-model:show="showEditPopup" position="bottom" round>
      <div class="p-4">
        <p class="mb-3 text-sm font-extrabold">编辑邀请码</p>
        <CellGroup inset>
          <Field v-model="editForm.code" label="邀请码" placeholder="请输入邀请码" clearable />
          <Field v-model="editForm.maxUses" label="最大次数" type="number" placeholder="留空表示不限" />
          <Field v-model="editForm.expiresAt" label="过期时间" type="datetime-local" placeholder="留空表示不过期" />
          <Field v-model="editForm.note" label="备注" type="textarea" rows="2" autosize placeholder="可选备注" />
          <Cell title="启用状态" center>
            <template #right-icon>
              <Switch v-model="editForm.isActive" size="20" />
            </template>
          </Cell>
        </CellGroup>
        <Button block round type="primary" class="mt-3" :loading="editing" @click="updateInviteCode">保存修改</Button>
      </div>
    </Popup>
  </section>
</template>
