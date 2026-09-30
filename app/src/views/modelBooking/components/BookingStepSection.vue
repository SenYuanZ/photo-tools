<script setup lang="ts">
defineProps<{
  step: number
  title: string
  note: string
  headingId: string
}>()

defineSlots<{
  default(): unknown
}>()
</script>

<template>
  <section class="booking-step" :aria-labelledby="headingId">
    <div class="booking-step__rail" aria-hidden="true">
      <span>{{ step }}</span>
    </div>
    <div class="booking-step__body">
      <header class="booking-step__heading">
        <h2 :id="headingId">{{ title }}</h2>
        <span>{{ note }}</span>
      </header>
      <slot />
    </div>
  </section>
</template>

<style scoped>
.booking-step {
  display: grid;
  grid-template-columns: 32px minmax(0, 1fr);
  gap: 8px;
  padding: 14px 12px 16px;
}

.booking-step + .booking-step {
  border-top: 1px solid var(--theme-form-border);
}

.booking-step__rail {
  position: relative;
  display: flex;
  justify-content: center;
}

.booking-step__rail::after {
  position: absolute;
  top: 34px;
  bottom: -16px;
  width: 1px;
  background: var(--theme-accent-soft);
  content: '';
}

.booking-step:last-child .booking-step__rail::after {
  display: none;
}

.booking-step__rail span {
  position: relative;
  z-index: 1;
  display: inline-flex;
  width: 28px;
  height: 28px;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--theme-accent-soft);
  border-radius: 9px;
  background: var(--theme-accent-bg);
  color: var(--theme-accent-strong);
  font-size: 12px;
  font-weight: 800;
}

.booking-step__body {
  min-width: 0;
}

.booking-step__heading {
  display: flex;
  min-height: 28px;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 12px;
}

.booking-step__heading h2 {
  margin: 0;
  color: var(--ink);
  font-size: 14px;
  font-weight: 800;
  line-height: 1.4;
}

.booking-step__heading span {
  flex: 0 0 auto;
  color: var(--theme-muted-soft);
  font-size: 10px;
  font-weight: 700;
}

@media (min-width: 640px) {
  .booking-step {
    grid-template-columns: 38px minmax(0, 1fr);
    gap: 12px;
    padding: 18px 20px 20px;
  }
}
</style>
