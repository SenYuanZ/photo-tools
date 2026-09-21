import { ref } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import { useUploadQueue, type UploadItem } from '@/hooks/useUploadQueue'

describe('useUploadQueue', () => {
  it('tracks progress and exposes uploaded URLs', async () => {
    const item: UploadItem = { file: new File(['image'], 'photo.jpg') }
    const items = ref([item])
    const upload = vi.fn(async (_file: File, onProgress: (percent: number) => void) => {
      onProgress(50)
      return { url: '/uploads/photo.jpg', thumbnail: '/uploads/thumb.jpg' }
    })
    const queue = useUploadQueue({ items, upload })

    await queue.uploadItems(item)

    expect(item.status).toBe('done')
    expect(item.file).toBeUndefined()
    expect(queue.getUploadedUrls()).toEqual(['/uploads/photo.jpg'])
  })

  it('retains failed files for retry and reports the error', async () => {
    const item: UploadItem = { file: new File(['image'], 'photo.jpg') }
    const onError = vi.fn()
    const queue = useUploadQueue({
      items: ref([item]),
      upload: vi.fn().mockRejectedValue(new Error('网络失败')),
      onError,
    })

    await queue.uploadItems(item)

    expect(item.status).toBe('failed')
    expect(item.file).toBeInstanceOf(File)
    expect(queue.failedItems.value).toHaveLength(1)
    expect(onError).toHaveBeenCalledWith('网络失败', item)
  })
})
