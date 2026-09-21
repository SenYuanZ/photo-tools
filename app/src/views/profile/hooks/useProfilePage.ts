import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { showImagePreview } from 'vant'
import type { UploaderFileListItem } from 'vant'
import { profileApi } from '@/api/profile'
import { useUploadQueue, type UploadItem } from '@/hooks/useUploadQueue'
import { useAuthStore } from '@/stores/auth'

export function useProfilePage() {
  const authStore = useAuthStore()
  const router = useRouter()

  const saving = ref(false)
  const savingRoles = ref(false)
  const feedback = ref('')
  const feedbackType = ref<'success' | 'error'>('success')

  const availableRoles = ref<Array<{ code: string; name: string }>>([])
  const selectedRoles = ref<Array<{ code: string; name: string; isPrimary: boolean }>>([])
  const addRoleCode = ref('')

  const form = reactive({
    nickname: '',
    avatarUrl: '',
    bio: '',
    portfolioPublic: false,
  })

  const avatarFileList = ref<UploadItem[]>([])
  const portfolioFileList = ref<UploadItem[]>([])

  const feedbackClass = computed(() =>
    feedbackType.value === 'error' ? 'text-rose-500' : 'text-blue-500',
  )

  const setFeedback = (type: 'success' | 'error', message: string) => {
    feedbackType.value = type
    feedback.value = message
  }

  const avatarUploadQueue = useUploadQueue({
    items: avatarFileList,
    upload: profileApi.uploadPortfolioImage,
    onError: (message) => setFeedback('error', message),
  })
  const portfolioUploadQueue = useUploadQueue({
    items: portfolioFileList,
    upload: profileApi.uploadPortfolioImage,
    onError: (message) => setFeedback('error', message),
  })
  const uploadingAvatar = avatarUploadQueue.uploading
  const uploadingPortfolio = portfolioUploadQueue.uploading
  const failedPortfolioUploads = portfolioUploadQueue.failedItems

  watch(
    () => authStore.profile,
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

  const onAfterReadAvatar = async (value: UploaderFileListItem | UploaderFileListItem[]) => {
    const items = await avatarUploadQueue.uploadItems(value)
    const [item] = items
    if (item?.status === 'done') {
      form.avatarUrl = item.uploadedUrl || item.url || ''
      avatarFileList.value = [item]
    }
  }

  const onAfterReadPortfolio = portfolioUploadQueue.uploadItems
  const retryPortfolioUpload = portfolioUploadQueue.retry

  const previewPortfolio = (index = 0) => {
    const images = portfolioUploadQueue.getUploadedUrls()

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
      await authStore.updateProfile({
        nickname: form.nickname.trim(),
        avatarUrl: form.avatarUrl.trim(),
        bio: form.bio.trim(),
        portfolioPublic: form.portfolioPublic,
        portfolioImages: portfolioUploadQueue.getUploadedUrls(),
      })
      setFeedback('success', '个人资料已更新')
    } catch (error) {
      setFeedback('error', (error as Error).message || '保存失败，请稍后重试')
    } finally {
      saving.value = false
    }
  }

  const selectedRoleCodes = computed(() => selectedRoles.value.map((item) => item.code))

  const loadRoles = async () => {
    const data = await profileApi.getRoles()
    availableRoles.value = data.availableRoles
    selectedRoles.value = data.selectedRoles
    addRoleCode.value = ''
  }

  const removableRoles = computed(() => selectedRoles.value.filter((item) => !item.isPrimary))

  const addableRoles = computed(() =>
    availableRoles.value.filter((item) => !selectedRoleCodes.value.includes(item.code)),
  )

  const setPrimaryRole = (code: string) => {
    selectedRoles.value = selectedRoles.value.map((item) => ({
      ...item,
      isPrimary: item.code === code,
    }))
  }

  const addRole = () => {
    if (!addRoleCode.value) {
      return
    }
    const role = availableRoles.value.find((item) => item.code === addRoleCode.value)
    if (!role) {
      return
    }
    selectedRoles.value.push({
      code: role.code,
      name: role.name,
      isPrimary: false,
    })
    addRoleCode.value = ''
  }

  const removeRole = (code: string) => {
    if (selectedRoles.value.length <= 1) {
      setFeedback('error', '至少保留一个角色')
      return
    }
    const target = selectedRoles.value.find((item) => item.code === code)
    if (target?.isPrimary) {
      setFeedback('error', '请先设置其他主角色后再删除')
      return
    }
    selectedRoles.value = selectedRoles.value.filter((item) => item.code !== code)
  }

  const saveRoles = async () => {
    if (!selectedRoles.value.length) {
      setFeedback('error', '至少保留一个角色')
      return
    }
    const primaryRoleCode =
      selectedRoles.value.find((item) => item.isPrimary)?.code || selectedRoles.value[0].code
    savingRoles.value = true
    try {
      const updated = await profileApi.updateRoles({
        roleCodes: selectedRoles.value.map((item) => item.code),
        primaryRoleCode,
      })
      selectedRoles.value = updated.selectedRoles
      authStore.applyProfileRoles(updated)
      setFeedback('success', '角色设置已更新')
    } catch (error) {
      setFeedback('error', (error as Error).message || '角色更新失败')
    } finally {
      savingRoles.value = false
    }
  }

  onMounted(async () => {
    try {
      await loadRoles()
    } catch (error) {
      setFeedback('error', (error as Error).message || '角色信息加载失败')
    }
  })

  return {
    router,
    saving,
    savingRoles,
    uploadingAvatar,
    uploadingPortfolio,
    feedback,
    selectedRoles,
    addRoleCode,
    form,
    avatarFileList,
    portfolioFileList,
    failedPortfolioUploads,
    feedbackClass,
    onAfterReadAvatar,
    onAfterReadPortfolio,
    retryPortfolioUpload,
    previewPortfolio,
    saveProfile,
    removableRoles,
    addableRoles,
    setPrimaryRole,
    addRole,
    removeRole,
    saveRoles,
  }
}
