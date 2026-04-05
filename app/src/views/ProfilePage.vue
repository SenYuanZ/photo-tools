<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Button, Cell, CellGroup, Field, Switch, Uploader, showImagePreview } from 'vant'
import type { UploaderFileListItem } from 'vant'
import { profileApi } from '../api/app'
import PageHeader from '../components/PageHeader.vue'
import { useAppStore } from '../stores/app'

type UploadItem = UploaderFileListItem & {
  uploadedUrl?: string
}

const store = useAppStore()
const router = useRouter()

const saving = ref(false)
const uploadingAvatar = ref(false)
const uploadingPortfolio = ref(false)
const feedback = ref('')
const feedbackType = ref<'success' | 'error'>('success')

const form = reactive({
  nickname: '',
  avatarUrl: '',
  bio: '',
  portfolioPublic: false,
})

const avatarFileList = ref<UploadItem[]>([])
const portfolioFileList = ref<UploadItem[]>([])

const failedPortfolioUploads = computed(() =>
  portfolioFileList.value.filter((item) => item.status === 'failed' && item.file),
)

const feedbackClass = computed(() => (feedbackType.value === 'error' ? 'text-rose-500' : 'text-blue-500'))

const setFeedback = (type: 'success' | 'error', message: string) => {
  feedbackType.value = type
  feedback.value = message
}

watch(
  () => store.profile,
  (profile) => {
    if (!profile) {
      return
    }

    form.nickname = profile.nickname || ''
    form.avatarUrl = profile.avatarUrl || ''
    form.bio = profile.bio || ''
    form.portfolioPublic = Boolean(profile.portfolioPublic)

    avatarFileList.value = form.avatarUrl
      ? [
          {
            url: form.avatarUrl,
            uploadedUrl: form.avatarUrl,
            status: 'done',
            message: '',
          },
        ]
      : []

    portfolioFileList.value = (profile.portfolioImages || []).map((url) => ({
      url,
      uploadedUrl: url,
      status: 'done',
      message: '',
    }))
  },
  { immediate: true },
)

const uploadSingle = async (item: UploadItem) => {
  const file = item.file
  if (!(file instanceof File)) {
    return
  }

  item.status = 'uploading'
  item.message = '0%'

  const result = await profileApi.uploadPortfolioImage(file, (percent) => {
    item.message = `${percent}%`
  })

  item.uploadedUrl = result.url
  item.url = result.thumbnail
  item.status = 'done'
  item.message = ''
  delete item.file
}

const onAfterReadAvatar = async (value: UploaderFileListItem | UploaderFileListItem[]) => {
  const items = (Array.isArray(value) ? value : [value]) as UploadItem[]
  const [item] = items
  if (!item) {
    return
  }

  uploadingAvatar.value = true
  try {
    await uploadSingle(item)
    form.avatarUrl = item.uploadedUrl || item.url || ''
    avatarFileList.value = [item]
  } catch (error) {
    item.status = 'failed'
    item.message = (error as Error).message || '上传失败'
    setFeedback('error', item.message)
  } finally {
    uploadingAvatar.value = false
  }
}

const onAfterReadPortfolio = async (value: UploaderFileListItem | UploaderFileListItem[]) => {
  const items = (Array.isArray(value) ? value : [value]) as UploadItem[]
  uploadingPortfolio.value = true
  try {
    await Promise.all(
      items.map(async (item) => {
        try {
          await uploadSingle(item)
        } catch (error) {
          item.status = 'failed'
          item.message = (error as Error).message || '上传失败'
        }
      }),
    )
  } finally {
    uploadingPortfolio.value = false
  }
}

const retryPortfolioUpload = async (item: UploadItem) => {
  uploadingPortfolio.value = true
  try {
    await uploadSingle(item)
  } catch (error) {
    item.status = 'failed'
    item.message = (error as Error).message || '上传失败'
    setFeedback('error', item.message)
  } finally {
    uploadingPortfolio.value = false
  }
}

const previewPortfolio = (index = 0) => {
  const images = portfolioFileList.value
    .map((item) => item.uploadedUrl || item.url)
    .filter(Boolean) as string[]

  if (!images.length) {
    return
  }

  showImagePreview({
    images,
    startPosition: index,
  })
}

const saveProfile = async () => {
  feedback.value = ''

  if (!form.nickname.trim()) {
    setFeedback('error', '请输入昵称')
    return
  }

  if (uploadingAvatar.value || uploadingPortfolio.value) {
    setFeedback('error', '图片仍在上传中，请稍后保存')
    return
  }

  saving.value = true
  try {
    await store.updateProfile({
      nickname: form.nickname.trim(),
      avatarUrl: form.avatarUrl.trim(),
      bio: form.bio.trim(),
      portfolioPublic: form.portfolioPublic,
      portfolioImages: portfolioFileList.value
        .map((item) => item.uploadedUrl || item.url)
        .filter(Boolean) as string[],
    })
    setFeedback('success', '个人资料已更新')
  } catch (error) {
    setFeedback('error', (error as Error).message || '保存失败，请稍后重试')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <section class="bounce-in">
    <PageHeader title="个人资料与作品集" back @back="router.back()" />

    <article class="card mb-3 p-3 soft-blue">
      <p class="mb-2 text-sm font-extrabold"><i class="fa-solid fa-id-card mr-1 text-blue-500" />账号信息</p>
      <CellGroup inset>
        <Field v-model="form.nickname" label="昵称" placeholder="请输入昵称" clearable />
        <Field
          v-model="form.bio"
          label="个人简介"
          type="textarea"
          rows="3"
          autosize
          placeholder="介绍你的风格、擅长领域和服务特点"
        />
        <Cell title="公开作品集到模特端" center>
          <template #right-icon>
            <Switch v-model="form.portfolioPublic" size="20" />
          </template>
        </Cell>
      </CellGroup>

      <div class="mt-3">
        <p class="mb-2 text-xs font-bold text-slate-500">头像上传</p>
        <Uploader
          v-model="avatarFileList"
          :max-count="1"
          :after-read="onAfterReadAvatar"
          :deletable="!uploadingAvatar"
          :disabled="uploadingAvatar"
          preview-size="84"
          upload-text="上传头像"
        />
      </div>
    </article>

    <article class="card mb-3 p-3 soft-pink">
      <div class="mb-2 flex items-center justify-between">
        <p class="text-sm font-extrabold"><i class="fa-regular fa-image mr-1 text-rose-500" />作品集</p>
        <button class="chip" type="button" @click="previewPortfolio(0)">预览全部</button>
      </div>

      <Uploader
        v-model="portfolioFileList"
        :max-count="12"
        multiple
        :after-read="onAfterReadPortfolio"
        :deletable="!uploadingPortfolio"
        :disabled="uploadingPortfolio"
        preview-size="72"
        upload-text="上传作品图"
      />

      <p class="mt-2 text-xs text-slate-500">建议上传你常用风格的代表作品，方便后续展示与沟通。</p>
      <p class="mt-1 text-xs" :class="form.portfolioPublic ? 'text-blue-500' : 'text-slate-400'">
        {{ form.portfolioPublic ? '当前已开启：模特端可查看你的作品集。' : '当前未开启：作品集仅自己可见。' }}
      </p>

      <div v-if="failedPortfolioUploads.length" class="mt-2 space-y-1">
        <div
          v-for="item in failedPortfolioUploads"
          :key="item.url || item.file?.name"
          class="flex items-center justify-between text-xs text-amber-700"
        >
          <span>有图片上传失败，可重试</span>
          <Button size="small" round plain type="primary" :disabled="uploadingPortfolio" @click="retryPortfolioUpload(item)">
            重试
          </Button>
        </div>
      </div>
    </article>

    <p v-if="feedback" class="mb-2 text-xs" :class="feedbackClass">{{ feedback }}</p>

    <Button block round type="primary" :loading="saving" @click="saveProfile">
      <i class="fa-solid fa-floppy-disk mr-1" />保存个人资料
    </Button>
  </section>
</template>
