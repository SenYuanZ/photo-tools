<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Button, CellGroup, Field } from 'vant'
import { useAppStore } from '../stores/app'

type Mood = 'idle' | 'typing' | 'secret' | 'ready' | 'party' | 'oops'
type CaptchaGlyph = {
  char: string
  tilt: number
  shift: number
}

const store = useAppStore()
const route = useRoute()
const router = useRouter()

const form = reactive({
  account: 'lina_photo',
  password: '123456',
  code: '',
})

const makeCaptcha = () =>
  Math.random()
    .toString(36)
    .slice(2, 6)
    .toUpperCase()

const captchaText = ref(makeCaptcha())
const makeCaptchaGlyphs = (text: string): CaptchaGlyph[] =>
  text.split('').map((char) => ({
    char,
    tilt: Math.floor(Math.random() * 25) - 12,
    shift: Math.floor(Math.random() * 4) - 2,
  }))

const captchaGlyphs = ref<CaptchaGlyph[]>(makeCaptchaGlyphs(captchaText.value))
const captchaRefreshing = ref(false)

const feedback = ref('')
const mood = ref<Mood>('idle')
const shake = ref(false)
const partyMode = ref(false)
const showHint = ref(false)
const stars = ref<number[]>([])
const mascotTapCount = ref(0)
let resetTimer = 0

watch(
  () => [form.account, form.password],
  ([account, password]) => {
    if (partyMode.value) {
      mood.value = 'party'
      return
    }
    if (!account && !password) {
      mood.value = 'idle'
      return
    }
    if (password.length >= 6) {
      mood.value = 'ready'
      return
    }
    mood.value = 'typing'
  },
  { immediate: true },
)

const mascotFace = computed(() => {
  if (mood.value === 'party') return '🥳'
  if (mood.value === 'secret') return '😼'
  if (mood.value === 'ready') return '🤩'
  if (mood.value === 'oops') return '🙃'
  if (mood.value === 'typing') return '😵‍💫'
  return '📸'
})

const mascotText = computed(() => {
  if (mood.value === 'party') return '彩蛋模式开启！今天每一单都顺顺利利～'
  if (mood.value === 'secret') return '被你发现了！再点几下我就开派对~'
  if (mood.value === 'ready') return '状态拉满，准备进入排单世界！'
  if (mood.value === 'oops') return '别慌，拍拍相机就恢复啦。'
  if (mood.value === 'typing') return '我在认真盯着你输入账号哦...'
  return '欢迎回来，今天也拍出可爱大片！'
})

const triggerStars = () => {
  stars.value = Array.from({ length: 14 }, (_, index) => index)
  window.setTimeout(() => {
    stars.value = []
  }, 1400)
}

const tapMascot = () => {
  mascotTapCount.value += 1
  if (mascotTapCount.value >= 3) {
    showHint.value = true
    mood.value = 'secret'
  }
  if (mascotTapCount.value >= 5) {
    partyMode.value = !partyMode.value
    mood.value = partyMode.value ? 'party' : 'idle'
    feedback.value = partyMode.value
      ? '彩蛋解锁：搞怪派对模式已开启！'
      : '彩蛋模式已关闭，恢复正常登录。'
    triggerStars()
    mascotTapCount.value = 0
    showHint.value = false
  }

  window.clearTimeout(resetTimer)
  resetTimer = window.setTimeout(() => {
    mascotTapCount.value = 0
    showHint.value = false
    if (!partyMode.value) {
      mood.value = form.account || form.password ? 'typing' : 'idle'
    }
  }, 1800)
}

const setOops = (message: string) => {
  feedback.value = message
  mood.value = 'oops'
  shake.value = true
  window.setTimeout(() => {
    shake.value = false
    if (!partyMode.value) {
      mood.value = form.account || form.password ? 'typing' : 'idle'
    }
  }, 500)
}

const refreshCaptcha = () => {
  captchaText.value = makeCaptcha()
  captchaGlyphs.value = makeCaptchaGlyphs(captchaText.value)
  captchaRefreshing.value = true
  window.setTimeout(() => {
    captchaRefreshing.value = false
  }, 260)
}

const submit = async () => {
  if (!form.account || !form.password) {
    setOops('账号和密码都要填哦，不然相机会闹小脾气。')
    return
  }

  if (!form.code || form.code.replace(/\s+/g, '').toUpperCase() !== captchaText.value) {
    setOops('验证码不正确，请再试一次。')
    refreshCaptcha()
    return
  }

  if (form.account.includes('彩蛋') || form.password === '5201314') {
    partyMode.value = true
    mood.value = 'party'
    triggerStars()
    feedback.value = '隐藏口令命中！已自动切换到派对模式。'
  } else {
    feedback.value = '登录成功，正在带你进入首页...'
  }

  try {
    await store.login({ account: form.account, password: form.password })
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/home'
    window.setTimeout(() => {
      router.push(redirect)
    }, 550)
  } catch (error) {
    setOops((error as Error).message || '登录失败，请稍后重试')
  }
}
</script>

<template>
  <section class="relative bounce-in overflow-hidden pb-1">
    <div
      class="relative mb-4 overflow-hidden rounded-3xl border border-rose-100 p-4"
      :class="[partyMode ? 'party-bg' : 'soft-pink', shake ? 'shake' : '']"
    >
      <div class="pointer-events-none absolute inset-0 opacity-70">
        <span
          v-for="n in stars"
          :key="n"
          class="star-burst"
          :style="{
            left: `${8 + ((n * 7) % 84)}%`,
            top: `${10 + ((n * 9) % 76)}%`,
            animationDelay: `${(n % 5) * 70}ms`,
          }"
          >✨</span
        >
      </div>

      <div class="relative z-10 flex items-center gap-3">
        <button
          type="button"
          class="mascot-btn"
          :class="partyMode ? 'mascot-party' : ''"
          @click="tapMascot"
        >
          <span class="text-3xl">{{ mascotFace }}</span>
        </button>
        <div>
          <p class="title-font text-2xl text-rose-500">摄影排单小助手</p>
          <p class="text-xs text-slate-600">{{ mascotText }}</p>
          <p v-if="showHint" class="mt-1 text-[11px] text-blue-500">再戳几下相机试试，有惊喜！</p>
        </div>
      </div>
    </div>

    <article class="card p-4">
      <CellGroup inset>
        <Field
          v-model="form.account"
          label="账号"
          placeholder="请输入账号"
          clearable
          @focus="mood = partyMode ? 'party' : 'typing'"
        >
          <template #left-icon>
            <i class="fa-solid fa-user-astronaut field-icon" />
          </template>
        </Field>
        <Field
          v-model="form.password"
          label="密码"
          type="password"
          placeholder="请输入密码"
          @focus="mood = partyMode ? 'party' : 'typing'"
        >
          <template #left-icon>
            <i class="fa-solid fa-key field-icon" />
          </template>
        </Field>
        <Field v-model="form.code" label="验证码" placeholder="请输入图形验证码" clearable>
          <template #left-icon>
            <i class="fa-solid fa-shield-halved field-icon" />
          </template>
          <template #button>
            <button
              type="button"
              class="captcha-btn"
              :class="{ refreshing: captchaRefreshing }"
              @click="refreshCaptcha"
            >
              <span class="captcha-code-wrap">
                <span
                  v-for="(glyph, index) in captchaGlyphs"
                  :key="`${glyph.char}-${index}`"
                  class="captcha-code"
                  :style="{
                    transform: `translateY(${glyph.shift}px) rotate(${glyph.tilt}deg)`,
                  }"
                  >{{ glyph.char }}</span
                >
              </span>
              <i class="fa-solid fa-rotate-right text-[10px]" />
            </button>
          </template>
        </Field>
      </CellGroup>

      <p v-if="feedback" class="mt-2 text-xs" :class="partyMode ? 'text-blue-500' : 'text-rose-500'">
        {{ feedback }}
      </p>

      <Button block round type="primary" class="mt-4" @click="submit">
        <i class="fa-solid fa-sparkles mr-1" />登录并开始排单
      </Button>
      <div class="mt-2 grid grid-cols-2 gap-2">
        <Button block round plain type="primary">忘记密码</Button>
        <Button block round plain type="primary">注册账号</Button>
      </div>
      <Button block round plain type="primary" class="mt-2" @click="router.push({ name: 'model-booking' })">
        <i class="fa-regular fa-calendar-check mr-1" />模特免登录约拍入口
      </Button>
    </article>

    <article class="card mt-4 p-3 text-xs soft-yellow">
      <p>
        <i class="fa-regular fa-lightbulb mr-1 text-amber-500" />登录方式：账号 + 密码 + 图形验证码。互动彩蛋：连续点击顶部相机头像 5
        次，可切换搞怪派对模式。
      </p>
    </article>
  </section>
</template>

<style scoped>
.party-bg {
  background:
    radial-gradient(circle at 18% 20%, #ffe4f0 0%, transparent 36%),
    radial-gradient(circle at 80% 18%, #dff1ff 0%, transparent 33%),
    radial-gradient(circle at 48% 84%, #fff3cc 0%, transparent 35%),
    linear-gradient(130deg, #fff8fc 0%, #f2fbff 45%, #fff9e8 100%);
}

.mascot-btn {
  display: grid;
  place-items: center;
  width: 62px;
  height: 62px;
  border-radius: 18px;
  border: 1px solid #ffd4e7;
  background: #fff;
  box-shadow: 0 10px 18px rgba(255, 127, 174, 0.16);
  transition: transform 180ms ease;
}

.mascot-btn:active {
  transform: scale(0.94) rotate(-8deg);
}

.mascot-party {
  animation: wiggle 700ms ease-in-out infinite;
}

.star-burst {
  position: absolute;
  opacity: 0;
  animation: burst 900ms ease-out forwards;
}

.shake {
  animation: shake 360ms ease-in-out;
}

:deep(.van-cell-group--inset) {
  margin: 0;
  border-radius: 14px;
}

:deep(.van-cell) {
  background: #fff;
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
  transition: transform 180ms ease;
}

.captcha-btn:active {
  transform: scale(0.96);
}

.captcha-btn.refreshing {
  animation: captcha-pop 260ms ease;
}

.captcha-code-wrap {
  display: inline-flex;
  gap: 2px;
}

.captcha-code {
  display: inline-block;
  letter-spacing: 1px;
  font-family: 'ZCOOL KuaiLe', cursive;
  font-size: 13px;
  color: var(--theme-accent-strong);
}

@keyframes wiggle {
  0%,
  100% {
    transform: rotate(0deg);
  }
  25% {
    transform: rotate(-8deg);
  }
  75% {
    transform: rotate(8deg);
  }
}

@keyframes burst {
  0% {
    opacity: 0;
    transform: translateY(8px) scale(0.6);
  }
  30% {
    opacity: 1;
  }
  100% {
    opacity: 0;
    transform: translateY(-28px) scale(1.1);
  }
}

@keyframes shake {
  0%,
  100% {
    transform: translateX(0);
  }
  25% {
    transform: translateX(-6px);
  }
  50% {
    transform: translateX(6px);
  }
  75% {
    transform: translateX(-4px);
  }
}

@keyframes captcha-pop {
  0% {
    transform: scale(0.92) rotate(-1deg);
  }
  100% {
    transform: scale(1) rotate(0deg);
  }
}
</style>
