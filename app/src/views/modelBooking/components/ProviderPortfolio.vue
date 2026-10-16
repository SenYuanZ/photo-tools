<script setup lang="ts">
import { computed } from 'vue'
import { showImagePreview } from 'vant'
import type { PublicProvider } from '@/api/public-booking/types'

const props = defineProps<{ provider: PublicProvider }>()
const images = computed(() =>
  props.provider.portfolioPublic ? props.provider.portfolioImages : [],
)
const preview = (startPosition: number) => {
  showImagePreview({ images: images.value, startPosition, closeable: true })
}
</script>

<template>
  <section class="provider-portfolio" :aria-label="`${provider.nickname}的公开作品集`">
    <header class="provider-portfolio__header">
      <strong>公开作品集</strong>
      <span>{{ images.length ? `${images.length} 张 · 点击查看大图` : '暂无公开作品' }}</span>
    </header>
    <div v-if="images.length" class="provider-portfolio__images">
      <button
        v-for="(image, index) in images"
        :key="`${index}-${image}`"
        type="button"
        :aria-label="`查看${provider.nickname}的第${index + 1}张作品`"
        @click="preview(index)"
      >
        <img :src="image" :alt="`${provider.nickname}的作品 ${index + 1}`" loading="lazy" />
      </button>
    </div>
  </section>
</template>

<style scoped>
.provider-portfolio {
  min-width: 0;
  margin-bottom: 16px;
}
.provider-portfolio__header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 4px 8px;
  margin-bottom: 9px;
  font-size: 12px;
}
.provider-portfolio__header strong {
  color: var(--ink);
}
.provider-portfolio__header span {
  color: var(--theme-muted-soft);
  font-size: 11px;
}
.provider-portfolio__images {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 5px;
}
.provider-portfolio__images button {
  flex: 0 0 104px;
  height: 130px;
  padding: 0;
  overflow: hidden;
  border: 1px solid var(--theme-form-border);
  border-radius: 9px;
  background: var(--theme-accent-bg);
}
.provider-portfolio__images img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.provider-portfolio__images button:focus-visible {
  outline: 2px solid var(--theme-focus-ring);
  outline-offset: -2px;
}
</style>
