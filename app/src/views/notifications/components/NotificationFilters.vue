<script setup lang="ts">
import type { NotificationFilter } from '@/api/notifications/types'
defineProps<{ filter: NotificationFilter; unreadCount: number; busy: boolean }>()
defineEmits<{ select: [filter: NotificationFilter]; readAll: [] }>()
</script>

<template>
  <nav class="notification-filters" aria-label="通知筛选">
    <div class="notification-filters__tabs">
      <button
        type="button"
        :class="{ active: filter === 'all' }"
        :aria-pressed="filter === 'all'"
        @click="$emit('select', 'all')"
      >
        全部
      </button>
      <button
        type="button"
        :class="{ active: filter === 'unread' }"
        :aria-pressed="filter === 'unread'"
        @click="$emit('select', 'unread')"
      >
        未读 {{ unreadCount }}
      </button>
    </div>
    <button
      class="notification-filters__read"
      type="button"
      :disabled="busy || !unreadCount"
      @click="$emit('readAll')"
    >
      全部已读
    </button>
  </nav>
</template>

<style scoped>
.notification-filters {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 14px;
}
.notification-filters__tabs {
  display: flex;
  gap: 4px;
  padding: 4px;
  border-radius: 14px;
  background: var(--theme-accent-bg);
}
.notification-filters button {
  min-height: 44px;
  padding: 0 14px;
  font-size: 13px;
  border-radius: 11px;
  color: var(--theme-muted);
}
.notification-filters button.active {
  background: var(--theme-surface);
  color: var(--theme-accent-strong);
  font-weight: 800;
}
.notification-filters__read {
  color: var(--theme-accent-strong) !important;
}
.notification-filters button:disabled {
  opacity: 0.45;
}
</style>
