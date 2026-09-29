<script setup lang="ts">
defineProps<{
  icon: string
  title: string
  summary: string
}>()
</script>

<template>
  <details class="accordion-row">
    <summary>
      <i :class="icon" class="summary-icon" aria-hidden="true" />
      <strong>{{ title }}</strong>
      <span>{{ summary }}</span>
      <i class="fa-solid fa-chevron-right summary-arrow" aria-hidden="true" />
    </summary>
    <div class="accordion-content">
      <slot />
    </div>
  </details>
</template>

<style scoped>
.accordion-row + .accordion-row {
  border-top: 1px solid var(--line);
}

.accordion-row summary {
  display: grid;
  min-height: 56px;
  grid-template-columns: 32px minmax(0, 1fr) auto 14px;
  align-items: center;
  gap: 9px;
  padding: 0 13px;
  list-style: none;
  color: var(--ink);
  cursor: pointer;
}

.accordion-row summary::-webkit-details-marker {
  display: none;
}

.summary-icon {
  display: inline-flex;
  width: 32px;
  height: 32px;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  background: var(--theme-accent-bg);
  color: var(--theme-accent-strong);
}

.accordion-row summary strong {
  overflow: hidden;
  font-size: 12px;
  font-weight: 800;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.accordion-row summary span {
  overflow: hidden;
  max-width: 128px;
  color: var(--theme-muted-soft);
  font-size: 10px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.summary-arrow {
  color: var(--theme-muted-soft);
  font-size: 10px;
  transition: transform 180ms ease;
}

.accordion-row[open] .summary-arrow {
  transform: rotate(90deg);
}

.accordion-content {
  margin: 0 13px 13px 54px;
  border-top: 1px solid var(--line);
  padding-top: 11px;
  color: var(--theme-muted);
  font-size: 11px;
  line-height: 1.7;
}

@media (max-width: 350px) {
  .accordion-row summary {
    grid-template-columns: 32px minmax(0, 1fr) minmax(0, auto) 12px;
    gap: 7px;
    padding: 0 10px;
  }

  .accordion-row summary span {
    max-width: 86px;
  }

  .accordion-content {
    margin-right: 10px;
    margin-left: 49px;
  }
}
</style>
