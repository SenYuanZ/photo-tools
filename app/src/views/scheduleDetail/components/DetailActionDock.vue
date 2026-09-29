<script setup lang="ts">
defineProps<{
  primaryLabel: string
  primaryIcon: string
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
      <i :class="primaryIcon" aria-hidden="true" />
      {{ primaryLabel }}
    </button>
    <button
      v-if="showMore"
      class="more-button"
      type="button"
      aria-label="更多操作"
      title="更多操作"
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
  grid-template-columns: minmax(0, 1fr) 44px;
  gap: 8px;
  margin: 0 auto;
  border-top: 1px solid var(--line);
  padding: 10px 16px;
  background: color-mix(in srgb, var(--theme-surface) 94%, transparent);
  backdrop-filter: blur(14px);
}

.action-dock:has(.primary-button:only-child) {
  grid-template-columns: minmax(0, 1fr);
}

.primary-button {
  display: inline-flex;
  min-width: 0;
  min-height: 44px;
  align-items: center;
  justify-content: center;
  gap: 7px;
  border: 0;
  border-radius: 12px;
  background: linear-gradient(135deg, var(--theme-accent), var(--theme-accent-strong));
  color: var(--theme-on-accent);
  box-shadow: 0 8px 18px rgba(var(--theme-accent-rgb), 0.28);
  font-size: 13px;
  font-weight: 800;
}

.primary-button:disabled {
  box-shadow: none;
  opacity: 0.58;
}

.more-button {
  display: inline-flex;
  width: 44px;
  height: 44px;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--theme-surface);
  color: var(--theme-muted);
}
</style>
