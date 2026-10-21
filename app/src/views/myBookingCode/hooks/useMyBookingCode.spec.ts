import { defineComponent } from 'vue'
import { describe, it, vi, expect, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@/test/mount'
import { profileApi } from '@/api/profile'
import { publicBookingApi } from '@/api/public-booking'
import { copyText } from '@/utils/clipboard'
import { useMyBookingCode } from './useMyBookingCode'

const { push, encodeQr } = vi.hoisted(() => ({
  push: vi.fn(),
  encodeQr: vi.fn<() => Promise<string>>(),
}))
vi.mock('vue-router', () => ({
  useRouter: () => ({
    push,
    resolve: ({ query }: { query: { provider: string } }) => ({
      href: `/base/model-booking?provider=${query.provider}`,
    }),
  }),
}))
vi.mock('@/api/profile', () => ({ profileApi: { get: vi.fn() } }))
vi.mock('@/api/public-booking', () => ({ publicBookingApi: { getProvider: vi.fn() } }))
vi.mock('@/api/roles', () => ({
  rolesApi: { list: vi.fn().mockResolvedValue([{ code: 'photographer', name: '摄影' }]) },
}))
vi.mock('@/utils/clipboard', () => ({ copyText: vi.fn() }))
vi.mock('qrcode', () => ({ default: { toDataURL: encodeQr } }))

describe('personal booking QR', () => {
  let page: ReturnType<typeof useMyBookingCode>
  let wrapper: ReturnType<typeof mount>
  beforeEach(async () => {
    vi.clearAllMocks()
    vi.mocked(profileApi.get).mockResolvedValue({ id: 'self' } as Awaited<
      ReturnType<typeof profileApi.get>
    >)
    vi.mocked(publicBookingApi.getProvider).mockResolvedValue({
      id: 'self',
      nickname: '服务者',
      account: 'public',
      role: 'photographer',
      roles: ['photographer'],
      avatarUrl: '',
      bio: '',
      portfolioPublic: false,
      portfolioImages: [],
    })
    encodeQr.mockResolvedValue('data:image/png;base64,qr')
    vi.mocked(copyText).mockResolvedValue(true)
    wrapper = mount(
      defineComponent({
        setup() {
          page = useMyBookingCode()
          return () => null
        },
      }),
    )
    await flushPromises()
  })
  afterEach(() => {
    wrapper.unmount()
    vi.restoreAllMocks()
  })

  it('uses the current user and one base-aware link for QR, copy, and preview', async () => {
    expect(publicBookingApi.getProvider).toHaveBeenCalledWith('self')
    expect(encodeQr).toHaveBeenCalledWith(
      page.bookingLink.value,
      expect.objectContaining({ margin: 4 }),
    )
    expect(new URL(page.bookingLink.value).pathname).toBe('/base/model-booking')
    expect(new URL(page.bookingLink.value).searchParams.get('provider')).toBe('self')
    await page.copyLink()
    expect(copyText).toHaveBeenCalledWith(page.bookingLink.value)
    page.preview()
    expect(push).toHaveBeenCalledWith({ name: 'model-booking', query: { provider: 'self' } })
    expect(page.roleLabels.value).toEqual(['摄影'])
  })

  it('offers manual copying when browser clipboard access fails', async () => {
    vi.mocked(copyText).mockResolvedValueOnce(false)
    await page.copyLink()
    expect(page.manualCopy.value).toBe(true)
    expect(page.bookingLink.value).toContain('provider=self')
  })

  it('does not retain stale QR or links after a failed refresh and can retry', async () => {
    vi.mocked(publicBookingApi.getProvider).mockRejectedValueOnce(new Error('offline'))
    await page.load()
    expect(page.qrImage.value).toBe('')
    expect(page.bookingLink.value).toBe('')
    expect(page.error.value).toBeTruthy()
    await page.load()
    expect(page.qrImage.value).toBeTruthy()
    expect(page.error.value).toBe('')
  })

  it('downloads the generated PNG through the save action', () => {
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      expect(this.download).toBe('专属预约二维码.png')
      expect(this.href).toBe(page.qrImage.value)
    })
    page.saveQr()
    expect(click).toHaveBeenCalledOnce()
  })
})
