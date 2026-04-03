<script setup lang="ts">
import { computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import BottomNav from './components/BottomNav.vue'
import { useAppStore } from './stores/app'

const store = useAppStore()
const route = useRoute()

const showBottomNav = computed(() => store.isLoggedIn && !route.meta.hideNav)

watch(
  () => store.theme,
  (value) => {
    document.documentElement.setAttribute('data-theme', value)
  },
  { immediate: true },
)
</script>

<template>
  <div class="app-shell">
    <main class="content-area">
      <router-view />
    </main>
    <BottomNav v-if="showBottomNav" />
  </div>
</template>
