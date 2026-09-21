import { computed, ref, type Ref } from 'vue'
import type { UploaderFileListItem } from 'vant'
import { getErrorMessage } from '@/utils/error'

export type UploadItem = UploaderFileListItem & {
  uploadedUrl?: string
}

type UploadResult = { url: string; thumbnail: string }
type UploadTransport = (file: File, onProgress: (percent: number) => void) => Promise<UploadResult>

export const uploadQueueItem = async (item: UploadItem, upload: UploadTransport): Promise<void> => {
  if (!(item.file instanceof File)) return

  item.status = 'uploading'
  item.message = '0%'
  const result = await upload(item.file, (percent) => {
    item.message = `${percent}%`
  })
  item.uploadedUrl = result.url
  item.url = result.thumbnail
  item.status = 'done'
  item.message = ''
  delete item.file
}

type UploadQueueOptions = {
  items: Ref<UploadItem[]>
  upload: UploadTransport
  onError?: (message: string, item: UploadItem) => void
}

export const useUploadQueue = ({ items, upload, onError }: UploadQueueOptions) => {
  const uploading = ref(false)
  const failedItems = computed(() =>
    items.value.filter((item) => item.status === 'failed' && item.file),
  )

  const uploadSingle = async (item: UploadItem) => {
    await uploadQueueItem(item, upload)
  }

  const handleFailure = (error: unknown, item: UploadItem) => {
    const message = getErrorMessage(error, '上传失败')
    item.status = 'failed'
    item.message = message
    onError?.(message, item)
  }

  const uploadItems = async (
    value: UploaderFileListItem | UploaderFileListItem[],
  ): Promise<UploadItem[]> => {
    const targets = (Array.isArray(value) ? value : [value]) as UploadItem[]
    uploading.value = true
    try {
      await Promise.all(
        targets.map(async (item) => {
          try {
            await uploadSingle(item)
          } catch (error) {
            handleFailure(error, item)
          }
        }),
      )
      return targets
    } finally {
      uploading.value = false
    }
  }

  const retry = async (item: UploadItem): Promise<void> => {
    uploading.value = true
    try {
      await uploadSingle(item)
    } catch (error) {
      handleFailure(error, item)
    } finally {
      uploading.value = false
    }
  }

  const getUploadedUrls = (): string[] =>
    items.value
      .map((item) => item.uploadedUrl || item.url)
      .filter((value): value is string => Boolean(value))

  return {
    uploading,
    failedItems,
    uploadSingle,
    uploadItems,
    retry,
    getUploadedUrls,
  }
}
