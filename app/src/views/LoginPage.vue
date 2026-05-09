<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Button, CellGroup, Field } from 'vant'
import AuthCameraBanner from '../components/AuthCameraBanner.vue'
import { useAppStore } from '../stores/app'

const router = useRouter()
const store = useAppStore()

const form = reactive({
  account: '',
  password: '',
  captcha: '',
})

if (import.meta.env.DEV) {
  form.account = 'lina_photo'
  form.password = '123456'
}

const loading = ref(false)
const feedback = ref('')
const feedbackType = ref<'success' | 'error'>('success')

const makeCaptcha = () =>
  Math.random()
    .toString(36)
    .slice(2, 6)
    .toUpperCase()

const captchaText = ref(makeCaptcha())

const canSubmit = computed(() => Boolean(form.account && form.password && form.captcha))
const feedbackClass = computed(() => (feedbackType.value === 'error' ? 'text-rose-500' : 'text-blue-500'))

const setFeedback = (type: 'success' | 'error', message: string) => {
  feedbackType.value = type
  feedback.value = message
}

const refreshCaptcha = () => {
  captchaText.value = makeCaptcha()
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
  <section class="auth-shell bounce-in">
    <AuthCameraBanner />

    <article class="card auth-card p-4">
      <p class="title-font text-xl text-rose-500">账号登录</p>
      <p class="mt-1 text-xs text-slate-500">马卡龙相机主题，轻松进入你的排单工作台</p>

      <CellGroup inset class="mt-3">
        <Field v-model="form.account" label="账号" placeholder="请输入账号" clearable>
          <template #left-icon>
            <i class="fa-solid fa-user field-icon" />
          </template>
        </Field>
        <Field v-model="form.password" label="密码" type="password" placeholder="请输入密码">
          <template #left-icon>
            <i class="fa-solid fa-lock field-icon" />
          </template>
        </Field>
        <Field v-model="form.captcha" label="验证码" placeholder="请输入图形验证码" clearable>
          <template #left-icon>
            <i class="fa-solid fa-camera-retro field-icon" />
          </template>
          <template #button>
            <button type="button" class="captcha-btn" @click="refreshCaptcha">
              <span class="captcha-code">{{ captchaText }}</span>
              <i class="fa-solid fa-rotate-right text-[10px]" />
            </button>
          </template>
        </Field>
      </CellGroup>

      <p v-if="feedback" class="mt-2 text-xs" :class="feedbackClass">{{ feedback }}</p>

      <Button block round type="primary" class="mt-4" :loading="loading" @click="submit">
        <i class="fa-solid fa-camera mr-1" />登录进入首页
      </Button>

      <div class="mt-2 grid grid-cols-2 gap-2">
        <Button block round plain type="primary" @click="router.push({ name: 'register' })">注册账号</Button>
        <Button block round plain type="primary" @click="router.push({ name: 'model-booking' })">模特约拍入口</Button>
      </div>

      <Button block round plain type="primary" class="mt-2" @click="router.push({ name: 'order-query' })">
        查询订单详情
      </Button>
    </article>

    <article class="card auth-tip mt-3 p-3 soft-yellow">
      <p>
        <i class="fa-regular fa-lightbulb mr-1 text-amber-500" />登录方式：账号 + 密码 + 图形验证码。界面采用软萌相机风格，与应用整体主题保持一致。
      </p>
    </article>
  </section>
</template>

<style scoped>
.auth-shell {
  margin: 0 auto;
  max-width: 520px;
}

.auth-card {
  border-radius: 22px;
  box-shadow: 0 12px 24px rgba(255, 127, 174, 0.12);
}

.field-icon {
  color: var(--theme-accent);
}

.captcha-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 1px solid var(--theme-accent-soft);
  border-radius: 10px;
  background: linear-gradient(135deg, var(--theme-accent-bg) 0%, #ffffff 100%);
  padding: 4px 8px;
  color: var(--theme-accent-strong);
  font-weight: 800;
  cursor: pointer;
  box-shadow: 0 4px 10px var(--theme-shadow);
}

.captcha-code {
  letter-spacing: 1px;
  font-family: 'ZCOOL KuaiLe', cursive;
}

.auth-tip {
  border-radius: 18px;
  font-size: 12px;
  line-height: 1.5;
  color: #6f667f;
}
</style>
