import { computed, onBeforeUnmount, onMounted, shallowRef } from 'vue'
import { useRouter } from 'vue-router'
import QRCode from 'qrcode'
import { showImagePreview, showToast } from 'vant'
import { profileApi } from '@/api/profile'
import { publicBookingApi } from '@/api/public-booking'
import type { PublicProvider } from '@/api/public-booking/types'
import { rolesApi } from '@/api/roles'
import { ApiError } from '@/api/core/error'
import { buildProviderBookingLink } from '@/utils/bookingLink'
import { copyText } from '@/utils/clipboard'

export function useMyBookingCode() {
  const router = useRouter()
  const provider = shallowRef<PublicProvider | null>(null)
  const qrImage = shallowRef('')
  const bookingLink = shallowRef('')
  const loading = shallowRef(false)
  const error = shallowRef('')
  const manualCopy = shallowRef(false)
  const roleNames = shallowRef<Record<string, string>>({})
  const roleLabels = computed(() =>
    (provider.value?.roles || []).map((code) => roleNames.value[code] || code),
  )
  let version = 0

  const load = async () => {
    const request = ++version
    loading.value = true
    error.value = ''
    qrImage.value = ''
    bookingLink.value = ''
    provider.value = null
    manualCopy.value = false
    try {
      const profile = await profileApi.get()
      const [publicProvider, roles] = await Promise.all([
        publicBookingApi.getProvider(profile.id),
        rolesApi.list().catch(() => []),
      ])
      const link = buildProviderBookingLink(router, publicProvider.id)
      const image = await QRCode.toDataURL(link, {
        width: 768,
        margin: 4,
        errorCorrectionLevel: 'M',
        color: { dark: '#000000', light: '#ffffff' },
      })
      if (request !== version) return
      provider.value = publicProvider
      roleNames.value = Object.fromEntries(roles.map((role) => [role.code, role.name]))
      bookingLink.value = link
      qrImage.value = image
    } catch (cause) {
      if (request !== version) return
      error.value =
        cause instanceof ApiError && cause.status === 404
          ? '该服务者暂时无法预约，请检查个人资料。'
          : '预约二维码加载失败，请重试。'
    } finally {
      if (request === version) loading.value = false
    }
  }

  const copyLink = async () => {
    if (!bookingLink.value || loading.value) return
    const copied = await copyText(bookingLink.value)
    manualCopy.value = !copied
    showToast(copied ? '专属预约链接已复制' : '请长按下方链接手动复制')
  }

  const saveQr = () => {
    if (!qrImage.value || loading.value) return
    if (/MicroMessenger|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
      showImagePreview({ images: [qrImage.value], showIndex: false, closeable: true })
      showToast('请长按二维码图片保存')
      return
    }
    const anchor = document.createElement('a')
    anchor.href = qrImage.value
    anchor.download = '专属预约二维码.png'
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
  }

  const preview = () => {
    if (!provider.value || !bookingLink.value) return
    void router.push({ name: 'model-booking', query: { provider: provider.value.id } })
  }
  onMounted(load)
  onBeforeUnmount(() => {
    ++version
  })
  return {
    router,
    provider,
    roleLabels,
    qrImage,
    bookingLink,
    loading,
    error,
    manualCopy,
    load,
    copyLink,
    saveQr,
    preview,
  }
}
