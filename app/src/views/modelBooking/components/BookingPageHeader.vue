<script setup lang="ts">
defineProps<{
  dateLabel: string
}>()

const emit = defineEmits<{
  openOrderQuery: []
  openProviderLogin: []
}>()
</script>

<template>
  <header class="booking-header">
    <div class="booking-brand">
      <span class="booking-brand__mark" aria-hidden="true">
        <i class="fa-solid fa-camera-retro" />
      </span>
      <div class="booking-brand__copy">
        <h1>预约拍摄</h1>
        <p>{{ dateLabel }} · 公开预约入口</p>
      </div>
    </div>

    <nav class="booking-header__actions" aria-label="预约相关入口">
      <button
        type="button"
        class="booking-header__action"
        title="查询订单"
        @click="emit('openOrderQuery')"
      >
        <i class="fa-solid fa-magnifying-glass" aria-hidden="true" />
        <span>查询订单</span>
      </button>
      <button
        type="button"
        class="booking-header__action"
        title="服务者登录"
        @click="emit('openProviderLogin')"
      >
        <i class="fa-regular fa-user" aria-hidden="true" />
        <span>服务者登录</span>
      </button>
    </nav>
  </header>
</template>

<style scoped>
.booking-header {
  display: flex;
  min-height: 64px;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border-bottom: 1px solid var(--theme-form-border);
  padding: 8px 2px 12px;
}

.booking-brand {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 10px;
}

.booking-brand__mark {
  display: inline-flex;
  width: 40px;
  height: 40px;
  flex: 0 0 40px;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--theme-accent-soft);
  border-radius: 11px;
  background: var(--theme-accent-bg);
  color: var(--theme-accent-strong);
  font-size: 17px;
}

.booking-brand__copy {
  min-width: 0;
}

.booking-brand__copy h1 {
  margin: 0;
  color: var(--ink);
  font-size: 20px;
  font-weight: 800;
  line-height: 1.25;
}

.booking-brand__copy p {
  margin: 3px 0 0;
  overflow: hidden;
  color: var(--theme-muted-soft);
  font-size: 10px;
  line-height: 1.4;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.booking-header__actions {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 4px;
}

.booking-header__action {
  display: inline-flex;
  min-width: 40px;
  min-height: 40px;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: 0;
  border-radius: 10px;
  background: transparent;
  color: var(--theme-muted);
  font-size: 12px;
  font-weight: 700;
}

.booking-header__action:focus-visible {
  outline: 2px solid var(--theme-focus-ring);
  outline-offset: 2px;
}

.booking-header__action:hover {
  background: var(--theme-accent-bg);
  color: var(--theme-accent-strong);
}

@media (max-width: 520px) {
  .booking-header__action span {
    display: none;
  }
}
</style>
