<script setup lang="ts">
defineProps<{
  avatarUrl: string
  displayName: string
  roleLabel: string
  bio: string
  customerCount: number
  todayCount: number
  monthCount: number
}>()

const emit = defineEmits<{
  edit: []
}>()
</script>

<template>
  <header class="my-profile-card">
    <div class="my-profile-card__identity">
      <img :src="avatarUrl" :alt="`${displayName}的头像`" />
      <div class="my-profile-card__copy">
        <div class="my-profile-card__name-row">
          <h1>{{ displayName }}</h1>
          <span>{{ roleLabel }}</span>
        </div>
        <p>{{ bio }}</p>
      </div>
      <button type="button" aria-label="编辑个人资料" @click="emit('edit')">
        <i class="fa-solid fa-pen" aria-hidden="true" />
      </button>
    </div>

    <div class="my-profile-card__stats" aria-label="业务概览">
      <div>
        <strong>{{ customerCount }}</strong>
        <span>客户总数</span>
      </div>
      <div>
        <strong>{{ todayCount }}</strong>
        <span>今日排单</span>
      </div>
      <div>
        <strong>{{ monthCount }}</strong>
        <span>本月排单</span>
      </div>
    </div>
  </header>
</template>

<style scoped>
.my-profile-card {
  overflow: hidden;
  border: 1px solid var(--theme-accent-soft);
  border-radius: 16px;
  background: linear-gradient(
    145deg,
    var(--theme-accent-bg) 0%,
    color-mix(in srgb, var(--theme-accent-bg) 58%, var(--theme-surface)) 100%
  );
  box-shadow: 0 12px 26px rgba(var(--theme-accent-rgb), 0.14);
}

.my-profile-card__identity {
  display: grid;
  grid-template-columns: 58px minmax(0, 1fr) 40px;
  align-items: center;
  gap: 12px;
  padding: 16px;
}

.my-profile-card__identity > img {
  width: 58px;
  height: 58px;
  border: 3px solid color-mix(in srgb, var(--theme-surface) 82%, transparent);
  border-radius: 16px;
  object-fit: cover;
  box-shadow: 0 6px 16px rgba(var(--theme-accent-rgb), 0.2);
}

.my-profile-card__copy {
  min-width: 0;
}

.my-profile-card__name-row {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 8px;
}

.my-profile-card__name-row h1 {
  min-width: 0;
  overflow: hidden;
  margin: 0;
  color: var(--ink);
  font-size: 19px;
  font-weight: 800;
  letter-spacing: 0;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.my-profile-card__name-row span {
  flex: 0 0 auto;
  border: 1px solid var(--theme-accent-soft);
  border-radius: 999px;
  padding: 2px 7px;
  background: color-mix(in srgb, var(--theme-surface) 76%, transparent);
  color: var(--theme-accent-strong);
  font-size: 11px;
  font-weight: 700;
}

.my-profile-card__copy p {
  overflow: hidden;
  margin: 5px 0 0;
  color: var(--theme-muted);
  font-size: 12px;
  line-height: 1.5;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.my-profile-card__identity > button {
  display: inline-flex;
  width: 40px;
  height: 40px;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--theme-accent-soft);
  border-radius: 12px;
  background: color-mix(in srgb, var(--theme-surface) 82%, transparent);
  color: var(--theme-accent-strong);
  transition:
    transform 160ms ease,
    background 160ms ease;
}

.my-profile-card__identity > button:active {
  transform: scale(0.96);
  background: var(--theme-surface);
}

.my-profile-card__stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  border-top: 1px solid color-mix(in srgb, var(--theme-accent-soft) 74%, transparent);
  background: color-mix(in srgb, var(--theme-surface) 72%, transparent);
}

.my-profile-card__stats > div {
  position: relative;
  display: flex;
  min-width: 0;
  min-height: 68px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.my-profile-card__stats > div + div::before {
  position: absolute;
  top: 16px;
  bottom: 16px;
  left: 0;
  width: 1px;
  background: var(--theme-accent-soft);
  content: '';
}

.my-profile-card__stats strong {
  color: var(--theme-accent-strong);
  font-size: 18px;
  font-variant-numeric: tabular-nums;
  font-weight: 800;
}

.my-profile-card__stats span {
  margin-top: 2px;
  color: var(--theme-muted-soft);
  font-size: 11px;
  font-weight: 600;
}

@media (max-width: 359px) {
  .my-profile-card__identity {
    grid-template-columns: 52px minmax(0, 1fr) 38px;
    gap: 10px;
    padding: 14px;
  }

  .my-profile-card__identity > img {
    width: 52px;
    height: 52px;
  }

  .my-profile-card__name-row h1 {
    font-size: 17px;
  }
}
</style>
