<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

const activeTab = computed(() => (route.meta.tab as string) ?? 'home')

const jump = (name: 'login' | 'home' | 'my') => {
  router.push({ name })
}
</script>

<template>
  <nav class="bottom-nav">
    <button
      class="nav-item"
      :class="{ 'active-login': activeTab === 'login' }"
      type="button"
      @click="jump('login')"
    >
      <i class="fa-solid fa-key" />
      <span>登录</span>
    </button>
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
      :class="{ 'active-my': activeTab === 'my' }"
      type="button"
      @click="jump('my')"
    >
      <i class="fa-solid fa-user-astronaut" />
      <span>我的</span>
    </button>
  </nav>
</template>
