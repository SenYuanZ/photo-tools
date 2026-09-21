<script setup lang="ts">
import { Button, CellGroup, DatePicker, Field, Picker, Popup, TimePicker, Uploader } from 'vant'
import PageHeader from '@/components/PageHeader.vue'
import { useScheduleEntryPage } from '@/views/scheduleEntry/hooks/useScheduleEntryPage'

const {
  router,
  form,
  error,
  success,
  showCustomerPicker,
  showDatePicker,
  showStartTimePicker,
  showEndTimePicker,
  showDepositPicker,
  showTemporaryTypePicker,
  uploading,
  referenceFileList,
  failedUploads,
  selectedDateValues,
  selectedStartTimeValues,
  selectedEndTimeValues,
  customerColumns,
  selectedCustomerLabel,
  depositStatusColumns,
  temporaryTypeColumns,
  depositStatusLabel,
  temporaryTypeLabel,
  timeColumns,
  pageTitle,
  serviceLabel,
  locationLabel,
  locationPlaceholder,
  notePlaceholder,
  referenceTitle,
  submitLabel,
  selectableRoleOptions,
  selectedRoleCodes,
  toggleRoleCode,
  selectedRolePreview,
  conflictSchedule,
  conflictCustomerName,
  normalizeDate,
  switchMode,
  openDate,
  openStartTime,
  openEndTime,
  submit,
  onAfterRead,
  retryUpload,
  depositStatusText,
} = useScheduleEntryPage()
</script>

<template>
  <section class="bounce-in">
    <PageHeader :title="pageTitle" back @back="router.back()" />

    <article class="card mb-3 p-3">
      <div class="mb-3 grid grid-cols-2 gap-2">
        <Button
          block
          round
          :type="form.entryMode === 'existing' ? 'primary' : 'default'"
          @click="switchMode('existing')"
        >
          关联长期客户
        </Button>
        <Button
          block
          round
          :type="form.entryMode === 'temporary' ? 'primary' : 'default'"
          @click="switchMode('temporary')"
        >
          临时客户直录
        </Button>
      </div>

      <p class="mb-2 text-xs text-slate-500">
        <i class="fa-solid fa-circle-info mr-1 text-blue-400" />
        临时客户用于一次性排单，不会展示在客户管理中；长期客户请在客户录入里维护。
      </p>

      <Button
        block
        round
        plain
        type="primary"
        class="mb-3"
        @click="router.push({ name: 'customer-new' })"
      >
        新增长期客户
      </Button>

      <CellGroup inset>
        <template v-if="form.entryMode === 'existing'">
          <Field
            :model-value="selectedCustomerLabel"
            label="选择客户"
            required
            readonly
            is-link
            @click="showCustomerPicker = true"
          />
        </template>
        <template v-else>
          <Field
            v-model="form.temporaryCustomerName"
            label="临时客户"
            required
            placeholder="请输入姓名"
            clearable
          />
          <Field
            v-model="form.temporaryCustomerPhone"
            label="联系电话"
            required
            type="tel"
            placeholder="请输入手机号"
            clearable
          />
          <Field
            :model-value="temporaryTypeLabel"
            label="客户类型"
            required
            readonly
            is-link
            @click="showTemporaryTypePicker = true"
          />
        </template>
        <Field
          :model-value="selectedRolePreview || '请选择服务角色'"
          label="服务角色"
          required
          readonly
        />
        <Field
          :model-value="form.date"
          :label="`${serviceLabel}日期`"
          required
          readonly
          is-link
          @click="openDate"
        />
        <Field
          :model-value="form.startTime"
          label="开始时间"
          required
          readonly
          is-link
          @click="openStartTime"
        />
        <Field
          :model-value="form.endTime"
          label="结束时间"
          required
          readonly
          is-link
          @click="openEndTime"
        />
        <Field
          v-model="form.location"
          :label="locationLabel"
          required
          :placeholder="locationPlaceholder"
          clearable
        />
        <Field
          :model-value="depositStatusLabel"
          label="定金状态"
          required
          readonly
          is-link
          @click="showDepositPicker = true"
        />
        <Field v-model="form.amount" label="定金金额" type="number" placeholder="请输入金额" />
        <Field
          v-model="form.note"
          label="备注信息"
          type="textarea"
          rows="2"
          autosize
          :placeholder="notePlaceholder"
        />
      </CellGroup>

      <div class="mt-3 rounded-xl border border-slate-100 bg-white p-2.5">
        <p class="mb-2 text-xs font-bold text-slate-500">
          <i class="fa-solid fa-tags mr-1 text-rose-400" />选择本次预约服务角色（可多选）
        </p>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="role in selectableRoleOptions"
            :key="role.code"
            type="button"
            class="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-bold transition"
            :class="
              selectedRoleCodes.includes(role.code)
                ? 'border-rose-200 bg-rose-50 text-rose-500'
                : 'border-slate-200 bg-slate-50 text-slate-500'
            "
            @click="toggleRoleCode(role.code)"
          >
            <i
              :class="
                selectedRoleCodes.includes(role.code)
                  ? 'fa-solid fa-circle-check'
                  : 'fa-regular fa-circle'
              "
            />
            {{ role.name }}
            <span class="text-[10px] opacity-75">{{ role.description }}</span>
          </button>
        </div>
      </div>

      <div class="mt-3">
        <p class="mb-2 text-xs font-bold text-slate-500">{{ referenceTitle }}</p>
        <Uploader
          v-model="referenceFileList"
          :max-count="6"
          multiple
          :disabled="uploading"
          :after-read="onAfterRead"
          :deletable="!uploading"
          preview-size="72"
          upload-text="上传参考图"
        />

        <div v-if="failedUploads.length" class="mt-2 space-y-1">
          <div
            v-for="item in failedUploads"
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

    <article v-if="error" class="card mb-3 p-3 text-xs text-amber-700 soft-yellow">
      <p class="font-bold"><i class="fa-solid fa-triangle-exclamation mr-1" />{{ error }}</p>
      <p v-if="conflictSchedule" class="mt-1">
        冲突排单：{{ conflictCustomerName }} {{ conflictSchedule.startTime }} -
        {{ conflictSchedule.endTime }}（{{ depositStatusText[conflictSchedule.depositStatus] }}）
      </p>
    </article>

    <article v-if="success" class="card mb-3 p-3 text-xs text-blue-600 soft-blue">
      <i class="fa-solid fa-circle-check mr-1" />{{ success }}
    </article>

    <Button block round type="primary" @click="submit">
      <i class="fa-solid fa-paper-plane mr-1" />{{ submitLabel }}
    </Button>

    <Popup v-model:show="showCustomerPicker" position="bottom" round>
      <Picker
        :columns="customerColumns"
        @cancel="showCustomerPicker = false"
        @confirm="
          ({ selectedOptions }: any) => {
            form.customerId = selectedOptions[0]?.value || ''
            showCustomerPicker = false
          }
        "
      />
    </Popup>

    <Popup v-model:show="showTemporaryTypePicker" position="bottom" round>
      <Picker
        :columns="temporaryTypeColumns"
        @cancel="showTemporaryTypePicker = false"
        @confirm="
          ({ selectedOptions }: any) => {
            form.temporaryCustomerType = selectedOptions[0]?.value || form.temporaryCustomerType
            showTemporaryTypePicker = false
          }
        "
      />
    </Popup>

    <Popup v-model:show="showDepositPicker" position="bottom" round>
      <Picker
        :columns="depositStatusColumns"
        @cancel="showDepositPicker = false"
        @confirm="
          ({ selectedOptions }: any) => {
            form.depositStatus = selectedOptions[0]?.value || form.depositStatus
            showDepositPicker = false
          }
        "
      />
    </Popup>

    <Popup v-model:show="showDatePicker" position="bottom" round>
      <DatePicker
        v-model="selectedDateValues"
        :title="`选择${serviceLabel}日期`"
        @cancel="showDatePicker = false"
        @confirm="
          ({ selectedValues }: any) => {
            form.date = normalizeDate(selectedValues)
            showDatePicker = false
          }
        "
      />
    </Popup>

    <Popup v-model:show="showStartTimePicker" position="bottom" round>
      <TimePicker
        v-model="selectedStartTimeValues"
        title="选择开始时间"
        :columns="timeColumns"
        @cancel="showStartTimePicker = false"
        @confirm="
          ({ selectedValues }: any) => {
            form.startTime = `${selectedValues[0]}:${selectedValues[1]}`
            showStartTimePicker = false
          }
        "
      />
    </Popup>

    <Popup v-model:show="showEndTimePicker" position="bottom" round>
      <TimePicker
        v-model="selectedEndTimeValues"
        title="选择结束时间"
        :columns="timeColumns"
        @cancel="showEndTimePicker = false"
        @confirm="
          ({ selectedValues }: any) => {
            form.endTime = `${selectedValues[0]}:${selectedValues[1]}`
            showEndTimePicker = false
          }
        "
      />
    </Popup>
  </section>
</template>
