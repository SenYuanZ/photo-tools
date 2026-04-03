<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'

withDefaults(
  defineProps<{
    title?: string
    subtitle?: string
    tip?: string
  }>(),
  {
    title: '您好，欢迎使用呀',
    subtitle: '软萌相机排单助手',
    tip: '记录每一次拍摄灵感，今天也一起轻松排单吧。',
  },
)

type Spark = {
  id: number
  x: number
  y: number
  delay: number
}

const badgeTextList = ['Hi', '咔嚓', '拍好啦']
const hintTextList = ['点一点相机，会有快门特效', '快门灵感已加载，今天拍摄超顺利', '咔嚓一下，记录今天的可爱订单']

const badgeText = ref('Hi')
const hintText = ref(hintTextList[0])
const isShooting = ref(false)
const sparks = ref<Spark[]>([])

let shootTimer = 0
let sparkTimer = 0
let shotCount = 0

const playShutter = () => {
  shotCount += 1
  badgeText.value = badgeTextList[shotCount % badgeTextList.length]
  hintText.value = hintTextList[shotCount % hintTextList.length]

  isShooting.value = true
  sparks.value = Array.from({ length: 8 }, (_, index) => ({
    id: shotCount * 10 + index,
    x: Math.floor(Math.random() * 72) + 14,
    y: Math.floor(Math.random() * 72) + 14,
    delay: index * 35,
  }))

  window.clearTimeout(shootTimer)
  shootTimer = window.setTimeout(() => {
    isShooting.value = false
  }, 360)

  window.clearTimeout(sparkTimer)
  sparkTimer = window.setTimeout(() => {
    sparks.value = []
  }, 920)
}

onBeforeUnmount(() => {
  window.clearTimeout(shootTimer)
  window.clearTimeout(sparkTimer)
})
</script>

<template>
  <header class="auth-banner">
    <div class="auth-banner__text">
      <p class="title-font text-2xl text-white">{{ title }}</p>
      <p class="mt-1 text-xs text-rose-50">{{ subtitle }}</p>
      <p class="mt-2 text-[11px] text-rose-100/95">{{ tip }}</p>
      <p class="mt-1 text-[11px] text-rose-50/95">{{ hintText }}</p>
    </div>

    <button
      type="button"
      class="camera-avatar"
      :class="{ shooting: isShooting }"
      aria-label="播放相机快门特效"
      @click="playShutter"
    >
      <span class="wave-badge">{{ badgeText }}</span>
      <span class="camera-top" />
      <span class="camera-body">
        <span class="camera-lens">
          <span class="camera-lens-core" />
        </span>
        <span class="camera-flash" />
      </span>
      <span class="flash-mask" />
      <span
        v-for="spark in sparks"
        :key="spark.id"
        class="spark"
        :style="{
          left: `${spark.x}%`,
          top: `${spark.y}%`,
          animationDelay: `${spark.delay}ms`,
        }"
      >
        ✦
      </span>
    </button>
  </header>
</template>

<style scoped>
.auth-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  border-radius: 24px;
  background:
    radial-gradient(circle at 18% 24%, rgba(255, 255, 255, 0.25) 0%, transparent 44%),
    radial-gradient(circle at 85% 8%, rgba(255, 255, 255, 0.34) 0%, transparent 38%),
    linear-gradient(140deg, #ff8db8 0%, #ffb6cf 55%, #ffc8dd 100%);
  padding: 18px 16px;
  box-shadow: 0 12px 20px rgba(255, 127, 174, 0.24);
}

.auth-banner__text {
  min-width: 0;
}

.camera-avatar {
  position: relative;
  width: 104px;
  height: 104px;
  border-radius: 999px;
  background: linear-gradient(145deg, #fff9fc 0%, #ffffff 100%);
  border: 2px solid #ffd8e9;
  display: grid;
  place-items: center;
  box-shadow: 0 10px 18px rgba(255, 127, 174, 0.2);
  flex-shrink: 0;
  cursor: pointer;
  outline: none;
  transition: transform 180ms ease, box-shadow 180ms ease;
}

.camera-avatar:active {
  transform: scale(0.96) rotate(-2deg);
}

.camera-avatar:focus-visible {
  box-shadow:
    0 0 0 3px rgba(255, 255, 255, 0.58),
    0 0 0 6px rgba(255, 127, 174, 0.35);
}

.camera-avatar.shooting {
  transform: scale(1.03) rotate(2deg);
  box-shadow: 0 15px 28px rgba(255, 127, 174, 0.35);
}

.wave-badge {
  position: absolute;
  top: -4px;
  right: -2px;
  border-radius: 999px;
  background: #fff;
  color: #ff6da1;
  font-size: 10px;
  font-weight: 800;
  padding: 3px 7px;
  border: 1px solid #ffd5e8;
}

.camera-top {
  position: absolute;
  top: 29px;
  width: 24px;
  height: 8px;
  border-radius: 8px;
  background: #ff8ab5;
}

.camera-body {
  position: relative;
  width: 58px;
  height: 40px;
  border-radius: 15px;
  background: linear-gradient(145deg, #ff7dad 0%, #ff98bf 100%);
  border: 2px solid #ff6ea3;
  box-shadow: inset 0 5px 7px rgba(255, 255, 255, 0.22);
}

.camera-lens {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 26px;
  height: 26px;
  border-radius: 999px;
  background: linear-gradient(150deg, #ffe6f1 0%, #fff 100%);
  border: 2px solid #ffc0da;
  display: grid;
  place-items: center;
}

.camera-lens-core {
  width: 11px;
  height: 11px;
  border-radius: 999px;
  background: radial-gradient(circle at 32% 30%, #a9d9ff 0%, #7faef4 45%, #6385d7 100%);
}

.camera-flash {
  position: absolute;
  right: 7px;
  top: 7px;
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: #fff7d1;
  border: 1px solid #ffeaa3;
}

.flash-mask {
  pointer-events: none;
  position: absolute;
  inset: 0;
  border-radius: 999px;
  opacity: 0;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.82) 0%, rgba(255, 255, 255, 0) 70%);
}

.camera-avatar.shooting .flash-mask {
  animation: shutter-flash 320ms ease-out;
}

.spark {
  position: absolute;
  font-size: 11px;
  color: #fff;
  text-shadow: 0 1px 5px rgba(255, 127, 174, 0.45);
  opacity: 0;
  transform: translate(-50%, -50%) scale(0.7);
  pointer-events: none;
  animation: spark-burst 560ms ease-out forwards;
}

@keyframes shutter-flash {
  0% {
    opacity: 0;
  }
  18% {
    opacity: 1;
  }
  100% {
    opacity: 0;
  }
}

@keyframes spark-burst {
  0% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.6);
  }
  28% {
    opacity: 1;
  }
  100% {
    opacity: 0;
    transform: translate(-50%, -74%) scale(1.06);
  }
}
</style>
