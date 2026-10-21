<script setup lang="ts">
import defaultAvatar from '@/assets/DefaultAvatar.png'
defineProps<{ nickname: string; avatarUrl: string; roles: string[]; qrImage: string }>()
</script>

<template>
  <article class="booking-qr-card">
    <header class="booking-qr-identity">
      <img :src="avatarUrl || defaultAvatar" alt="" class="booking-qr-avatar" />
      <h2>{{ nickname }}</h2>
      <p>{{ roles.join(' / ') }}</p>
    </header>
    <img :src="qrImage" alt="专属预约二维码" class="booking-qr-image" />
    <p class="booking-qr-caption">扫码预约我的服务</p>
    <p class="booking-qr-note">扫码后将自动选择我，再确认本次服务角色与时间。</p>
  </article>
</template>

<style scoped>
.booking-qr-card {
  padding: 28px 18px 24px;
  background: var(--theme-surface);
  border-radius: 20px;
  text-align: center;
}
.booking-qr-identity {
  display: grid;
  justify-items: center;
  gap: 8px;
}
.booking-qr-avatar {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  object-fit: cover;
}
.booking-qr-identity h2 {
  margin: 4px 0 0;
  font-size: 22px;
  font-weight: 800;
  overflow-wrap: anywhere;
}
.booking-qr-identity p {
  margin: 0;
  color: var(--theme-muted);
  font-size: 13px;
}
.booking-qr-image {
  display: block;
  width: min(100%, 288px);
  height: auto;
  margin: 16px auto 8px;
  background: #fff;
}
.booking-qr-caption {
  margin: 0;
  font-size: 17px;
  font-weight: 700;
}
.booking-qr-note {
  max-width: 28em;
  margin: 10px auto 0;
  color: var(--theme-muted);
  font-size: 12px;
  line-height: 1.8;
}
</style>
