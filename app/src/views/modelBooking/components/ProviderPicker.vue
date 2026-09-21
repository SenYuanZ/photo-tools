<script setup lang="ts">
import { Field, Popup } from 'vant'
import defaultAvatar from '@/assets/DefaultAvatar.png'
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
    <section class="max-h-[78vh] p-3">
      <div class="mb-2 flex items-center justify-between">
        <p class="text-sm font-extrabold text-slate-700">选择服务者</p>
        <button class="chip" type="button" @click="showProviderPicker = false">关闭</button>
      </div>

      <Field
        v-model="providerKeywordInput"
        class="mb-2 rounded-xl"
        clearable
        placeholder="搜索昵称 / 账号 / 简介关键词"
      >
        <template #left-icon><i class="fa-solid fa-magnifying-glass text-slate-400" /></template>
      </Field>

      <div class="max-h-[58vh] overflow-y-auto">
        <article v-if="recentProvidersOfPicker.length" class="mb-2">
          <div class="mb-1 flex items-center justify-between">
            <p class="text-xs font-bold text-slate-500">最近选择</p>
            <button class="chip" type="button" @click="clearRecentProviders(pickerServiceCode)">
              清空
            </button>
          </div>

          <button
            v-for="provider in recentProvidersOfPicker"
            :key="`recent-${provider.id}`"
            type="button"
            class="mb-1 w-full rounded-xl border p-2 text-left"
            :class="
              selectedProviderIdOfPicker === provider.id
                ? 'border-blue-300 bg-blue-50'
                : 'border-slate-200 bg-white'
            "
            @click="chooseProvider(pickerServiceCode, provider.id)"
          >
            <div class="flex items-center gap-2">
              <img
                :src="provider.avatarUrl || defaultAvatar"
                alt="服务者头像"
                class="h-9 w-9 rounded-lg object-cover"
              />
              <div class="min-w-0 flex-1">
                <p class="truncate text-xs font-extrabold text-slate-700">
                  {{ provider.nickname }}
                  <span
                    v-for="label in providerRoleLabels(provider)"
                    :key="`recent-role-${provider.id}-${label}`"
                    class="chip ml-1"
                    >{{ label }}</span
                  >
                </p>
                <p class="truncate text-[11px] text-slate-500">
                  {{ provider.bio || provider.account }}
                </p>
              </div>
              <p
                class="text-[11px] font-bold"
                :class="getProviderAvailabilityClass(pickerServiceCode, provider.id)"
              >
                {{ getProviderAvailabilityText(pickerServiceCode, provider.id) }}
              </p>
            </div>
          </button>
        </article>

        <article>
          <p class="mb-1 text-xs font-bold text-slate-500">
            全部可选（{{ commonProvidersOfPicker.length }}，按可约时段排序）
          </p>
          <button
            v-for="provider in commonProvidersOfPicker"
            :key="provider.id"
            type="button"
            class="mb-1 w-full rounded-xl border p-2 text-left"
            :class="
              selectedProviderIdOfPicker === provider.id
                ? 'border-blue-300 bg-blue-50'
                : 'border-slate-200 bg-white'
            "
            @click="chooseProvider(pickerServiceCode, provider.id)"
          >
            <div class="flex items-center gap-2">
              <img
                :src="provider.avatarUrl || defaultAvatar"
                alt="服务者头像"
                class="h-9 w-9 rounded-lg object-cover"
              />
              <div class="min-w-0 flex-1">
                <p class="truncate text-xs font-extrabold text-slate-700">
                  {{ provider.nickname }}
                  <span
                    v-for="label in providerRoleLabels(provider)"
                    :key="`common-role-${provider.id}-${label}`"
                    class="chip ml-1"
                    >{{ label }}</span
                  >
                </p>
                <p class="truncate text-[11px] text-slate-500">
                  {{ provider.bio || provider.account }}
                </p>
              </div>
              <p
                class="text-[11px] font-bold"
                :class="getProviderAvailabilityClass(pickerServiceCode, provider.id)"
              >
                {{ getProviderAvailabilityText(pickerServiceCode, provider.id) }}
              </p>
            </div>
          </button>

          <p
            v-if="!recentProvidersOfPicker.length && !commonProvidersOfPicker.length"
            class="py-6 text-center text-xs text-slate-400"
          >
            暂无匹配结果，试试其他关键词
          </p>
        </article>
      </div>
    </section>
  </Popup>
</template>
