<script setup lang="ts">
import { Button, Uploader } from 'vant'
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
  activeServices,
  providersByService,
  loadingProvidersByService,
  availabilityByService,
  serviceDrafts,
  uploading,
  roleOptions,
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
  getProviderAvailabilityClass,
  getProviderAvailabilityText,
} = useModelBookingContext()
</script>

<template>
  <article class="service-card">
    <header class="service-card__header">
      <div class="service-card__identity">
        <span class="service-card__icon" aria-hidden="true">
          <i class="fa-solid fa-camera" />
        </span>
        <div>
          <strong>{{ service.name }}</strong>
          <span>摄影服务</span>
        </div>
      </div>
      <button
        v-if="activeServices.length > 1"
        type="button"
        class="service-card__remove"
        aria-label="移除服务者"
        title="移除服务者"
        @click="removeServiceSlot(service.code)"
      >
        <i class="fa-solid fa-xmark" aria-hidden="true" />
      </button>
    </header>

    <button
      type="button"
      class="provider-summary"
      :aria-label="selectedProvider(service.code) ? '更换服务者' : '选择服务者'"
      @click="openProviderPicker(service.code)"
    >
      <template v-if="selectedProvider(service.code)">
        <img
          :src="selectedProvider(service.code)?.avatarUrl || defaultAvatar"
          alt="服务者头像"
          class="provider-summary__avatar"
        />
        <span class="provider-summary__copy">
          <span class="provider-summary__name-line">
            <strong>{{ selectedProvider(service.code)?.nickname }}</strong>
            <span
              class="provider-summary__status"
              :class="
                getProviderAvailabilityClass(service.code, selectedProvider(service.code)?.id || '')
              "
            >
              {{
                getProviderAvailabilityText(service.code, selectedProvider(service.code)?.id || '')
              }}
            </span>
          </span>
          <span class="provider-summary__bio">
            {{ selectedProvider(service.code)?.bio || '该服务者暂未填写个人简介。' }}
          </span>
        </span>
        <span class="provider-summary__action">
          更换
          <i class="fa-solid fa-chevron-right" aria-hidden="true" />
        </span>
      </template>
      <template v-else>
        <span class="provider-summary__placeholder" aria-hidden="true">
          <i class="fa-regular fa-user" />
        </span>
        <span class="provider-summary__copy">
          <strong class="provider-summary__empty-title">选择服务者</strong>
          <span class="provider-summary__bio">选择后显示可约时间和服务角色</span>
        </span>
        <span class="provider-summary__action">
          选择
          <i class="fa-solid fa-chevron-right" aria-hidden="true" />
        </span>
      </template>
    </button>

    <p
      v-if="
        !loadingProvidersByService[service.code] && !(providersByService[service.code] || []).length
      "
      class="service-card__warning"
    >
      <i class="fa-solid fa-triangle-exclamation" aria-hidden="true" />
      当前暂无可选服务者，请确认已配置对应身份账号。
    </p>

    <section v-if="selectedProvider(service.code)" class="service-role" aria-label="服务角色">
      <span class="service-sub-label"><b>*</b> 本次服务角色</span>
      <div class="service-role__options">
        <button
          v-for="roleCode in providerRoleCodes(selectedProvider(service.code) as PublicProvider)"
          :key="`${service.code}-pick-role-${roleCode}`"
          type="button"
          class="service-role__option"
          :class="{
            'service-role__option--active':
              serviceDrafts[service.code].selectedRoleCode === roleCode,
          }"
          :aria-pressed="serviceDrafts[service.code].selectedRoleCode === roleCode"
          @click="setDraftRoleCode(service.code, roleCode)"
        >
          {{ roleOptions.find((item) => item.code === roleCode)?.name || roleCode }}
        </button>
      </div>
      <span v-if="selectedDraftRoleLabel(service.code)" class="service-role__selected">
        已选：{{ selectedDraftRoleLabel(service.code) }}
      </span>
    </section>

    <div class="service-time-grid">
      <div class="service-time-field">
        <span class="service-sub-label"><b>*</b> 开始时间</span>
        <button type="button" @click="openStartTimePicker(service.code)">
          <i class="fa-regular fa-clock" aria-hidden="true" />
          <span>{{ serviceDrafts[service.code].startTime || '请选择' }}</span>
          <i class="fa-solid fa-chevron-right" aria-hidden="true" />
        </button>
      </div>
      <div class="service-time-field">
        <span class="service-sub-label"><b>*</b> 结束时间</span>
        <button type="button" @click="openEndTimePicker(service.code)">
          <i class="fa-regular fa-clock" aria-hidden="true" />
          <span>{{ serviceDrafts[service.code].endTime || '请选择' }}</span>
          <i class="fa-solid fa-chevron-right" aria-hidden="true" />
        </button>
      </div>
    </div>

    <section class="availability-panel" aria-label="当日档期">
      <div class="availability-panel__heading">
        <span class="service-sub-label">可约时间段</span>
        <span v-if="availabilityByService[service.code]?.loading">加载中</span>
      </div>

      <p v-if="availabilityByService[service.code]?.error" class="availability-panel__error">
        {{ availabilityByService[service.code]?.error }}
      </p>
      <template v-else-if="!availabilityByService[service.code]?.loading">
        <div class="availability-ranges">
          <button
            v-for="range in availabilityByService[service.code]?.freeRanges || []"
            :key="`${service.code}-free-${range.startTime}-${range.endTime}`"
            type="button"
            class="availability-range"
            :class="{
              'availability-range--active':
                serviceDrafts[service.code].startTime === range.startTime &&
                serviceDrafts[service.code].endTime === range.endTime,
            }"
            @click="applyFreeRange(service.code, range)"
          >
            {{ range.startTime }}–{{ range.endTime }}
          </button>
          <span
            v-if="!(availabilityByService[service.code]?.freeRanges || []).length"
            class="availability-panel__empty"
          >
            选择服务者后显示可约时间
          </span>
        </div>

        <p
          v-for="range in availabilityByService[service.code]?.busyRanges || []"
          :key="`${service.code}-busy-${range.startTime}-${range.endTime}`"
          class="availability-panel__busy"
        >
          <i class="fa-regular fa-circle-xmark" aria-hidden="true" />
          {{ range.startTime }}–{{ range.endTime }} 已占用
        </p>

        <div
          v-if="availabilityByService[service.code]?.availableSlots?.length"
          class="availability-slots"
          aria-label="档期概览"
        >
          <span
            v-for="slot in ['08:00', '09:00', '10:00', '13:00', '15:00', '18:00']"
            :key="`${service.code}-slot-${slot}`"
            :class="slotTagClass(slot, service.code)"
          >
            {{ slot }}
          </span>
        </div>
      </template>
    </section>

    <section
      v-if="
        selectedProvider(service.code)?.portfolioPublic &&
        (selectedProvider(service.code)?.portfolioImages || []).length
      "
      class="portfolio-strip"
      aria-label="公开作品集"
    >
      <div class="portfolio-strip__heading">
        <span class="service-sub-label">公开作品集</span>
        <button type="button" @click="previewProviderPortfolio(service.code, 0)">查看全部</button>
      </div>
      <div class="portfolio-strip__images">
        <button
          v-for="(image, index) in (selectedProvider(service.code)?.portfolioImages || []).slice(
            0,
            3,
          )"
          :key="`${service.code}-portfolio-${index}`"
          type="button"
          @click="previewProviderPortfolio(service.code, index)"
        >
          <img :src="image" alt="公开作品" />
        </button>
      </div>
    </section>

    <details class="service-extras">
      <summary>
        <span>补充要求与参考图（可选）</span>
        <i class="fa-solid fa-chevron-right" aria-hidden="true" />
      </summary>
      <div class="service-extras__body">
        <label class="service-requirement">
          <span class="service-sub-label">给服务者的补充要求</span>
          <textarea
            v-model="serviceDrafts[service.code].requirement"
            rows="3"
            placeholder="例如：多抓拍互动，加强眼妆还原"
          />
        </label>

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
          class="upload-errors"
        >
          <div
            v-for="item in serviceDrafts[service.code].referenceFileList.filter(
              (file) => file.status === 'failed' && file.file,
            )"
            :key="item.url || item.file?.name"
            class="upload-error"
          >
            <span>有图片上传失败，可重试</span>
            <Button
              size="small"
              plain
              type="primary"
              :disabled="uploading"
              @click="retryUpload(item)"
            >
              重试
            </Button>
          </div>
        </div>
      </div>
    </details>
  </article>
</template>

<style scoped>
.service-card {
  overflow: hidden;
  border: 1px solid var(--theme-form-border);
  border-radius: 10px;
  background: var(--theme-surface);
}

.service-card__header {
  display: flex;
  min-height: 52px;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 8px 10px;
  background: color-mix(in srgb, var(--theme-accent-bg) 58%, var(--theme-surface));
}

.service-card__identity {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 9px;
}

.service-card__icon {
  display: inline-flex;
  width: 34px;
  height: 34px;
  flex: 0 0 34px;
  align-items: center;
  justify-content: center;
  border-radius: 9px;
  background: var(--theme-surface);
  color: var(--theme-accent-strong);
}

.service-card__identity strong,
.service-card__identity span {
  display: block;
}

.service-card__identity strong {
  color: var(--ink);
  font-size: 12px;
  font-weight: 800;
}

.service-card__identity div > span {
  margin-top: 2px;
  color: var(--theme-muted-soft);
  font-size: 10px;
}

.service-card__remove {
  display: inline-flex;
  width: 38px;
  height: 38px;
  flex: 0 0 38px;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--theme-form-border);
  border-radius: 9px;
  background: var(--theme-surface);
  color: var(--theme-muted);
}

.provider-summary {
  display: grid;
  width: 100%;
  min-height: 62px;
  grid-template-columns: 42px minmax(0, 1fr) auto;
  align-items: center;
  gap: 9px;
  border: 0;
  border-top: 1px solid var(--theme-form-border);
  border-bottom: 1px solid var(--theme-form-border);
  padding: 9px 10px;
  background: var(--theme-surface);
  text-align: left;
}

.provider-summary__avatar,
.provider-summary__placeholder {
  width: 42px;
  height: 42px;
  border-radius: 10px;
}

.provider-summary__avatar {
  object-fit: cover;
}

.provider-summary__placeholder {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px dashed var(--theme-accent-soft);
  background: var(--theme-accent-bg);
  color: var(--theme-accent-strong);
}

.provider-summary__copy {
  min-width: 0;
}

.provider-summary__name-line {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 6px;
}

.provider-summary__name-line strong,
.provider-summary__empty-title {
  overflow: hidden;
  color: var(--ink);
  font-size: 12px;
  font-weight: 800;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.provider-summary__status {
  flex: 0 0 auto;
  border: 1px solid #ccecdf;
  border-radius: 999px;
  padding: 2px 6px;
  background: #effaf6;
  font-size: 9px;
  font-weight: 800;
}

.provider-summary__bio {
  display: block;
  margin-top: 3px;
  overflow: hidden;
  color: var(--theme-muted-soft);
  font-size: 10px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.provider-summary__action {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: var(--theme-accent-strong);
  font-size: 10px;
  font-weight: 800;
}

.provider-summary__action i {
  font-size: 8px;
}

.service-card__warning {
  margin: 8px 10px 0;
  color: var(--theme-status);
  font-size: 10px;
  line-height: 1.5;
}

.service-role,
.service-time-grid,
.availability-panel,
.portfolio-strip,
.service-extras {
  margin-right: 10px;
  margin-left: 10px;
}

.service-role {
  padding: 11px 0 4px;
}

.service-sub-label {
  display: block;
  color: var(--theme-muted);
  font-size: 10px;
  font-weight: 700;
  line-height: 1.4;
}

.service-sub-label b {
  margin-right: 2px;
  color: #d45a6c;
}

.service-role__options {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 6px;
}

.service-role__option {
  min-height: 34px;
  border: 1px solid var(--theme-form-border);
  border-radius: 9px;
  padding: 0 12px;
  background: var(--theme-surface);
  color: var(--theme-muted);
  font-size: 11px;
  font-weight: 800;
}

.service-role__option--active {
  border-color: var(--theme-accent-strong);
  background: var(--theme-accent-strong);
  color: var(--theme-on-accent);
}

.service-role__selected {
  display: block;
  margin-top: 5px;
  color: var(--theme-accent-strong);
  font-size: 9px;
}

.service-time-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  padding-top: 8px;
}

.service-time-field button {
  display: grid;
  width: 100%;
  min-height: 44px;
  grid-template-columns: 18px minmax(0, 1fr) 10px;
  align-items: center;
  gap: 6px;
  margin-top: 5px;
  border: 1px solid var(--theme-form-border);
  border-radius: 9px;
  padding: 0 9px;
  background: var(--theme-surface);
  color: var(--ink);
  font-size: 12px;
  text-align: left;
}

.service-time-field button i:first-child {
  color: var(--theme-accent-strong);
}

.service-time-field button i:last-child {
  color: var(--theme-muted-soft);
  font-size: 8px;
}

.availability-panel {
  margin-top: 10px;
  border-top: 1px dashed var(--theme-form-border);
  padding: 9px 0 8px;
}

.availability-panel__heading,
.portfolio-strip__heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.availability-panel__heading > span:last-child {
  color: var(--theme-muted-soft);
  font-size: 9px;
}

.availability-ranges {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 7px;
}

.availability-range {
  min-height: 32px;
  border: 1px solid #ccecdf;
  border-radius: 9px;
  padding: 0 8px;
  background: #effaf6;
  color: #2f836c;
  font-size: 10px;
  font-weight: 800;
}

.availability-range--active {
  border-color: #2f836c;
  box-shadow: 0 0 0 2px rgba(47, 131, 108, 0.13);
}

.availability-panel__empty {
  color: var(--theme-muted-soft);
  font-size: 10px;
}

.availability-panel__busy,
.availability-panel__error {
  margin: 7px 0 0;
  color: var(--theme-status);
  font-size: 9px;
}

.availability-slots {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-top: 8px;
}

.availability-slots :deep(.chip) {
  border-radius: 7px;
  padding: 3px 7px;
  font-size: 9px;
}

.portfolio-strip {
  border-top: 1px dashed var(--theme-form-border);
  padding: 9px 0;
}

.portfolio-strip__heading button {
  min-height: 30px;
  border: 0;
  background: transparent;
  color: var(--theme-accent-strong);
  font-size: 10px;
  font-weight: 800;
}

.portfolio-strip__images {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 7px;
  margin-top: 6px;
}

.portfolio-strip__images button {
  overflow: hidden;
  aspect-ratio: 4 / 3;
  border: 1px solid var(--theme-form-border);
  border-radius: 8px;
  padding: 0;
  background: var(--theme-accent-bg);
}

.portfolio-strip__images img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.service-extras {
  border-top: 1px dashed var(--theme-form-border);
}

.service-extras summary {
  display: flex;
  min-height: 42px;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  color: var(--theme-muted);
  cursor: pointer;
  font-size: 10px;
  font-weight: 700;
  list-style: none;
}

.service-extras summary::-webkit-details-marker {
  display: none;
}

.service-extras summary i {
  font-size: 8px;
  transition: transform 160ms ease;
}

.service-extras[open] summary i {
  transform: rotate(90deg);
}

.service-extras__body {
  padding: 0 0 10px;
}

.service-requirement {
  display: block;
  margin-bottom: 9px;
}

.service-requirement textarea {
  width: 100%;
  min-height: 74px;
  resize: vertical;
  border: 1px solid var(--theme-form-border);
  border-radius: 9px;
  margin-top: 5px;
  padding: 9px 10px;
  background: var(--theme-surface);
  color: var(--ink);
  font-size: 11px;
  line-height: 1.5;
  outline: none;
}

.service-requirement textarea:focus,
.service-card button:focus-visible {
  outline: 2px solid var(--theme-focus-ring);
  outline-offset: 1px;
}

.upload-errors {
  display: grid;
  gap: 6px;
  margin-top: 8px;
}

.upload-error {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  color: var(--theme-status);
  font-size: 10px;
}

@media (max-width: 359px) {
  .service-time-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (prefers-reduced-motion: reduce) {
  .service-extras summary i {
    transition: none;
  }
}
</style>
