<script setup lang="ts">
import BookingStepSection from '@/views/modelBooking/components/BookingStepSection.vue'
import { useModelBookingContext } from '@/views/modelBooking/hooks/useModelBookingContext'

const { form, aiBriefThemeOptions } = useModelBookingContext()

const toggleThemeType = (value: (typeof aiBriefThemeOptions)[number]['value']) => {
  form.aiBrief.themeType = form.aiBrief.themeType === value ? '' : value
}
</script>

<template>
  <BookingStepSection
    :step="2"
    title="拍摄偏好"
    note="全部可选"
    heading-id="booking-preferences-heading"
  >
    <details class="preference-panel" open>
      <summary>
        <i class="fa-solid fa-wand-magic-sparkles" aria-hidden="true" />
        <strong>让 AI 读懂这次拍摄</strong>
        <span>精简信息</span>
        <i class="fa-solid fa-chevron-right preference-panel__arrow" aria-hidden="true" />
      </summary>

      <div class="preference-panel__body">
        <div class="theme-options" aria-label="拍摄主题">
          <button
            v-for="option in aiBriefThemeOptions"
            :key="option.value"
            type="button"
            class="theme-option"
            :class="{ 'theme-option--active': form.aiBrief.themeType === option.value }"
            :aria-pressed="form.aiBrief.themeType === option.value"
            @click="toggleThemeType(option.value)"
          >
            {{ option.label }}
          </button>
        </div>

        <div class="preference-grid">
          <label class="preference-field">
            <span>作品 / 角色 / 风格</span>
            <input v-model="form.aiBrief.workName" type="text" placeholder="角色名称或画面风格" />
          </label>
          <label class="preference-field">
            <span>服装 / 妆容 / 发型 / 道具</span>
            <textarea v-model="form.aiBrief.outfit" rows="2" placeholder="服装和造型重点" />
          </label>
          <label class="preference-field">
            <span>画面与动作重点</span>
            <textarea v-model="form.aiBrief.visualGoal" rows="2" placeholder="想保留的画面和动作" />
          </label>
          <label class="preference-field">
            <span>禁忌 / 不希望出现</span>
            <textarea v-model="form.aiBrief.avoid" rows="2" placeholder="明确不希望出现的内容" />
          </label>
        </div>
      </div>
    </details>
  </BookingStepSection>
</template>

<style scoped>
.preference-panel {
  overflow: hidden;
  border: 1px solid var(--theme-accent-soft);
  border-radius: 11px;
  background: var(--theme-accent-bg);
}

.preference-panel summary {
  display: grid;
  min-height: 46px;
  grid-template-columns: 20px minmax(0, 1fr) auto 12px;
  align-items: center;
  gap: 8px;
  padding: 0 11px;
  color: var(--ink);
  cursor: pointer;
  list-style: none;
}

.preference-panel summary::-webkit-details-marker {
  display: none;
}

.preference-panel summary > i:first-child {
  color: var(--theme-accent-strong);
}

.preference-panel summary strong {
  font-size: 12px;
}

.preference-panel summary span {
  color: var(--theme-muted-soft);
  font-size: 10px;
}

.preference-panel__arrow {
  color: var(--theme-muted-soft);
  font-size: 9px;
  transition: transform 160ms ease;
}

.preference-panel[open] .preference-panel__arrow {
  transform: rotate(90deg);
}

.preference-panel__body {
  border-top: 1px solid var(--theme-accent-soft);
  padding: 10px;
}

.theme-options {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 11px;
}

.theme-option {
  min-height: 34px;
  border: 1px solid var(--theme-form-border);
  border-radius: 9px;
  padding: 0 10px;
  background: var(--theme-surface);
  color: var(--theme-muted);
  font-size: 11px;
  font-weight: 700;
}

.theme-option--active {
  border-color: var(--theme-accent-strong);
  background: var(--theme-accent-strong);
  color: var(--theme-on-accent);
}

.theme-option:focus-visible,
.preference-field input:focus,
.preference-field textarea:focus {
  outline: 2px solid var(--theme-focus-ring);
  outline-offset: 1px;
}

.preference-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 10px;
}

.preference-field {
  min-width: 0;
}

.preference-field > span {
  display: block;
  margin-bottom: 5px;
  color: var(--theme-muted);
  font-size: 11px;
  font-weight: 700;
}

.preference-field input,
.preference-field textarea {
  width: 100%;
  min-height: 44px;
  resize: vertical;
  border: 1px solid var(--theme-form-border);
  border-radius: 9px;
  padding: 10px 11px;
  background: var(--theme-surface);
  color: var(--ink);
  font-size: 12px;
  line-height: 1.55;
  outline: none;
}

.preference-field textarea {
  min-height: 68px;
}

.preference-field input::placeholder,
.preference-field textarea::placeholder {
  color: var(--theme-muted-soft);
  opacity: 0.7;
}

@media (min-width: 620px) {
  .preference-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (prefers-reduced-motion: reduce) {
  .preference-panel__arrow {
    transition: none;
  }
}
</style>
