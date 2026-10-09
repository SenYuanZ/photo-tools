<script setup lang="ts">
import { computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import BottomNav from '@/components/BottomNav.vue'
import { useAuthStore } from '@/stores/auth'
import { useSettingsStore } from '@/stores/settings'
import NotificationBanner from '@/components/NotificationBanner.vue'
import { useNotificationPolling } from '@/hooks/useNotificationPolling'

const authStore = useAuthStore()
const settingsStore = useSettingsStore()
const route = useRoute()
const router = useRouter()
const { bannerVisible, dismiss } = useNotificationPolling()
const openNotifications = () => {
  dismiss()
  void router.push({ name: 'notifications' })
}

const showBottomNav = computed(() => authStore.isLoggedIn && !route.meta.hideNav)

watch(
  () => settingsStore.theme,
  (value) => {
    document.documentElement.setAttribute('data-theme', value)
  },
  { immediate: true },
)
</script>

<template>
  <div class="app-shell">
    <NotificationBanner v-if="bannerVisible" @open="openNotifications" @dismiss="dismiss" />
    <main class="content-area">
      <router-view v-slot="{ Component }">
        <keep-alive include="AiQaPage">
          <component :is="Component" />
        </keep-alive>
      </router-view>
    </main>
    <BottomNav v-if="showBottomNav" />
  </div>
</template>
