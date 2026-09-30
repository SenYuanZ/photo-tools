<script setup lang="ts">
import { computed, reactive, shallowRef } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import LoginCameraMascot from './components/LoginCameraMascot.vue'
import LoginFormPanel from './components/LoginFormPanel.vue'

const router = useRouter()
const store = useAuthStore()

const form = reactive({
  account: '',
  password: '',
  captcha: '',
})

if (import.meta.env.DEV) {
  form.account = 'lina_photo'
  form.password = '123456'
}

const loading = shallowRef(false)
const feedback = shallowRef('')
const feedbackType = shallowRef<'success' | 'error'>('success')

const makeCaptcha = () => Math.random().toString(36).slice(2, 6).toUpperCase()

const captchaText = shallowRef(makeCaptcha())
const canSubmit = computed(() => Boolean(form.account && form.password && form.captcha))

const setFeedback = (type: 'success' | 'error', message: string) => {
  feedbackType.value = type
  feedback.value = message
}

const refreshCaptcha = () => {
  captchaText.value = makeCaptcha()
  form.captcha = ''
}

const submit = async () => {
  if (!canSubmit.value) {
    setFeedback('error', '请先填写账号、密码和验证码。')
    return
  }

  if (form.captcha.trim().toUpperCase() !== captchaText.value) {
    setFeedback('error', '验证码不正确，请重试。')
    refreshCaptcha()
    return
  }

  loading.value = true
  setFeedback('success', '登录成功，正在进入首页...')
  try {
    await store.login({
      account: form.account.trim(),
      password: form.password,
    })
    window.setTimeout(() => {
      router.replace({ name: 'home' })
    }, 320)
  } catch (error) {
    setFeedback('error', (error as Error).message || '登录失败，请稍后重试')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <section class="login-page bounce-in">
    <LoginCameraMascot />
    <LoginFormPanel
      v-model:account="form.account"
      v-model:password="form.password"
      v-model:captcha="form.captcha"
      :captcha-text="captchaText"
      :loading="loading"
      :feedback="feedback"
      :feedback-type="feedbackType"
      @submit="submit"
      @refresh-captcha="refreshCaptcha"
      @open-register="router.push({ name: 'register' })"
      @open-booking="router.push({ name: 'model-booking' })"
      @open-order-query="router.push({ name: 'order-query' })"
    />
  </section>
</template>

<style scoped>
.login-page {
  width: min(440px, 100%);
  min-height: calc(100vh - 32px);
  margin: 0 auto;
  padding: 8px 0 30px;
}

@media (min-width: 720px) {
  .login-page {
    min-height: auto;
    border: 1px solid var(--theme-form-border);
    border-radius: 18px;
    padding: 24px 16px 30px;
    background: var(--theme-accent-bg);
    box-shadow: 0 18px 44px rgba(52, 68, 92, 0.08);
  }
}
</style>
