<script setup lang="ts">
defineEmits<{ open: []; dismiss: [] }>()
</script>

<template>
  <aside class="notification-banner" role="status">
    <button type="button" class="notification-banner__open" @click="$emit('open')">
      <i class="fa-regular fa-bell" aria-hidden="true" />有新的排单提醒，点击查看
    </button>
    <button
      type="button"
      class="notification-banner__close"
      aria-label="关闭提醒"
      @click="$emit('dismiss')"
    >
      ×
    </button>
  </aside>
</template>

<style scoped>
.notification-banner {
  position: fixed;
  z-index: 100;
  top: calc(env(safe-area-inset-top) + 12px);
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  width: calc(100% - 28px);
  max-width: 500px;
  background: var(--theme-surface);
  border: 1px solid var(--theme-accent-soft);
  border-radius: 16px;
  box-shadow: 0 8px 24px var(--theme-shadow);
}
.notification-banner__open {
  flex: 1;
  min-width: 0;
  min-height: 48px;
  padding: 12px;
  text-align: left;
  font-size: 13px;
  font-weight: 700;
  color: var(--ink);
}
.notification-banner__open i {
  margin-right: 8px;
  color: var(--theme-accent-strong);
}
.notification-banner__close {
  min-width: 44px;
  color: var(--theme-muted);
  font-size: 22px;
}
</style>
