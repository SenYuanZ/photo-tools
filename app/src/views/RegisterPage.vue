<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Button, CellGroup, Field } from 'vant'
import { authApi } from '../api/app'
import { useAppStore } from '../stores/app'

const router = useRouter()
const store = useAppStore()

const form = reactive({
  account: '',
  nickname: '',
  password: '',
  confirmPassword: '',
  inviteCode: '',
  captcha: '',
})

const loading = ref(false)
const error = ref('')
const success = ref('')

const makeCaptcha = () =>
  Math.random()
    .toString(36)
    .slice(2, 6)
    .toUpperCase()

const captchaText = ref(makeCaptcha())

const refreshCaptcha = () => {
  captchaText.value = makeCaptcha()
}

const canSubmit = computed(
  () =>
    Boolean(form.account && form.nickname && form.password && form.confirmPassword && form.inviteCode && form.captcha),
)

const submit = async () => {
  error.value = ''
  success.value = ''

  if (!canSubmit.value) {
    error.value = '请先完整填写注册信息。'
    return
  }

  if (form.password !== form.confirmPassword) {
    error.value = '两次输入的密码不一致。'
    return
  }

  if (form.captcha.trim().toUpperCase() !== captchaText.value) {
    error.value = '验证码不正确，请重试。'
    refreshCaptcha()
    return
  }

  loading.value = true
  try {
    await authApi.register({
      account: form.account.trim(),
      nickname: form.nickname.trim(),
      password: form.password,
      inviteCode: form.inviteCode.trim().toUpperCase(),
    })

    success.value = '注册成功，正在自动登录...'
    await store.login({
      account: form.account.trim(),
      password: form.password,
    })

    router.replace({ name: 'home' })
  } catch (requestError) {
    error.value = (requestError as Error).message || '注册失败，请稍后重试'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <section class="bounce-in">
    <article class="card mb-4 p-4 soft-pink">
      <div class="mb-2 flex items-center justify-between">
        <p class="title-font text-2xl text-rose-500">摄影师注册</p>
        <button class="chip" type="button" @click="router.push({ name: 'login' })">
          <i class="fa-solid fa-chevron-left" />返回登录
        </button>
      </div>
      <p class="text-xs text-slate-600">
        注册需邀请码。邀请码由已登录摄影师在「个人设置 - 邀请码管理」中维护。
      </p>
    </article>

    <article class="card p-3">
      <CellGroup inset>
        <Field v-model="form.account" label="账号" placeholder="3-32位，字母数字下划线" clearable />
        <Field v-model="form.nickname" label="昵称" placeholder="例如：林娜摄影" clearable />
        <Field v-model="form.password" label="密码" type="password" placeholder="至少 6 位" />
        <Field v-model="form.confirmPassword" label="确认密码" type="password" placeholder="请再次输入密码" />
        <Field v-model="form.inviteCode" label="邀请码" placeholder="请输入邀请码" clearable />
        <Field v-model="form.captcha" label="验证码" placeholder="请输入图形验证码" clearable>
          <template #button>
            <button type="button" class="captcha-btn" @click="refreshCaptcha">
              <span class="captcha-code">{{ captchaText }}</span>
              <i class="fa-solid fa-rotate-right text-[10px]" />
            </button>
          </template>
        </Field>
      </CellGroup>
    </article>

    <p v-if="error" class="mt-2 text-xs text-rose-500">{{ error }}</p>
    <p v-if="success" class="mt-2 text-xs text-blue-500">{{ success }}</p>

    <Button block round type="primary" class="mt-4" :loading="loading" @click="submit">
      <i class="fa-solid fa-user-plus mr-1" />注册并登录
    </Button>
  </section>
</template>

<style scoped>
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
}

.captcha-code {
  letter-spacing: 1px;
  font-family: 'ZCOOL KuaiLe', cursive;
}
</style>
