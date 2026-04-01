<script setup lang="ts">
import { watch } from 'vue'
import BottomNav from './components/BottomNav.vue'
import { useAppStore } from './stores/app'

const store = useAppStore()

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
    <BottomNav />
  </div>
</template>
