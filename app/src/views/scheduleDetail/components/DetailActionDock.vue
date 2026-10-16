<script setup lang="ts">
defineProps<{
  primaryLabel: string
  primaryDisabled?: boolean
  showMore?: boolean
}>()

const emit = defineEmits<{
  primary: []
  more: []
}>()
</script>

<template>
  <div class="action-dock" aria-label="订单操作">
    <button
      class="primary-button"
      type="button"
      :disabled="primaryDisabled"
      @click="emit('primary')"
    >
      {{ primaryLabel }}
    </button>
    <button
      v-if="showMore"
      class="more-button"
      type="button"
      aria-label="更多操作"
      title="更多操作"
      aria-haspopup="dialog"
      @click="emit('more')"
    >
      <i class="fa-solid fa-ellipsis" aria-hidden="true" />
    </button>
  </div>
</template>

<style scoped>
.action-dock {
  position: fixed;
  right: 0;
  bottom: calc(52px + env(safe-area-inset-bottom));
  left: 0;
  z-index: 40;
  display: grid;
  width: 100%;
  max-width: 760px;
  grid-template-columns: minmax(0, 1fr) 52px;
  gap: 10px;
  margin: 0 auto;
  border-top: 1px solid var(--line);
  padding: 12px 16px 16px;
  background: color-mix(in srgb, var(--theme-surface) 94%, transparent);
  backdrop-filter: blur(14px);
}

.action-dock:has(.primary-button:only-child) {
  grid-template-columns: minmax(0, 1fr);
}

.primary-button {
  display: inline-flex;
  min-width: 0;
  min-height: 48px;
  align-items: center;
  justify-content: center;
  gap: 7px;
  border: 0;
  border-radius: 12px;
  background: var(--theme-accent);
  color: var(--ink);
  font-size: 15px;
  font-weight: 700;
}

.primary-button:disabled {
  box-shadow: none;
  opacity: 0.58;
}

.more-button {
  display: inline-flex;
  width: 52px;
  height: 48px;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 12px;
  background: var(--theme-accent-bg);
  color: var(--theme-muted);
}
</style>
