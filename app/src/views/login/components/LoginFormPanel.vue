<script setup lang="ts">
import { computed, shallowRef } from 'vue'

const account = defineModel<string>('account', { required: true })
const password = defineModel<string>('password', { required: true })
const captcha = defineModel<string>('captcha', { required: true })

const props = defineProps<{
  captchaText: string
  loading: boolean
  feedback: string
  feedbackType: 'success' | 'error'
}>()

const emit = defineEmits<{
  submit: []
  refreshCaptcha: []
  openRegister: []
  openBooking: []
  openOrderQuery: []
}>()

const showPassword = shallowRef(false)
const passwordToggleLabel = computed(() => (showPassword.value ? '隐藏密码' : '显示密码'))
const feedbackClass = computed(() =>
  props.feedbackType === 'error' ? 'login-feedback--error' : 'login-feedback--success',
)
</script>

<template>
  <form class="login-panel" @submit.prevent="emit('submit')">
    <div class="login-panel__heading">
      <h2 class="login-panel__title">账号登录</h2>
      <span class="login-panel__badge">
        <i class="fa-solid fa-camera-retro" aria-hidden="true" />
        相机排单助手
      </span>
    </div>

    <div class="field-list">
      <label class="login-field">
        <span class="login-field__label">账号</span>
        <span class="input-shell">
          <i class="fa-regular fa-user" aria-hidden="true" />
          <input v-model="account" type="text" placeholder="请输入账号" autocomplete="username" />
        </span>
      </label>

      <label class="login-field">
        <span class="login-field__label">密码</span>
        <span class="input-shell">
          <i class="fa-solid fa-lock" aria-hidden="true" />
          <input
            v-model="password"
            :type="showPassword ? 'text' : 'password'"
            placeholder="请输入密码"
            autocomplete="current-password"
          />
          <button
            type="button"
            class="icon-button"
            :aria-label="passwordToggleLabel"
            :title="passwordToggleLabel"
            @click="showPassword = !showPassword"
          >
            <i
              class="fa-regular"
              :class="showPassword ? 'fa-eye-slash' : 'fa-eye'"
              aria-hidden="true"
            />
          </button>
        </span>
      </label>

      <label class="login-field">
        <span class="login-field__label">验证码</span>
        <span class="captcha-layout">
          <span class="input-shell">
            <i class="fa-solid fa-shield-heart" aria-hidden="true" />
            <input
              v-model="captcha"
              type="text"
              maxlength="4"
              placeholder="输入验证码"
              autocomplete="off"
            />
          </span>
          <button
            type="button"
            class="captcha-button"
            aria-label="刷新验证码"
            title="刷新验证码"
            @click="emit('refreshCaptcha')"
          >
            <span>{{ captchaText }}</span>
            <i class="fa-solid fa-rotate-right" aria-hidden="true" />
          </button>
        </span>
      </label>
    </div>

    <p v-if="feedback" class="login-feedback" :class="feedbackClass" role="status">
      {{ feedback }}
    </p>

    <button type="submit" class="primary-button" :disabled="loading">
      <i
        class="fa-solid"
        :class="loading ? 'fa-spinner fa-spin' : 'fa-camera'"
        aria-hidden="true"
      />
      {{ loading ? '正在登录' : '登录' }}
    </button>

    <div class="entry-divider">其他入口</div>

    <div class="secondary-actions">
      <button type="button" class="secondary-button" @click="emit('openRegister')">
        <i class="fa-solid fa-user-plus" aria-hidden="true" />
        注册账号
      </button>
      <button type="button" class="secondary-button" @click="emit('openBooking')">
        <i class="fa-solid fa-calendar-plus" aria-hidden="true" />
        预约拍摄
      </button>
    </div>

    <button type="button" class="order-link" @click="emit('openOrderQuery')">
      <i class="fa-solid fa-magnifying-glass" aria-hidden="true" />
      查询订单
      <i class="fa-solid fa-chevron-right" aria-hidden="true" />
    </button>
  </form>
</template>

<style scoped>
.login-panel {
  position: relative;
  z-index: 1;
  margin-top: 18px;
  border: 1px solid var(--theme-form-border);
  border-radius: 18px;
  padding: 18px 16px 16px;
  background: var(--theme-surface);
  box-shadow: 0 14px 30px var(--theme-shadow);
}

.login-panel__heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 15px;
}

.login-panel__title {
  margin: 0;
  color: var(--ink);
  font-size: 16px;
  font-weight: 800;
}

.login-panel__badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  border-radius: 999px;
  padding: 5px 8px;
  background: var(--theme-accent-bg);
  color: var(--theme-accent-strong);
  font-size: 9px;
  font-weight: 800;
}

.field-list {
  display: grid;
  gap: 11px;
}

.login-field {
  display: block;
}

.login-field__label {
  display: block;
  margin-bottom: 5px;
  color: var(--theme-muted);
  font-size: 11px;
  font-weight: 700;
}

.input-shell {
  display: grid;
  min-height: 48px;
  grid-template-columns: 22px minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  border: 1px solid var(--theme-form-border);
  border-radius: 11px;
  padding: 0 11px;
  background: var(--theme-surface);
  transition:
    border-color 150ms ease,
    box-shadow 150ms ease;
}

.input-shell:focus-within {
  border-color: var(--theme-accent);
  box-shadow: 0 0 0 3px var(--theme-focus-ring);
}

.input-shell > i {
  color: var(--theme-accent-strong);
  font-size: 13px;
  text-align: center;
}

.input-shell input {
  min-width: 0;
  height: 44px;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--ink);
  font-size: 13px;
}

.input-shell input::placeholder {
  color: var(--theme-muted-soft);
  opacity: 0.75;
}

.icon-button {
  display: inline-flex;
  width: 34px;
  height: 34px;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--theme-muted-soft);
  cursor: pointer;
}

.icon-button:hover {
  background: var(--theme-accent-bg);
  color: var(--theme-accent-strong);
}

.icon-button:focus-visible {
  outline: 2px solid var(--theme-focus-ring);
}

.captcha-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 108px;
  gap: 8px;
}

.captcha-button {
  position: relative;
  display: flex;
  min-height: 48px;
  align-items: center;
  justify-content: center;
  gap: 6px;
  overflow: hidden;
  border: 1px solid var(--theme-accent-soft);
  border-radius: 11px;
  background: var(--theme-accent-bg);
  color: var(--theme-accent-strong);
  font-weight: 800;
  box-shadow: 0 5px 12px var(--theme-shadow);
  cursor: pointer;
}

.captcha-button::before,
.captcha-button::after {
  position: absolute;
  width: 26px;
  height: 1px;
  background: var(--theme-accent-soft);
  content: '';
}

.captcha-button::before {
  top: 12px;
  left: -5px;
  transform: rotate(18deg);
}

.captcha-button::after {
  right: -5px;
  bottom: 11px;
  transform: rotate(-15deg);
}

.captcha-button span,
.captcha-button i {
  position: relative;
  z-index: 1;
}

.captcha-button span {
  font-family: 'ZCOOL KuaiLe', 'Microsoft YaHei', sans-serif;
  font-size: 15px;
}

.captcha-button i {
  font-size: 9px;
}

.captcha-button:focus-visible {
  outline: 2px solid var(--theme-focus-ring);
  outline-offset: 2px;
}

.login-feedback {
  margin: 9px 0 0;
  font-size: 11px;
  line-height: 1.5;
}

.login-feedback--error {
  color: #e4517d;
}

.login-feedback--success {
  color: var(--theme-status);
}

.primary-button {
  display: inline-flex;
  width: 100%;
  min-height: 48px;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 0;
  border-radius: 12px;
  margin-top: 16px;
  background: var(--theme-accent-strong);
  color: var(--theme-on-accent);
  font-size: 13px;
  font-weight: 800;
  box-shadow: 0 10px 18px rgba(var(--theme-accent-rgb), 0.24);
  cursor: pointer;
}

.primary-button:hover {
  background: var(--theme-accent);
}

.primary-button:active {
  transform: scale(0.99);
}

.primary-button:disabled {
  cursor: wait;
  opacity: 0.72;
}

.primary-button:focus-visible,
.secondary-button:focus-visible,
.order-link:focus-visible {
  outline: 3px solid var(--theme-focus-ring);
  outline-offset: 2px;
}

.entry-divider {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: center;
  gap: 10px;
  margin: 15px 0 10px;
  color: var(--theme-muted-soft);
  font-size: 9px;
}

.entry-divider::before,
.entry-divider::after {
  height: 1px;
  background: var(--theme-form-border);
  content: '';
}

.secondary-actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.secondary-button {
  display: inline-flex;
  min-height: 44px;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: 1px solid var(--theme-accent-soft);
  border-radius: 11px;
  background: var(--theme-surface);
  color: var(--theme-accent-strong);
  font-size: 11px;
  font-weight: 800;
  cursor: pointer;
}

.secondary-button:hover {
  background: var(--theme-accent-bg);
}

.order-link {
  display: flex;
  min-height: 44px;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: 0;
  margin: 6px auto 0;
  background: transparent;
  color: var(--theme-muted);
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
}

.order-link i:last-child {
  font-size: 8px;
}

@media (max-width: 359px) {
  .login-panel {
    padding-right: 12px;
    padding-left: 12px;
  }

  .captcha-layout {
    grid-template-columns: minmax(0, 1fr) 98px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .input-shell,
  .primary-button {
    transition-duration: 0.01ms;
  }
}
</style>
