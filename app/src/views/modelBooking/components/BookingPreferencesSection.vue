<script setup lang="ts">
import { useModelBookingContext } from '@/views/modelBooking/hooks/useModelBookingContext'
const { form, preferenceGroups, preferenceSelections, togglePreference, navigateStep } =
  useModelBookingContext()
</script>
<template>
  <div>
    <section v-for="group in preferenceGroups" :key="group.key" class="bk-group">
      <div class="bk-label">{{ group.title }}<small>可多选</small></div>
      <div class="bk-choices">
        <button
          v-for="option in group.options"
          :key="option"
          type="button"
          class="bk-chip"
          :class="{ selected: preferenceSelections[group.key].includes(option) }"
          :aria-pressed="preferenceSelections[group.key].includes(option)"
          @click="togglePreference(group.key, option)"
        >
          {{ option }}
        </button>
      </div>
    </section>
    <details class="bk-details">
      <summary>补充作品、角色或其他想法</summary>
      <label class="bk-input-label"
        >作品 / 角色 / 风格<input
          v-model="form.aiBrief.workName"
          class="bk-field"
          maxlength="180"
          placeholder="例如：原神 / 芙宁娜（选填）" /></label
      ><label class="bk-input-label"
        >服装 / 妆容 / 发型 / 道具<textarea
          v-model="form.aiBrief.outfit"
          class="bk-field"
          maxlength="180"
          rows="2"
          placeholder="特别想说明的造型细节（选填）"
        /></label
      ><label class="bk-input-label"
        >画面与动作<textarea
          v-model="form.aiBrief.visualGoal"
          class="bk-field"
          maxlength="180"
          rows="2"
          placeholder="例如：想拍撑伞回头的画面（选填）"
        /></label
      ><label class="bk-input-label"
        >不希望出现<textarea
          v-model="form.aiBrief.avoid"
          class="bk-field"
          maxlength="180"
          rows="2"
          placeholder="需要避开的其他内容（选填）"
        />
      </label>
    </details>
    <p class="bk-hint">偏好会以文字随预约保存，方便服务者了解你的想法。</p>
    <button type="button" class="bk-link" @click="navigateStep(3)">
      暂时没有特别偏好，跳过这一步
    </button>
  </div>
</template>
