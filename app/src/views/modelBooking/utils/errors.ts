import { getErrorMessage } from '@/utils/error'

export const resolvePublicErrorMessage = (requestError: unknown, fallback: string): string => {
  const message = getErrorMessage(requestError, fallback)
  const replacements: Array<[string, string]> = [
    ['Cannot GET /api/public/providers', '公开服务者接口未生效，请重启后端服务后重试。'],
    ['Cannot GET /api/public/service-types', '公开服务类型接口未生效，请重启后端服务后重试。'],
    ['Cannot GET /api/public/customer-types', '公开客户类型接口未生效，请重启后端服务后重试。'],
    ['Cannot POST /api/public/bookings', '公开约单提交接口未生效，请重启后端服务后重试。'],
    ['请上传图片文件', '请上传图片文件（支持 JPG/PNG/WEBP/HEIC）。'],
    ['图片处理失败', '当前图片格式暂不支持，请改用 JPG/PNG 后重试。'],
    ['Failed to fetch', '无法连接后端服务，请确认 server 已启动。'],
  ]
  const replacement = replacements.find(([needle]) => message.includes(needle))
  if (replacement) return replacement[1]
  if (message.includes('File too large') || message.includes('LIMIT_FILE_SIZE')) {
    return '图片不能超过 12MB，请压缩后重试。'
  }
  return message
}
