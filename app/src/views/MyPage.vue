<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import { useAppStore } from '../stores/app'

const store = useAppStore()
const router = useRouter()

const isMakeupRole = computed(() => store.userRole === 'makeup_artist')
const roleLabel = computed(() => (isMakeupRole.value ? '妆娘' : '摄影师'))
const entryTitle = computed(() => (isMakeupRole.value ? '约妆录入' : '排单录入'))
const entryDesc = computed(() => (isMakeupRole.value ? '关联客户并安排妆造档期' : '关联客户并校验冲突'))
const displayName = computed(() => store.profile?.nickname || store.account || roleLabel.value)
const avatarUrl = computed(
  () =>
    store.profile?.avatarUrl ||
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=320&q=80',
)

const jump = (name: string) => router.push({ name })

const logout = () => {
  store.logout()
  router.push({ name: 'login' })
}

const openModelBooking = () => {
  router.push({ name: 'model-booking' })
}

const copyModelBookingLink = async () => {
  const link = `${window.location.origin}/model-booking`
  try {
    await navigator.clipboard.writeText(link)
    showToast('约拍链接已复制')
  } catch {
    showToast('复制失败，请手动复制')
  }
}
</script>

<template>
  <section class="bounce-in">
    <header class="card mb-4 p-4 soft-blue">
      <div class="flex items-center gap-3">
        <img
          :src="avatarUrl"
          alt="头像"
          class="h-14 w-14 rounded-2xl object-cover"
        />
        <div>
          <p class="title-font text-2xl text-blue-500">{{ displayName }}</p>
          <p class="text-xs text-slate-500">今日待服务 {{ store.stats.todayCount }} 组</p>
        </div>
      </div>
      <div class="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
        <article class="card p-2"><p class="font-extrabold text-rose-500">{{ store.stats.customerCount }}</p><p>客户总数</p></article>
        <article class="card p-2"><p class="font-extrabold text-blue-500">{{ store.stats.todayCount }}</p><p>今日排单</p></article>
        <article class="card p-2"><p class="font-extrabold text-amber-600">{{ store.stats.monthCount }}</p><p>本月排单</p></article>
      </div>
    </header>

    <div class="grid grid-cols-2 gap-3 text-sm">
      <button class="card p-3 text-left soft-blue" type="button" @click="jump('customer-new')">
        <p class="font-extrabold"><i class="fa-solid fa-user-plus mr-1 text-blue-500" />添加客户信息</p>
        <p class="mt-1 text-xs text-slate-500">客户资料录入与编辑</p>
      </button>
      <button class="card p-3 text-left soft-yellow" type="button" @click="jump('schedule-new')">
        <p class="font-extrabold"><i class="fa-solid fa-calendar-plus mr-1 text-amber-500" />{{ entryTitle }}</p>
        <p class="mt-1 text-xs text-slate-500">{{ entryDesc }}</p>
      </button>
      <button class="card p-3 text-left soft-pink" type="button" @click="jump('customers')">
        <p class="font-extrabold"><i class="fa-solid fa-address-book mr-1 text-rose-500" />客户管理</p>
        <p class="mt-1 text-xs text-slate-500">查看、编辑、删除客户</p>
      </button>
      <button class="card p-3 text-left soft-blue" type="button" @click="jump('history')">
        <p class="font-extrabold"><i class="fa-solid fa-clock-rotate-left mr-1 text-blue-500" />历史排单</p>
        <p class="mt-1 text-xs text-slate-500">日期和类型筛选复盘</p>
      </button>
      <button class="card col-span-2 p-3 text-left soft-blue" type="button" @click="jump('profile')">
        <p class="font-extrabold"><i class="fa-solid fa-id-badge mr-1 text-blue-500" />个人资料与作品集</p>
        <p class="mt-1 text-xs text-slate-500">可修改昵称、头像、简介并管理作品图片</p>
      </button>
      <button class="card col-span-2 p-3 text-left soft-yellow" type="button" @click="jump('settings')">
        <p class="font-extrabold"><i class="fa-solid fa-sliders mr-1 text-amber-500" />个人设置</p>
        <p class="mt-1 text-xs text-slate-500">主题切换、提醒和备份开关</p>
      </button>

      <article class="card col-span-2 p-3 soft-pink">
        <p class="font-extrabold text-sm"><i class="fa-regular fa-calendar-check mr-1 text-rose-500" />模特约拍入口</p>
        <p class="mt-1 text-xs text-slate-500">把这个入口发给模特，TA 可以免登录选择时间并提交动作需求</p>
        <div class="mt-2 grid grid-cols-2 gap-2">
          <button class="btn-primary" type="button" @click="openModelBooking">立即查看入口</button>
          <button class="btn-secondary" type="button" @click="copyModelBookingLink">复制入口链接</button>
        </div>
      </article>
    </div>

    <button class="btn-secondary mt-4" type="button" @click="logout">
      <i class="fa-solid fa-right-from-bracket mr-1" />退出登录
    </button>
  </section>
</template>
