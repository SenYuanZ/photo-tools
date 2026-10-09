<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import MyMenuItem from '@/views/my/components/MyMenuItem.vue'
import MyProfileHeader from '@/views/my/components/MyProfileHeader.vue'
import { useAuthStore } from '@/stores/auth'
import { useScheduleStore } from '@/stores/schedules'
import defaultAvatar from '@/assets/DefaultAvatar.png'

const store = useAuthStore()
const scheduleStore = useScheduleStore()
const router = useRouter()

const roleNameMap: Record<string, string> = {
  photographer: '摄影',
  videographer: '摄像',
  makeup_artist: '妆娘',
  hair_stylist: '毛娘',
  retoucher: '后期',
  vfx_artist: '特效',
  model: '模特',
  editor: '剪辑',
  prop_master: '道具',
  ticket_agent: '票代',
  logistics: '后勤',
}

const isMakeupRole = computed(() => store.userRole === 'makeup_artist')
const roleLabel = computed(() => roleNameMap[store.userRole] || '服务者')
const entryTitle = computed(() => (isMakeupRole.value ? '约妆录入' : '排单录入'))
const entryDesc = computed(() =>
  isMakeupRole.value ? '关联客户并安排妆造档期' : '关联客户并校验档期冲突',
)
const displayName = computed(() => store.profile?.nickname || store.account || roleLabel.value)
const avatarUrl = computed(() => store.profile?.avatarUrl || defaultAvatar)
const profileBio = computed(() => store.profile?.bio || `${roleLabel.value}服务者`)

const jump = (name: string) => router.push({ name })

const logout = () => {
  store.logout()
  router.push({ name: 'login' })
}

const openModelBooking = () => {
  router.push({ name: 'model-booking' })
}

const copyByExecCommand = (text: string) => {
  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', 'true')
  textarea.style.position = 'fixed'
  textarea.style.top = '-9999px'
  textarea.style.left = '-9999px'
  document.body.appendChild(textarea)
  textarea.select()
  textarea.setSelectionRange(0, textarea.value.length)
  const success = document.execCommand('copy')
  document.body.removeChild(textarea)
  return success
}

const copyText = async (text: string) => {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text)
    return true
  }

  return copyByExecCommand(text)
}

const copyModelBookingLink = async () => {
  const link = `${window.location.origin}${router.resolve({ name: 'model-booking' }).href}`
  try {
    const copied = await copyText(link)
    if (!copied) {
      throw new Error('copy failed')
    }
    showToast('约拍链接已复制')
  } catch {
    showToast('复制失败，请手动复制')
  }
}
</script>

<template>
  <section class="my-page bounce-in">
    <MyProfileHeader
      :avatar-url="avatarUrl"
      :display-name="displayName"
      :role-label="roleLabel"
      :bio="profileBio"
      :customer-count="scheduleStore.stats.customerCount"
      :today-count="scheduleStore.stats.todayCount"
      :month-count="scheduleStore.stats.monthCount"
      @edit="jump('profile')"
    />

    <section class="my-section" aria-labelledby="quick-actions-title">
      <header class="my-section__heading">
        <h2 id="quick-actions-title">快捷开始</h2>
        <span>常用操作</span>
      </header>
      <div class="my-quick-grid">
        <button type="button" class="my-quick-action" @click="jump('customer-new')">
          <span class="my-quick-action__icon">
            <i class="fa-solid fa-user-plus" aria-hidden="true" />
          </span>
          <strong>添加客户</strong>
          <span>录入客户资料</span>
        </button>
        <button type="button" class="my-quick-action" @click="jump('schedule-new')">
          <span class="my-quick-action__icon">
            <i class="fa-solid fa-calendar-plus" aria-hidden="true" />
          </span>
          <strong>{{ entryTitle }}</strong>
          <span>{{ entryDesc }}</span>
        </button>
      </div>
    </section>

    <section class="my-section" aria-labelledby="work-management-title">
      <header class="my-section__heading">
        <h2 id="work-management-title">工作管理</h2>
      </header>
      <div class="my-menu-card">
        <MyMenuItem
          icon="fa-solid fa-address-book"
          title="客户管理"
          description="查看、编辑与维护客户资料"
          @click="jump('customers')"
        />
        <MyMenuItem
          icon="fa-solid fa-clock-rotate-left"
          title="历史排单"
          description="按日期和服务类型筛选复盘"
          @click="jump('history')"
        />
      </div>
    </section>

    <section class="my-section" aria-labelledby="account-service-title">
      <header class="my-section__heading">
        <h2 id="account-service-title">账户与服务</h2>
      </header>
      <div class="my-menu-card">
        <MyMenuItem
          icon="fa-solid fa-id-badge"
          title="个人资料与作品集"
          description="编辑头像、简介与公开作品"
          @click="jump('profile')"
        />
        <MyMenuItem
          icon="fa-solid fa-sliders"
          title="个人设置"
          description="切换主题与默认提醒"
          @click="jump('settings')"
        />
      </div>
    </section>

    <section class="my-booking-panel" aria-labelledby="booking-entry-title">
      <div class="my-booking-panel__head">
        <span class="my-booking-panel__icon">
          <i class="fa-regular fa-calendar-check" aria-hidden="true" />
        </span>
        <div>
          <p class="my-booking-panel__eyebrow">公开预约</p>
          <h2 id="booking-entry-title">模特约拍入口</h2>
        </div>
      </div>
      <p class="my-booking-panel__description">
        分享给模特后，对方可免登录选择时间并提交拍摄需求。
      </p>
      <div class="my-booking-panel__actions">
        <button class="btn-primary" type="button" @click="openModelBooking">
          <i class="fa-solid fa-arrow-up-right-from-square" aria-hidden="true" />
          打开入口
        </button>
        <button class="btn-secondary" type="button" @click="copyModelBookingLink">
          <i class="fa-regular fa-copy" aria-hidden="true" />
          复制链接
        </button>
      </div>
    </section>

    <button class="my-logout-button" type="button" @click="logout">
      <i class="fa-solid fa-right-from-bracket" aria-hidden="true" />
      退出登录
    </button>
  </section>
</template>

<style scoped>
.my-page {
  display: grid;
  gap: 18px;
}

.my-section {
  display: grid;
  gap: 9px;
}

.my-section__heading {
  display: flex;
  min-height: 22px;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 0 2px;
}

.my-section__heading h2,
.my-booking-panel h2 {
  margin: 0;
  color: var(--ink);
  font-size: 15px;
  font-weight: 800;
  letter-spacing: 0;
}

.my-section__heading > span {
  color: var(--theme-muted-soft);
  font-size: 11px;
  font-weight: 600;
}

.my-quick-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.my-quick-action {
  display: grid;
  min-width: 0;
  min-height: 118px;
  align-content: start;
  justify-items: start;
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 13px;
  background: var(--theme-surface);
  color: var(--ink);
  text-align: left;
  box-shadow: 0 8px 18px rgba(var(--theme-accent-rgb), 0.09);
  transition:
    transform 160ms ease,
    border-color 160ms ease;
}

.my-quick-action:active {
  transform: scale(0.98);
  border-color: var(--theme-accent-soft);
}

.my-quick-action__icon {
  display: inline-flex;
  width: 38px;
  height: 38px;
  align-items: center;
  justify-content: center;
  margin-bottom: 10px;
  border-radius: 12px;
  background: var(--theme-accent-bg);
  color: var(--theme-accent-strong);
  font-size: 15px;
}

.my-quick-action strong {
  max-width: 100%;
  overflow: hidden;
  font-size: 14px;
  font-weight: 800;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.my-quick-action > span:last-child {
  display: -webkit-box;
  max-width: 100%;
  overflow: hidden;
  margin-top: 4px;
  color: var(--theme-muted-soft);
  font-size: 11px;
  line-height: 1.4;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.my-menu-card {
  overflow: hidden;
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 0 13px;
  background: var(--theme-surface);
  box-shadow: 0 8px 18px rgba(var(--theme-accent-rgb), 0.08);
}

.my-menu-card :deep(.my-menu-item + .my-menu-item) {
  border-top: 1px solid var(--line);
}

.my-booking-panel {
  border: 1px solid var(--theme-accent-soft);
  border-radius: 16px;
  padding: 14px;
  background: linear-gradient(
    145deg,
    var(--theme-accent-bg),
    color-mix(in srgb, var(--theme-accent-bg) 55%, var(--theme-surface))
  );
}

.my-booking-panel__head {
  display: flex;
  align-items: center;
  gap: 10px;
}

.my-booking-panel__icon {
  display: inline-flex;
  width: 40px;
  height: 40px;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  background: var(--theme-surface);
  color: var(--theme-accent-strong);
  box-shadow: 0 6px 14px rgba(var(--theme-accent-rgb), 0.12);
}

.my-booking-panel__eyebrow {
  margin: 0 0 1px;
  color: var(--theme-accent-strong);
  font-size: 11px;
  font-weight: 700;
}

.my-booking-panel__description {
  margin: 10px 0 0;
  color: var(--theme-muted);
  font-size: 12px;
  line-height: 1.6;
}

.my-booking-panel__actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 9px;
  margin-top: 12px;
}

.my-booking-panel__actions button {
  display: inline-flex;
  min-width: 0;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 0 8px;
}

.my-logout-button {
  display: inline-flex;
  width: 100%;
  min-height: 46px;
  align-items: center;
  justify-content: center;
  gap: 7px;
  border: 1px solid var(--line);
  border-radius: 13px;
  background: color-mix(in srgb, var(--theme-surface) 76%, transparent);
  color: var(--theme-muted);
  font-size: 13px;
  font-weight: 700;
}

.my-logout-button:active {
  background: var(--theme-accent-bg);
}

@media (min-width: 640px) {
  .my-quick-action {
    min-height: 108px;
  }
}
</style>
