import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { showImagePreview } from 'vant'
import ProviderPortfolio from './ProviderPortfolio.vue'
import type { PublicProvider } from '@/api/public-booking/types'

vi.mock('vant', () => ({ showImagePreview: vi.fn() }))

const provider: PublicProvider = {
  id: 'p1',
  nickname: '小鹿',
  account: 'deer',
  role: 'photographer',
  roles: ['photographer'],
  avatarUrl: '',
  bio: '',
  portfolioPublic: true,
  portfolioImages: ['/uploads/first.jpg', '/uploads/second.jpg'],
}

describe('public provider portfolio', () => {
  it('displays public works and opens the clicked image in the full gallery', async () => {
    const wrapper = mount(ProviderPortfolio, { props: { provider } })
    expect(wrapper.findAll('img').map((image) => image.attributes('src'))).toEqual(
      provider.portfolioImages,
    )
    await wrapper.findAll('button')[1].trigger('click')
    expect(showImagePreview).toHaveBeenCalledWith({
      images: provider.portfolioImages,
      startPosition: 1,
      closeable: true,
    })
    wrapper.unmount()
  })

  it('hides non-public images and handles an empty portfolio', async () => {
    const wrapper = mount(ProviderPortfolio, {
      props: { provider: { ...provider, portfolioPublic: false } },
    })
    expect(wrapper.findAll('img')).toHaveLength(0)
    expect(wrapper.text()).toContain('暂无公开作品')
    await wrapper.setProps({ provider: { ...provider, portfolioImages: [] } })
    expect(wrapper.findAll('button')).toHaveLength(0)
    expect(wrapper.text()).toContain('暂无公开作品')
    wrapper.unmount()
  })
})
