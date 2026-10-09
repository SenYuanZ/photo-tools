<script setup lang="ts">
import { computed } from 'vue'
import type { NotificationItem } from '@/api/notifications/types'
const props = defineProps<{ item: NotificationItem; busy: boolean }>()
defineEmits<{ open: [item: NotificationItem] }>()
const unread = computed(() => !props.item.readAt && !props.item.invalidatedAt)
const time = computed(() =>
  new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(props.item.createdAt)),
)
</script>

<template>
  <button
    type="button"
    class="notification-item"
    :class="{ 'notification-item--unread': unread }"
    :disabled="busy"
    @click="$emit('open', item)"
  >
    <span class="notification-item__icon"
      ><i class="fa-regular fa-bell" aria-hidden="true" /><span
        v-if="unread"
        class="notification-item__dot"
    /></span>
    <span class="notification-item__body">
      <strong>{{ item.title }}</strong>
      <span class="notification-item__content">{{ item.content }}</span>
      <span class="notification-item__meta"
        ><time :datetime="item.createdAt">{{ time }}</time
        ><span v-if="item.statusLabel">{{ item.statusLabel }}</span
        ><span v-else>{{ unread ? '未读' : '已读' }}</span></span
      >
    </span>
    <i
      v-if="item.canNavigate"
      class="fa-solid fa-chevron-right notification-item__arrow"
      aria-hidden="true"
    />
  </button>
</template>

<style scoped>
.notification-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  width: 100%;
  padding: 18px 14px;
  border: 1px solid var(--theme-form-border);
  border-radius: 18px;
  background: var(--theme-surface);
  text-align: left;
}
.notification-item--unread {
  border-color: var(--theme-accent-soft);
  background: var(--theme-accent-bg);
}
.notification-item__icon {
  position: relative;
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  border-radius: 12px;
  background: var(--theme-accent-soft);
  color: var(--theme-accent-strong);
}
.notification-item__dot {
  position: absolute;
  right: -2px;
  top: -2px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--theme-accent-strong);
}
.notification-item__body {
  min-width: 0;
  flex: 1;
  display: grid;
  gap: 8px;
}
.notification-item__body strong {
  font-size: 14px;
  color: var(--ink);
}
.notification-item__content {
  font-size: 12px;
  line-height: 1.7;
  color: var(--theme-muted);
  overflow-wrap: anywhere;
}
.notification-item__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  font-size: 11px;
  color: var(--theme-muted-soft);
}
.notification-item__arrow {
  align-self: center;
  font-size: 11px;
  color: var(--theme-muted-soft);
}
.notification-item:disabled {
  opacity: 0.65;
}
</style>
