<script setup lang="ts">
import PageHeader from '@/components/PageHeader.vue'
import BookingQrCard from '@/views/myBookingCode/components/BookingQrCard.vue'
import { useMyBookingCode } from '@/views/myBookingCode/hooks/useMyBookingCode'
const {
  router,
  provider,
  roleLabels,
  qrImage,
  bookingLink,
  loading,
  error,
  manualCopy,
  load,
  copyLink,
  saveQr,
  preview,
} = useMyBookingCode()
</script>

<template>
  <section class="booking-code-page">
    <PageHeader title="我的预约二维码" back @back="router.back()" />
    <p v-if="loading" class="booking-code-status" role="status">正在生成预约二维码…</p>
    <div v-else-if="error" class="booking-code-status" role="alert">
      <p>{{ error }}</p>
      <button type="button" class="btn-primary" @click="load">重新加载</button>
      <button type="button" class="booking-code-preview" @click="router.push({ name: 'profile' })">
        查看个人资料
      </button>
    </div>
    <template v-else-if="provider && qrImage">
      <BookingQrCard
        :nickname="provider.nickname"
        :avatar-url="provider.avatarUrl"
        :roles="roleLabels"
        :qr-image="qrImage"
      />
      <div class="booking-code-actions">
        <button type="button" class="btn-primary" @click="saveQr">保存二维码</button>
        <button type="button" class="btn-secondary" @click="copyLink">复制预约链接</button>
      </div>
      <label v-if="manualCopy" class="booking-code-copy"
        >长按链接复制
        <input
          :value="bookingLink"
          readonly
          aria-label="专属预约链接"
          @focus="($event.target as HTMLInputElement).select()"
        />
      </label>
      <button type="button" class="booking-code-preview" @click="preview">预览客户预约页面</button>
      <p class="booking-code-help">客户无需登录即可预约。修改昵称或头像后，原二维码仍然有效。</p>
    </template>
  </section>
</template>

<style scoped>
.booking-code-page {
  display: grid;
  gap: 20px;
  max-width: 480px;
  margin: 0 auto;
  padding-bottom: 24px;
}
.booking-code-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.booking-code-preview {
  min-height: 44px;
  padding: 8px;
  border: 0;
  background: transparent;
  color: var(--theme-accent-strong);
  font-size: 14px;
}
.booking-code-status {
  padding: 32px 16px;
  text-align: center;
  line-height: 1.8;
}
.booking-code-help {
  margin: -12px 8px 0;
  color: var(--theme-muted);
  font-size: 12px;
  line-height: 1.8;
  text-align: center;
}
.booking-code-copy {
  display: grid;
  gap: 8px;
  font-size: 13px;
}
.booking-code-copy input {
  width: 100%;
  padding: 12px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--theme-surface);
  color: var(--ink);
}
</style>
