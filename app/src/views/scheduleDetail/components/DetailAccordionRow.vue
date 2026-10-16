<script setup lang="ts">
defineProps<{
  title: string
  summary?: string
}>()
</script>

<template>
  <details class="accordion-row">
    <summary class="accordion-summary">
      <strong>{{ title }}</strong>
      <span class="summary-value"
        ><slot name="summary">{{ summary }}</slot></span
      >
      <i class="fa-solid fa-chevron-right summary-arrow" aria-hidden="true" />
    </summary>
    <div class="accordion-content"><slot /></div>
  </details>
</template>

<style scoped>
.accordion-row + .accordion-row {
  border-top: 1px solid var(--line);
}
.accordion-summary {
  display: grid;
  min-height: 62px;
  grid-template-columns: 88px minmax(0, 1fr) 16px;
  align-items: center;
  list-style: none;
  cursor: pointer;
}
.accordion-summary::-webkit-details-marker {
  display: none;
}
.accordion-summary strong {
  color: var(--ink);
  font-size: 15px;
  font-weight: 500;
}
.summary-value {
  display: flex;
  min-width: 0;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  padding: 10px 8px 10px 0;
  color: var(--theme-muted);
  font-size: 14px;
  overflow-wrap: anywhere;
}
.summary-arrow {
  color: var(--theme-muted-soft);
  font-size: 12px;
  transition: transform 180ms ease;
}
.accordion-row[open] .summary-arrow {
  transform: rotate(90deg);
}
.accordion-content {
  padding: 0 0 20px 88px;
  color: var(--theme-muted);
  font-size: 14px;
  line-height: 1.7;
}
@media (max-width: 600px) {
  .accordion-content {
    padding-left: 0;
  }
}
@media (max-width: 350px) {
  .accordion-summary {
    grid-template-columns: 76px minmax(0, 1fr) 16px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .summary-arrow {
    transition: none;
  }
}
</style>
