<script setup lang="ts">
defineProps<{
  icon: string
  title: string
  description: string
}>()

const emit = defineEmits<{
  click: []
}>()
</script>

<template>
  <button type="button" class="my-menu-item" @click="emit('click')">
    <span class="my-menu-item__icon">
      <i :class="icon" aria-hidden="true" />
    </span>
    <span class="my-menu-item__copy">
      <strong>{{ title }}</strong>
      <span>{{ description }}</span>
    </span>
    <i class="fa-solid fa-chevron-right my-menu-item__arrow" aria-hidden="true" />
  </button>
</template>

<style scoped>
.my-menu-item {
  display: grid;
  width: 100%;
  min-height: 68px;
  grid-template-columns: 40px minmax(0, 1fr) 16px;
  align-items: center;
  gap: 11px;
  border: 0;
  background: transparent;
  color: var(--ink);
  text-align: left;
  transition: background 160ms ease;
}

.my-menu-item:active {
  background: var(--theme-accent-bg);
}

.my-menu-item__icon {
  display: inline-flex;
  width: 40px;
  height: 40px;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  background: var(--theme-accent-bg);
  color: var(--theme-accent-strong);
  font-size: 15px;
}

.my-menu-item__copy {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 3px;
}

.my-menu-item__copy strong {
  overflow: hidden;
  font-size: 14px;
  font-weight: 800;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.my-menu-item__copy > span {
  overflow: hidden;
  color: var(--theme-muted-soft);
  font-size: 11px;
  line-height: 1.4;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.my-menu-item__arrow {
  color: color-mix(in srgb, var(--theme-muted-soft) 54%, transparent);
  font-size: 11px;
}
</style>
