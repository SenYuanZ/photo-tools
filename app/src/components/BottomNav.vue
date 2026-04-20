<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

const activeTab = computed(() => (route.meta.tab as string) ?? 'home')

const jump = (name: 'home' | 'calendar' | 'my') => {
  router.push({ name })
}
</script>

<template>
  <nav class="bottom-nav">
    <button
      class="nav-item"
      :class="{ 'active-home': activeTab === 'home' }"
      type="button"
      @click="jump('home')"
    >
      <i class="fa-solid fa-camera-retro" />
      <span>首页</span>
    </button>
    <button
      class="nav-item"
      :class="{ 'active-calendar': activeTab === 'calendar' }"
      type="button"
      @click="jump('calendar')"
    >
      <i class="fa-regular fa-calendar-days" />
      <span>日历</span>
    </button>
    <button
      class="nav-item"
      :class="{ 'active-my': activeTab === 'my' }"
      type="button"
      @click="jump('my')"
    >
      <i class="fa-solid fa-user-astronaut" />
      <span>我的</span>
    </button>
  </nav>
</template>
