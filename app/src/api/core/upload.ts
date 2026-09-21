import { getToken, notifyUnauthorized } from '@/api/core/auth'
import { API_BASE_URL } from '@/api/core/config'
import { ApiError, resolveApiErrorMessage } from '@/api/core/error'

export const MAX_IMAGE_SIZE = 10 * 1024 * 1024

export interface UploadResponse {
  urls: string[]
  thumbnails?: string[]
}

type UploadOptions = {
  path: string
  file: File
  fieldName?: string
  skipAuth?: boolean
  onProgress?: (percent: number) => void
}

export const validateImageSize = (file: File): void => {
  if (file.size <= MAX_IMAGE_SIZE) return
  throw new Error(`图片大小不能超过10MB，当前文件：${(file.size / 1024 / 1024).toFixed(1)}MB`)
}

export const uploadImage = ({
  path,
  file,
  fieldName = 'files',
  skipAuth = false,
  onProgress,
}: UploadOptions): Promise<{ url: string; thumbnail: string }> => {
  validateImageSize(file)

  return new Promise((resolve, reject) => {
    const formData = new FormData()
    formData.append(fieldName, file)

    const xhr = new XMLHttpRequest()
    xhr.open('POST', `${API_BASE_URL}${path}`, true)
    if (!skipAuth) {
      const token = getToken()
      if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`)
    }

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return
      onProgress?.(Math.min(99, Math.max(0, Math.round((event.loaded / event.total) * 100))))
    }
    xhr.onerror = () => reject(new Error('上传失败，请检查网络后重试'))
    xhr.onload = () => {
      let payload: UploadResponse | Record<string, unknown> | undefined
      try {
        payload = xhr.responseText ? (JSON.parse(xhr.responseText) as UploadResponse) : undefined
      } catch {
        reject(new ApiError(xhr.status, '上传失败', xhr.responseText))
        return
      }

      if (xhr.status >= 200 && xhr.status < 300 && 'urls' in (payload || {})) {
        const result = payload as UploadResponse
        if (result.urls.length) {
          onProgress?.(100)
          resolve({
            url: result.urls[0],
            thumbnail: result.thumbnails?.[0] || result.urls[0],
          })
          return
        }
      }

      if (xhr.status === 401 && !skipAuth) notifyUnauthorized()
      reject(new ApiError(xhr.status, resolveApiErrorMessage(payload, '上传失败'), payload))
    }
    xhr.send(formData)
  })
}
