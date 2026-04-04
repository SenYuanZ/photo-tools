<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Button, CellGroup, Field, Picker, Popup } from 'vant'
import { authApi } from '../api/app'
import AuthCameraBanner from '../components/AuthCameraBanner.vue'
import { useAppStore } from '../stores/app'

const router = useRouter()
const store = useAppStore()
const ROLE_KEY = 'photo_order_role'

const form = reactive({
  account: '',
  nickname: '',
  password: '',
  confirmPassword: '',
  inviteCode: '',
  role: 'photographer',
  captcha: '',
})

const loading = ref(false)
const feedback = ref('')
const feedbackType = ref<'success' | 'error'>('success')
const showRolePicker = ref(false)

const roleColumns = [
  { text: '摄影师', value: 'photographer' },
  { text: '妆娘', value: 'makeup_artist' },
]

const roleLabel = computed(() =>
  roleColumns.find((item) => item.value === form.role)?.text ?? '请选择账号身份',
)

const makeCaptcha = () =>
  Math.random()
    .toString(36)
    .slice(2, 6)
    .toUpperCase()

const captchaText = ref(makeCaptcha())

const canSubmit = computed(
  () =>
    Boolean(form.account && form.nickname && form.password && form.confirmPassword && form.inviteCode && form.captcha),
)

const feedbackClass = computed(() => (feedbackType.value === 'error' ? 'text-rose-500' : 'text-blue-500'))

const setFeedback = (type: 'success' | 'error', message: string) => {
  feedbackType.value = type
  feedback.value = message
}

const refreshCaptcha = () => {
  captchaText.value = makeCaptcha()
}

const submit = async () => {
  feedback.value = ''

  if (!canSubmit.value) {
    setFeedback('error', '请先完整填写注册信息。')
    return
  }

  if (form.password !== form.confirmPassword) {
    setFeedback('error', '两次输入的密码不一致。')
    return
  }

  if (form.captcha.trim().toUpperCase() !== captchaText.value) {
    setFeedback('error', '验证码不正确，请重试。')
    refreshCaptcha()
    return
  }

  loading.value = true
  try {
    localStorage.setItem(ROLE_KEY, form.role)
    await authApi.register({
      account: form.account.trim(),
      nickname: form.nickname.trim(),
      password: form.password,
      inviteCode: form.inviteCode.trim().toUpperCase(),
      role: form.role as 'photographer' | 'makeup_artist',
    })

    setFeedback('success', '注册成功，正在自动登录...')
    await store.login({
      account: form.account.trim(),
      password: form.password,
    })

    router.replace({ name: 'home' })
  } catch (requestError) {
    setFeedback('error', (requestError as Error).message || '注册失败，请稍后重试')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <section class="auth-shell bounce-in">
    <AuthCameraBanner subtitle="创建服务者账号" tip="可注册摄影师或妆娘账号，邀请码通过后即可进入排单管理。" />

    <article class="card auth-card p-4">
      <div class="mb-2 flex items-center justify-between">
        <p class="title-font text-xl text-rose-500">账号注册</p>
        <button class="chip" type="button" @click="router.push({ name: 'login' })">
          <i class="fa-solid fa-chevron-left" />返回登录
        </button>
      </div>

      <CellGroup inset>
        <Field v-model="form.account" label="账号" placeholder="3-32位，字母数字下划线" clearable />
        <Field :model-value="roleLabel" label="账号身份" readonly is-link @click="showRolePicker = true" />
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

      <p v-if="feedback" class="mt-2 text-xs" :class="feedbackClass">{{ feedback }}</p>

      <Button block round type="primary" class="mt-4" :loading="loading" @click="submit">
        <i class="fa-solid fa-camera mr-1" />注册并登录
      </Button>
    </article>

    <Popup v-model:show="showRolePicker" position="bottom" round>
      <Picker
        :columns="roleColumns"
        @cancel="showRolePicker = false"
        @confirm="({ selectedOptions }: any) => { form.role = selectedOptions[0]?.value || form.role; showRolePicker = false }"
      />
    </Popup>
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
</style>
