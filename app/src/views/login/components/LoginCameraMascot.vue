<script setup lang="ts">
import { onBeforeUnmount, shallowRef } from 'vue'

const isShooting = shallowRef(false)
const badgeText = shallowRef('咔嚓')
let shootingTimer = 0

const playShutter = () => {
  window.clearTimeout(shootingTimer)
  isShooting.value = false

  window.requestAnimationFrame(() => {
    isShooting.value = true
    badgeText.value = '拍好啦'
  })

  shootingTimer = window.setTimeout(() => {
    isShooting.value = false
    badgeText.value = '咔嚓'
  }, 720)
}

onBeforeUnmount(() => {
  window.clearTimeout(shootingTimer)
})
</script>

<template>
  <header class="login-intro" aria-labelledby="login-title">
    <div class="camera-stage">
      <i
        class="fa-solid fa-star camera-stage__spark camera-stage__spark--left"
        aria-hidden="true"
      />
      <i
        class="fa-solid fa-sparkles camera-stage__spark camera-stage__spark--right"
        aria-hidden="true"
      />
      <i
        class="fa-solid fa-star camera-stage__spark camera-stage__spark--small"
        aria-hidden="true"
      />

      <button
        type="button"
        class="camera-mascot"
        :class="{ 'is-shooting': isShooting }"
        aria-label="播放相机快门特效"
        @click="playShutter"
      >
        <span class="camera-mascot__strap" />
        <span class="camera-mascot__body">
          <span class="camera-mascot__grip" />
          <span class="camera-mascot__shutter" />
          <span class="camera-mascot__flash" />
          <span class="camera-mascot__lens">
            <span class="camera-mascot__glass" />
          </span>
          <span class="camera-mascot__cheek camera-mascot__cheek--left" />
          <span class="camera-mascot__cheek camera-mascot__cheek--right" />
          <span class="camera-mascot__flash-mask" />
        </span>
        <span class="camera-mascot__badge">{{ badgeText }}</span>
      </button>
    </div>

    <h1 id="login-title" class="login-intro__title">欢迎回来</h1>
    <p class="login-intro__subtitle">登录后继续安排今天的拍摄</p>
  </header>
</template>

<style scoped>
.login-intro {
  position: relative;
  z-index: 2;
  text-align: center;
}

.camera-stage {
  position: relative;
  width: 170px;
  height: 122px;
  margin: 0 auto;
}

.camera-stage__spark {
  position: absolute;
  color: var(--theme-accent);
  font-size: 13px;
  pointer-events: none;
}

.camera-stage__spark--left {
  top: 24px;
  left: 4px;
  transform: rotate(-12deg);
}

.camera-stage__spark--right {
  top: 5px;
  right: 12px;
  font-size: 16px;
  transform: rotate(12deg);
}

.camera-stage__spark--small {
  right: 0;
  bottom: 20px;
  font-size: 9px;
}

.camera-mascot {
  position: absolute;
  top: 10px;
  left: 50%;
  width: 138px;
  height: 102px;
  transform: translateX(-50%);
  border: 0;
  padding: 0;
  background: transparent;
  cursor: pointer;
}

.camera-mascot__strap {
  position: absolute;
  top: 1px;
  left: 50%;
  width: 84px;
  height: 38px;
  transform: translateX(-50%);
  border: 5px solid var(--theme-accent-soft);
  border-bottom: 0;
  border-radius: 46px 46px 0 0;
}

.camera-mascot__body {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  height: 82px;
  border: 3px solid var(--theme-accent-strong);
  border-radius: 25px;
  background: linear-gradient(155deg, var(--theme-accent) 0%, var(--theme-accent-strong) 100%);
  box-shadow:
    inset 0 6px 0 rgba(255, 255, 255, 0.2),
    0 12px 24px var(--theme-shadow);
  transition:
    transform 160ms ease,
    box-shadow 160ms ease;
}

.camera-mascot__grip {
  position: absolute;
  top: -12px;
  left: 18px;
  width: 34px;
  height: 18px;
  border: 3px solid var(--theme-accent-strong);
  border-bottom: 0;
  border-radius: 11px 11px 0 0;
  background: var(--theme-accent);
}

.camera-mascot__shutter {
  position: absolute;
  top: 11px;
  left: 16px;
  width: 12px;
  height: 8px;
  border-radius: 50%;
  background: #ffffff;
  box-shadow: inset 0 -2px 0 rgba(var(--theme-accent-rgb), 0.24);
}

.camera-mascot__flash {
  position: absolute;
  top: 10px;
  right: 14px;
  width: 22px;
  height: 13px;
  border: 2px solid rgba(255, 255, 255, 0.75);
  border-radius: 6px;
  background: #fff7cf;
}

.camera-mascot__lens {
  position: absolute;
  top: 50%;
  left: 50%;
  display: grid;
  width: 61px;
  height: 61px;
  place-items: center;
  transform: translate(-50%, -44%);
  border: 5px solid #ffffff;
  border-radius: 50%;
  background: var(--theme-accent-bg);
  box-shadow:
    0 0 0 3px rgba(255, 255, 255, 0.28),
    inset 0 0 0 2px var(--theme-accent-soft);
}

.camera-mascot__glass {
  position: relative;
  display: block;
  width: 34px;
  height: 34px;
  border: 3px solid var(--theme-accent-soft);
  border-radius: 50%;
  background: #79b7ef;
  box-shadow: inset -8px -7px 0 #6d8bd8;
}

.camera-mascot__glass::before {
  position: absolute;
  top: 6px;
  left: 8px;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.88);
  content: '';
}

.camera-mascot__glass::after {
  position: absolute;
  right: 6px;
  bottom: 6px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #ffd7ec;
  content: '';
}

.camera-mascot__cheek {
  position: absolute;
  top: 52px;
  width: 16px;
  height: 7px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.42);
}

.camera-mascot__cheek--left {
  left: 14px;
}

.camera-mascot__cheek--right {
  right: 14px;
}

.camera-mascot__badge {
  position: absolute;
  top: -11px;
  right: -8px;
  min-width: 44px;
  border: 1px solid var(--theme-accent-soft);
  border-radius: 999px;
  padding: 4px 8px;
  background: var(--theme-surface);
  color: var(--theme-accent-strong);
  font-size: 10px;
  font-weight: 800;
  box-shadow: 0 5px 12px var(--theme-shadow);
}

.camera-mascot__flash-mask {
  position: absolute;
  inset: -10px;
  border-radius: 30px;
  background: rgba(255, 255, 255, 0.84);
  opacity: 0;
  pointer-events: none;
}

.camera-mascot:hover .camera-mascot__body {
  transform: translateY(-2px);
  box-shadow:
    inset 0 6px 0 rgba(255, 255, 255, 0.22),
    0 15px 28px var(--theme-shadow);
}

.camera-mascot:active .camera-mascot__body {
  transform: scale(0.97) rotate(-1deg);
}

.camera-mascot:focus-visible {
  border-radius: 28px;
  outline: 3px solid var(--theme-focus-ring);
  outline-offset: 5px;
}

.camera-mascot.is-shooting .camera-mascot__body {
  animation: camera-bounce 360ms ease-out;
}

.camera-mascot.is-shooting .camera-mascot__flash-mask {
  animation: shutter-flash 360ms ease-out;
}

.login-intro__title {
  margin: 6px 0 0;
  color: var(--ink);
  font-family: 'ZCOOL KuaiLe', 'Microsoft YaHei', sans-serif;
  font-size: 24px;
  font-weight: 800;
  line-height: 1.25;
}

.login-intro__subtitle {
  margin: 6px 0 0;
  color: var(--theme-muted);
  font-size: 12px;
  line-height: 1.5;
}

@keyframes camera-bounce {
  0%,
  100% {
    transform: translateY(0) rotate(0);
  }

  35% {
    transform: translateY(-4px) rotate(2deg);
  }

  70% {
    transform: translateY(1px) rotate(-1deg);
  }
}

@keyframes shutter-flash {
  0%,
  100% {
    opacity: 0;
  }

  18% {
    opacity: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .camera-mascot__body,
  .camera-mascot__flash-mask {
    transition-duration: 0.01ms;
    animation-duration: 0.01ms !important;
  }
}
</style>
