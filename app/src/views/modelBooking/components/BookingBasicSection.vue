<script setup lang="ts">
import BookingMonthCalendar from '@/views/modelBooking/components/BookingMonthCalendar.vue'
import { useModelBookingContext } from '@/views/modelBooking/hooks/useModelBookingContext'
const { form, aiBriefThemeOptions, locationMode, locationText, customerTypeColumns } =
  useModelBookingContext()
</script>
<template>
  <div>
    <section class="bk-group">
      <div class="bk-label">拍摄类型</div>
      <div class="bk-type-grid">
        <button
          v-for="option in aiBriefThemeOptions"
          :key="option.value"
          type="button"
          class="bk-chip"
          :class="{ selected: form.aiBrief.themeType === option.value }"
          :aria-pressed="form.aiBrief.themeType === option.value"
          @click="form.aiBrief.themeType = option.value"
        >
          {{ option.label }}
        </button>
      </div>
    </section>
    <section class="bk-group">
      <div class="bk-label">
        拍摄日期 <small>{{ form.date }}</small>
      </div>
      <BookingMonthCalendar v-model="form.date" />
    </section>
    <section class="bk-group">
      <div class="bk-label">拍摄地点</div>
      <div class="bk-choices">
        <button
          v-for="mode in ['待商议', '工作室', '其他地点']"
          :key="mode"
          class="bk-chip"
          type="button"
          :class="{ selected: locationMode === mode }"
          :aria-pressed="locationMode === mode"
          @click="locationMode = mode"
        >
          {{ mode }}
        </button>
      </div>
      <input
        v-if="locationMode !== '待商议'"
        v-model="locationText"
        class="bk-field"
        maxlength="255"
        :placeholder="
          locationMode === '工作室' ? '输入已约定的工作室地址' : '输入已约定的拍摄或集合地点'
        "
        aria-label="拍摄地点"
      />
    </section>
    <details class="bk-details">
      <summary>更多资料（选填）</summary>
      <div class="bk-label">客户类型</div>
      <div class="bk-choices">
        <button
          v-for="option in customerTypeColumns"
          :key="option.value"
          type="button"
          class="bk-chip"
          :class="{ selected: form.customerTypeCode === option.value }"
          :aria-pressed="form.customerTypeCode === option.value"
          @click="form.customerTypeCode = option.value"
        >
          {{ option.text }}
        </button>
      </div>
      <label class="bk-input-label"
        >同行备注<input
          v-model="form.companions"
          class="bk-field"
          maxlength="100"
          placeholder="同行人数或其他说明（选填）" /></label
      ><label class="bk-input-label"
        >协同备注<textarea
          v-model="form.note"
          class="bk-field"
          maxlength="255"
          rows="2"
          placeholder="其他需要沟通的事项（选填）"
        />
      </label>
    </details>
  </div>
</template>
