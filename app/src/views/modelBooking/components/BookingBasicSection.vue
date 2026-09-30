<script setup lang="ts">
import BookingStepSection from '@/views/modelBooking/components/BookingStepSection.vue'
import { useModelBookingContext } from '@/views/modelBooking/hooks/useModelBookingContext'

const { form, customerTypeLabel, roleLabel, showCustomerTypePicker, showRolePicker, openDate } =
  useModelBookingContext()
</script>

<template>
  <BookingStepSection
    :step="1"
    title="预约资料"
    note="必填 6 项"
    heading-id="booking-basic-heading"
  >
    <div class="booking-field-grid">
      <label class="booking-field">
        <span class="booking-field__label"><b>*</b> 客户昵称</span>
        <input v-model="form.modelName" type="text" placeholder="请输入昵称" autocomplete="name" />
      </label>

      <label class="booking-field">
        <span class="booking-field__label"><b>*</b> 联系电话</span>
        <input
          v-model="form.modelPhone"
          type="tel"
          inputmode="numeric"
          maxlength="11"
          placeholder="请输入手机号"
          autocomplete="tel"
        />
      </label>

      <div class="booking-field">
        <span class="booking-field__label"><b>*</b> 客户类型</span>
        <button type="button" class="booking-field__button" @click="showCustomerTypePicker = true">
          <i class="fa-regular fa-user" aria-hidden="true" />
          <span>{{ customerTypeLabel || '请选择客户类型' }}</span>
          <i class="fa-solid fa-chevron-right" aria-hidden="true" />
        </button>
      </div>

      <div class="booking-field">
        <span class="booking-field__label">服务类型</span>
        <button type="button" class="booking-field__button" @click="showRolePicker = true">
          <i class="fa-solid fa-user-tag" aria-hidden="true" />
          <span>{{ roleLabel }}</span>
          <i class="fa-solid fa-chevron-right" aria-hidden="true" />
        </button>
      </div>

      <div class="booking-field">
        <span class="booking-field__label"><b>*</b> 服务日期</span>
        <button type="button" class="booking-field__button" @click="openDate">
          <i class="fa-regular fa-calendar" aria-hidden="true" />
          <span>{{ form.date }}</span>
          <i class="fa-solid fa-chevron-right" aria-hidden="true" />
        </button>
      </div>

      <label class="booking-field">
        <span class="booking-field__label"><b>*</b> 服务地点</span>
        <input v-model="form.location" type="text" placeholder="工作室或集合地点" />
      </label>
    </div>

    <details class="booking-details">
      <summary>
        <i class="fa-solid fa-ellipsis" aria-hidden="true" />
        <strong>更多资料</strong>
        <span>可选</span>
        <i class="fa-solid fa-chevron-right booking-details__arrow" aria-hidden="true" />
      </summary>
      <div class="booking-details__body booking-field-grid">
        <label class="booking-field">
          <span class="booking-field__label">陪同人员</span>
          <input v-model="form.companions" type="text" placeholder="例如：闺蜜 1 人" />
        </label>
        <label class="booking-field">
          <span class="booking-field__label">协同备注</span>
          <input v-model="form.note" type="text" placeholder="例如：妆容偏日系" />
        </label>
      </div>
    </details>
  </BookingStepSection>
</template>

<style scoped>
.booking-field-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 11px;
}

.booking-field {
  display: block;
  min-width: 0;
}

.booking-field__label {
  display: block;
  margin-bottom: 5px;
  color: var(--theme-muted);
  font-size: 11px;
  font-weight: 700;
  line-height: 1.4;
}

.booking-field__label b {
  margin-right: 2px;
  color: #d45a6c;
}

.booking-field input,
.booking-field__button {
  width: 100%;
  min-height: 46px;
  border: 1px solid var(--theme-form-border);
  border-radius: 10px;
  background: var(--theme-surface);
  color: var(--ink);
  font-size: 13px;
  outline: none;
}

.booking-field input {
  padding: 0 12px;
}

.booking-field input::placeholder {
  color: var(--theme-muted-soft);
  opacity: 0.72;
}

.booking-field input:focus,
.booking-field__button:focus-visible {
  border-color: var(--theme-accent);
  box-shadow: 0 0 0 3px var(--theme-focus-ring);
}

.booking-field__button {
  display: grid;
  grid-template-columns: 20px minmax(0, 1fr) 14px;
  align-items: center;
  gap: 8px;
  padding: 0 11px;
  text-align: left;
}

.booking-field__button > i:first-child {
  color: var(--theme-accent-strong);
}

.booking-field__button > i:last-child {
  color: var(--theme-muted-soft);
  font-size: 10px;
  text-align: right;
}

.booking-field__button span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.booking-details {
  margin-top: 12px;
  border-top: 1px dashed var(--theme-form-border);
}

.booking-details summary {
  display: grid;
  min-height: 46px;
  grid-template-columns: 20px minmax(0, 1fr) auto 12px;
  align-items: center;
  gap: 8px;
  color: var(--ink);
  cursor: pointer;
  list-style: none;
}

.booking-details summary::-webkit-details-marker {
  display: none;
}

.booking-details summary > i:first-child {
  color: var(--theme-accent-strong);
}

.booking-details summary strong {
  font-size: 12px;
}

.booking-details summary span {
  color: var(--theme-muted-soft);
  font-size: 10px;
}

.booking-details__arrow {
  color: var(--theme-muted-soft);
  font-size: 9px;
  transition: transform 160ms ease;
}

.booking-details[open] .booking-details__arrow {
  transform: rotate(90deg);
}

.booking-details__body {
  padding-top: 2px;
}

@media (min-width: 620px) {
  .booking-field-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (prefers-reduced-motion: reduce) {
  .booking-details__arrow {
    transition: none;
  }
}
</style>
