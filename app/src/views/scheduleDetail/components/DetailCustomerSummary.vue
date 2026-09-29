<script setup lang="ts">
defineProps<{
  customerName: string
  phone: string
  customerType: string
  tags: string[]
  statusLabel: string
}>()

const emit = defineEmits<{
  copyPhone: []
}>()
</script>

<template>
  <article class="customer-summary" aria-labelledby="detail-customer-name">
    <div class="customer-summary__top">
      <div class="customer-avatar" aria-hidden="true">{{ customerName.slice(0, 1) || '客' }}</div>
      <div class="customer-copy">
        <div class="customer-name-row">
          <h2 id="detail-customer-name">{{ customerName }}</h2>
          <span class="status-chip">{{ statusLabel }}</span>
        </div>
        <p>{{ customerType }} · {{ phone }}</p>
      </div>
      <div class="icon-actions">
        <button type="button" class="icon-button" aria-label="复制电话" @click="emit('copyPhone')">
          <i class="fa-regular fa-copy" aria-hidden="true" />
        </button>
        <a class="icon-button" :href="`tel:${phone}`" aria-label="拨打电话">
          <i class="fa-solid fa-phone" aria-hidden="true" />
        </a>
      </div>
    </div>

    <div v-if="tags.length" class="tag-list" aria-label="客户标签">
      <span v-for="tag in tags" :key="tag">{{ tag }}</span>
    </div>
  </article>
</template>

<style scoped>
.customer-summary {
  overflow: hidden;
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 14px;
  background: var(--theme-surface);
  box-shadow: 0 8px 20px rgba(var(--theme-accent-rgb), 0.1);
}

.customer-summary__top {
  display: grid;
  grid-template-columns: 46px minmax(0, 1fr) auto;
  align-items: center;
  gap: 11px;
}

.customer-avatar {
  display: inline-flex;
  width: 46px;
  height: 46px;
  align-items: center;
  justify-content: center;
  border-radius: 13px;
  background: var(--theme-accent-bg);
  color: var(--theme-accent-strong);
  font-size: 18px;
  font-weight: 800;
}

.customer-copy {
  min-width: 0;
}

.customer-name-row {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 7px;
}

.customer-name-row h2 {
  overflow: hidden;
  margin: 0;
  color: var(--ink);
  font-size: 18px;
  font-weight: 800;
  letter-spacing: 0;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.status-chip {
  flex: 0 0 auto;
  border: 1px solid var(--theme-accent-soft);
  border-radius: 999px;
  padding: 2px 7px;
  background: var(--theme-accent-bg);
  color: var(--theme-accent-strong);
  font-size: 10px;
  font-weight: 700;
}

.customer-copy p {
  overflow: hidden;
  margin: 4px 0 0;
  color: var(--theme-muted-soft);
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.icon-actions {
  display: flex;
  gap: 6px;
}

.icon-button {
  display: inline-flex;
  width: 44px;
  height: 44px;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--line);
  border-radius: 11px;
  background: var(--theme-surface);
  color: var(--theme-accent-strong);
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 11px;
}

.tag-list span {
  border-radius: 999px;
  padding: 4px 8px;
  background: color-mix(in srgb, var(--theme-accent-bg) 76%, var(--theme-surface));
  color: var(--theme-muted);
  font-size: 10px;
  font-weight: 700;
}

@media (max-width: 350px) {
  .customer-summary__top {
    grid-template-columns: 42px minmax(0, 1fr) auto;
    gap: 8px;
  }

  .customer-avatar {
    width: 42px;
    height: 42px;
  }

  .icon-actions {
    gap: 3px;
  }
}
</style>
