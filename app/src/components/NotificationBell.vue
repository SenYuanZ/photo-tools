<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useNotificationsStore } from '@/stores/notifications'

const router = useRouter()
const store = useNotificationsStore()
const label = computed(() => (store.unreadCount > 99 ? '99+' : String(store.unreadCount)))
</script>

<template>
  <button
    class="notification-bell"
    type="button"
    :aria-label="`站内通知，${store.unreadCount} 条未读`"
    @click="router.push({ name: 'notifications' })"
  >
    <i class="fa-regular fa-bell" aria-hidden="true" />
    <span v-if="store.unreadCount" class="notification-bell__badge">{{ label }}</span>
  </button>
</template>

<style scoped>
.notification-bell {
  position: relative;
  width: 44px;
  height: 44px;
  border: 1px solid var(--theme-form-border);
  border-radius: 14px;
  background: var(--theme-surface);
  color: var(--theme-accent-strong);
  font-size: 19px;
  flex-shrink: 0;
}
.notification-bell__badge {
  position: absolute;
  right: -5px;
  top: -5px;
  min-width: 20px;
  padding: 2px 4px;
  border-radius: 10px;
  background: var(--theme-accent-strong);
  color: var(--theme-on-accent);
  font-size: 10px;
  font-weight: 800;
}
</style>
