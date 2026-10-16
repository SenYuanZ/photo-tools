<script setup lang="ts">
import { useModelBookingContext } from '@/views/modelBooking/hooks/useModelBookingContext'
const {
  form,
  activeServices,
  serviceDrafts,
  selectedProviderLabel,
  selectedDraftRoleLabel,
  aiBriefThemeOptions,
  preferenceSummary,
  navigateStep,
  customerTypeLabel,
} = useModelBookingContext()
</script>
<template>
  <div>
    <section class="bk-review">
      <div class="bk-label">
        本次拍摄<button type="button" class="bk-link" @click="navigateStep(1)">修改安排</button>
      </div>
      <dl class="bk-review-list">
        <div>
          <dt>类型</dt>
          <dd>
            {{
              aiBriefThemeOptions.find((item) => item.value === form.aiBrief.themeType)?.label ||
              '未指定'
            }}
            · {{ customerTypeLabel }}
          </dd>
        </div>
        <div>
          <dt>日期</dt>
          <dd>{{ form.date }}</dd>
        </div>
        <div>
          <dt>地点</dt>
          <dd>{{ form.location }}</dd>
        </div>
        <div v-for="service in activeServices" :key="service.code">
          <dt>{{ selectedDraftRoleLabel(service.code) || '服务' }}</dt>
          <dd>
            {{ selectedProviderLabel(service.code) }} {{ serviceDrafts[service.code].startTime }}–{{
              serviceDrafts[service.code].endTime
            }}
          </dd>
        </div>
        <div>
          <dt>偏好</dt>
          <dd>{{ preferenceSummary }}</dd>
        </div>
        <div v-if="form.companions">
          <dt>同行</dt>
          <dd>{{ form.companions }}</dd>
        </div>
        <div v-if="form.note">
          <dt>备注</dt>
          <dd>{{ form.note }}</dd>
        </div>
      </dl>
      <button type="button" class="bk-link" @click="navigateStep(0)">
        修改拍摄类型、日期或地点
      </button>
    </section>
    <label class="bk-input-label"
      >怎么称呼你<input
        v-model="form.modelName"
        class="bk-field"
        maxlength="50"
        autocomplete="nickname"
        placeholder="输入昵称或称呼"
        required /></label
    ><label class="bk-input-label"
      >联系手机<input
        v-model="form.modelPhone"
        class="bk-field"
        type="tel"
        inputmode="tel"
        autocomplete="tel"
        maxlength="11"
        placeholder="输入 11 位手机号"
        required
    /></label>
    <p class="bk-hint">仅用于本次预约沟通与安排联系。</p>
  </div>
</template>
