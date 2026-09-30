<script setup lang="ts">
import { Popup } from 'vant'
import ProviderPickerOption from '@/views/modelBooking/components/ProviderPickerOption.vue'
import { useModelBookingContext } from '@/views/modelBooking/hooks/useModelBookingContext'

const {
  showProviderPicker,
  pickerServiceCode,
  providerKeywordInput,
  recentProvidersOfPicker,
  commonProvidersOfPicker,
  selectedProviderIdOfPicker,
  clearRecentProviders,
  chooseProvider,
  providerRoleLabels,
  getProviderAvailabilityClass,
  getProviderAvailabilityText,
} = useModelBookingContext()
</script>

<template>
  <Popup v-model:show="showProviderPicker" position="bottom" round>
    <section class="provider-picker" aria-labelledby="provider-picker-title">
      <div class="provider-picker__handle" aria-hidden="true" />
      <header class="provider-picker__header">
        <h2 id="provider-picker-title">选择服务者</h2>
        <button
          type="button"
          class="provider-picker__close"
          aria-label="关闭服务者选择"
          title="关闭"
          @click="showProviderPicker = false"
        >
          <i class="fa-solid fa-xmark" aria-hidden="true" />
        </button>
      </header>

      <label class="provider-search">
        <i class="fa-solid fa-magnifying-glass" aria-hidden="true" />
        <input v-model="providerKeywordInput" type="search" placeholder="搜索昵称 / 账号 / 简介" />
        <button
          v-if="providerKeywordInput"
          type="button"
          aria-label="清空搜索"
          title="清空搜索"
          @click="providerKeywordInput = ''"
        >
          <i class="fa-solid fa-xmark" aria-hidden="true" />
        </button>
      </label>

      <div class="provider-picker__list">
        <section v-if="recentProvidersOfPicker.length" class="provider-group">
          <header class="provider-group__header">
            <h3>最近选择</h3>
            <button type="button" @click="clearRecentProviders(pickerServiceCode)">清空</button>
          </header>
          <ProviderPickerOption
            v-for="provider in recentProvidersOfPicker"
            :key="`recent-${provider.id}`"
            :provider="provider"
            :selected="selectedProviderIdOfPicker === provider.id"
            :role-labels="providerRoleLabels(provider)"
            :availability-text="getProviderAvailabilityText(pickerServiceCode, provider.id)"
            :availability-class="getProviderAvailabilityClass(pickerServiceCode, provider.id)"
            @select="chooseProvider(pickerServiceCode, provider.id)"
          />
        </section>

        <section class="provider-group">
          <header class="provider-group__header">
            <h3>全部可选</h3>
            <span>{{ commonProvidersOfPicker.length }} 位 · 按可约时段排序</span>
          </header>
          <ProviderPickerOption
            v-for="provider in commonProvidersOfPicker"
            :key="provider.id"
            :provider="provider"
            :selected="selectedProviderIdOfPicker === provider.id"
            :role-labels="providerRoleLabels(provider)"
            :availability-text="getProviderAvailabilityText(pickerServiceCode, provider.id)"
            :availability-class="getProviderAvailabilityClass(pickerServiceCode, provider.id)"
            @select="chooseProvider(pickerServiceCode, provider.id)"
          />

          <p
            v-if="!recentProvidersOfPicker.length && !commonProvidersOfPicker.length"
            class="provider-picker__empty"
          >
            暂无匹配结果，试试其他关键词
          </p>
        </section>
      </div>
    </section>
  </Popup>
</template>

<style scoped>
.provider-picker {
  max-height: 82vh;
  overflow: hidden;
  background: var(--theme-surface);
}

.provider-picker__handle {
  width: 38px;
  height: 4px;
  border-radius: 999px;
  margin: 9px auto 4px;
  background: var(--theme-form-border);
}

.provider-picker__header {
  display: flex;
  min-height: 48px;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 4px 14px;
}

.provider-picker__header h2 {
  margin: 0;
  color: var(--ink);
  font-size: 15px;
  font-weight: 800;
}

.provider-picker__close {
  display: inline-flex;
  width: 38px;
  height: 38px;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--theme-form-border);
  border-radius: 9px;
  background: var(--theme-surface);
  color: var(--theme-muted);
}

.provider-search {
  display: grid;
  min-height: 44px;
  grid-template-columns: 20px minmax(0, 1fr) auto;
  align-items: center;
  gap: 7px;
  margin: 0 14px 10px;
  border: 1px solid var(--theme-form-border);
  border-radius: 10px;
  padding: 0 10px;
  background: var(--theme-accent-bg);
  color: var(--theme-muted-soft);
}

.provider-search input {
  min-width: 0;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--ink);
  font-size: 12px;
}

.provider-search input::placeholder {
  color: var(--theme-muted-soft);
}

.provider-search button {
  display: inline-flex;
  width: 30px;
  height: 30px;
  align-items: center;
  justify-content: center;
  border: 0;
  background: transparent;
  color: var(--theme-muted-soft);
}

.provider-picker__list {
  max-height: calc(82vh - 115px);
  overflow-y: auto;
  padding: 0 14px calc(16px + env(safe-area-inset-bottom));
}

.provider-group + .provider-group {
  margin-top: 12px;
}

.provider-group__header {
  display: flex;
  min-height: 32px;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.provider-group__header h3 {
  margin: 0;
  color: var(--theme-muted);
  font-size: 11px;
  font-weight: 800;
}

.provider-group__header span,
.provider-group__header button {
  color: var(--theme-muted-soft);
  font-size: 9px;
}

.provider-group__header button {
  min-height: 30px;
  border: 0;
  background: transparent;
  color: var(--theme-accent-strong);
  font-weight: 800;
}

.provider-picker__empty {
  margin: 0;
  padding: 28px 10px;
  color: var(--theme-muted-soft);
  font-size: 11px;
  text-align: center;
}

.provider-picker button:focus-visible,
.provider-search:focus-within {
  outline: 2px solid var(--theme-focus-ring);
  outline-offset: 1px;
}
</style>
