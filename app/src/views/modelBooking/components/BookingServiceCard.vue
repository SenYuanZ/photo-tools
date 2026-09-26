<script setup lang="ts">
import { Button, CellGroup, Field, Uploader } from 'vant'
import defaultAvatar from '@/assets/DefaultAvatar.png'
import type { PublicProvider } from '@/api/public-booking/types'
import { useModelBookingContext } from '@/views/modelBooking/hooks/useModelBookingContext'

defineProps<{
  service: {
    code: string
    name: string
  }
}>()

const {
  providersByService,
  loadingProvidersByService,
  availabilityByService,
  serviceDrafts,
  uploading,
  roleOptions,
  selectedProviderLabel,
  selectedProvider,
  providerRoleCodes,
  selectedDraftRoleLabel,
  setDraftRoleCode,
  previewProviderPortfolio,
  slotTagClass,
  applyFreeRange,
  removeServiceSlot,
  openProviderPicker,
  openStartTimePicker,
  openEndTimePicker,
  onAfterRead,
  retryUpload,
} = useModelBookingContext()
</script>

<template>
  <article class="card mb-3 p-3 soft-pink">
    <div class="mb-2 flex items-center justify-between gap-2">
      <p class="text-sm font-extrabold">
        <i class="fa-solid fa-user-check mr-1 text-rose-500" />{{ service.name }}信息
      </p>
      <button class="chip shrink-0" type="button" @click="removeServiceSlot(service.code)">
        <i class="fa-solid fa-minus" />移除
      </button>
    </div>

    <CellGroup inset>
      <Field
        :model-value="selectedProviderLabel(service.code)"
        label="选择服务者"
        required
        readonly
        is-link
        @click="openProviderPicker(service.code)"
      />
      <Field
        :model-value="serviceDrafts[service.code].startTime"
        label="开始时间"
        required
        readonly
        is-link
        @click="openStartTimePicker(service.code)"
      />
      <Field
        :model-value="serviceDrafts[service.code].endTime"
        label="结束时间"
        required
        readonly
        is-link
        @click="openEndTimePicker(service.code)"
      />
      <Field
        v-model="serviceDrafts[service.code].requirement"
        label="服务者补充要求"
        type="textarea"
        rows="3"
        autosize
        placeholder="例如：摄影师多抓拍互动，妆娘加强眼妆还原"
      />
    </CellGroup>

    <p
      v-if="
        !loadingProvidersByService[service.code] && !(providersByService[service.code] || []).length
      "
      class="mt-2 text-xs text-amber-700"
    >
      <i
        class="fa-solid fa-triangle-exclamation mr-1"
      />当前暂无可选服务者，请确认后端已升级并配置对应身份账号。
    </p>

    <div
      v-if="selectedProvider(service.code)"
      class="mt-2 rounded-xl border border-blue-100 bg-white/90 p-2.5"
    >
      <div class="flex items-center gap-2">
        <img
          :src="selectedProvider(service.code)?.avatarUrl || defaultAvatar"
          alt="服务者头像"
          class="h-10 w-10 rounded-xl object-cover"
        />
        <div class="min-w-0 flex-1">
          <p class="truncate text-xs font-extrabold text-slate-700">
            {{ selectedProvider(service.code)?.nickname }}
          </p>
          <p class="mt-1 truncate text-[11px] text-slate-500">
            {{ selectedProvider(service.code)?.bio || '该服务者暂未填写个人简介。' }}
          </p>
          <div class="mt-2">
            <p class="mb-1 text-[11px] font-bold text-slate-500">选择服务类型</p>
            <div class="flex flex-wrap gap-1">
              <button
                v-for="roleCode in providerRoleCodes(
                  selectedProvider(service.code) as PublicProvider,
                )"
                :key="`${service.code}-pick-role-${roleCode}`"
                type="button"
                class="chip border px-2.5 py-1 text-xs font-extrabold transition"
                :class="
                  serviceDrafts[service.code].selectedRoleCode === roleCode
                    ? 'border-rose-300 bg-rose-500 text-white'
                    : 'border-slate-200 bg-slate-50 text-slate-500'
                "
                @click="setDraftRoleCode(service.code, roleCode)"
              >
                {{ roleOptions.find((item) => item.code === roleCode)?.name || roleCode }}
              </button>
            </div>
            <p v-if="selectedDraftRoleLabel(service.code)" class="mt-1 text-[11px] text-rose-500">
              已选：{{ selectedDraftRoleLabel(service.code) }}
            </p>
          </div>
        </div>
      </div>

      <div
        v-if="
          selectedProvider(service.code)?.portfolioPublic &&
          (selectedProvider(service.code)?.portfolioImages || []).length
        "
        class="mt-2"
      >
        <div class="mb-1 flex items-center justify-between">
          <p class="text-[11px] font-bold text-slate-500">公开作品集</p>
          <button class="chip" type="button" @click="previewProviderPortfolio(service.code, 0)">
            查看全部
          </button>
        </div>
        <div class="grid grid-cols-3 gap-2">
          <button
            v-for="(image, index) in (selectedProvider(service.code)?.portfolioImages || []).slice(
              0,
              3,
            )"
            :key="`${service.code}-portfolio-${index}`"
            type="button"
            class="overflow-hidden rounded-lg border border-blue-100"
            @click="previewProviderPortfolio(service.code, index)"
          >
            <img :src="image" alt="公开作品" class="h-16 w-full object-cover" />
          </button>
        </div>
      </div>
    </div>

    <div class="mt-2 rounded-xl border border-emerald-100 bg-emerald-50/70 p-2.5">
      <p class="mb-1 text-xs font-bold text-slate-600">
        <i class="fa-regular fa-clock mr-1 text-emerald-500" />当日档期
      </p>
      <p v-if="availabilityByService[service.code]?.loading" class="text-xs text-slate-500">
        正在加载档期...
      </p>
      <p v-else-if="availabilityByService[service.code]?.error" class="text-xs text-amber-700">
        {{ availabilityByService[service.code]?.error }}
      </p>
      <template v-else>
        <div class="mb-1">
          <p class="mb-1 text-[11px] font-bold text-rose-500">已占用时段</p>
          <div class="flex flex-wrap gap-1">
            <span
              v-for="range in availabilityByService[service.code]?.busyRanges || []"
              :key="`${service.code}-busy-${range.startTime}-${range.endTime}`"
              class="chip border border-rose-200 bg-rose-50 text-rose-500"
            >
              {{ range.startTime }} - {{ range.endTime }}
            </span>
            <span
              v-if="!(availabilityByService[service.code]?.busyRanges || []).length"
              class="text-[11px] text-slate-400"
              >当天暂无已占用时段</span
            >
          </div>
        </div>

        <div>
          <p class="mb-1 text-[11px] font-bold text-emerald-600">可约时间段</p>
          <div class="flex flex-wrap gap-1">
            <button
              v-for="range in availabilityByService[service.code]?.freeRanges || []"
              :key="`${service.code}-free-${range.startTime}-${range.endTime}`"
              type="button"
              class="chip border border-emerald-200 bg-emerald-50 text-emerald-600"
              @click="applyFreeRange(service.code, range)"
            >
              {{ range.startTime }} - {{ range.endTime }}
            </button>
            <span
              v-if="!(availabilityByService[service.code]?.freeRanges || []).length"
              class="text-[11px] text-slate-400"
              >当天暂无可约时间</span
            >
          </div>
          <p
            v-if="(availabilityByService[service.code]?.freeRanges || []).length"
            class="mt-1 text-[11px] text-slate-400"
          >
            点击任一可约时间段可一键填入开始与结束时间
          </p>
        </div>

        <div class="mt-2 flex flex-wrap gap-1">
          <span
            v-for="slot in ['08:00', '09:00', '10:00', '13:00', '15:00', '18:00']"
            :key="`${service.code}-slot-${slot}`"
            :class="slotTagClass(slot, service.code)"
          >
            {{ slot }}
          </span>
        </div>
      </template>
    </div>

    <div class="mt-3">
      <p class="mb-2 text-xs font-bold text-slate-500">参考图（最多 6 张）</p>
      <Uploader
        v-model="serviceDrafts[service.code].referenceFileList"
        :max-count="6"
        multiple
        :disabled="uploading"
        :after-read="(value: any) => onAfterRead(service.code, value)"
        :deletable="!uploading"
        preview-size="72"
        upload-text="上传参考图"
      />
      <div
        v-if="
          serviceDrafts[service.code].referenceFileList.filter(
            (item) => item.status === 'failed' && item.file,
          ).length
        "
        class="mt-2 space-y-1"
      >
        <div
          v-for="item in serviceDrafts[service.code].referenceFileList.filter(
            (file) => file.status === 'failed' && file.file,
          )"
          :key="item.url || item.file?.name"
          class="flex items-center justify-between text-xs text-amber-700"
        >
          <span>有图片上传失败，可重试</span>
          <Button
            size="small"
            round
            plain
            type="primary"
            :disabled="uploading"
            @click="retryUpload(item)"
            >重试</Button
          >
        </div>
      </div>
    </div>
  </article>
</template>
