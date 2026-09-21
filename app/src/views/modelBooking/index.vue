<script setup lang="ts">
import { Button, CellGroup, DatePicker, Field, Picker, Popup } from 'vant'
import BookingServiceCard from '@/views/modelBooking/components/BookingServiceCard.vue'
import ProviderPicker from '@/views/modelBooking/components/ProviderPicker.vue'
import { useModelBooking } from '@/views/modelBooking/hooks/useModelBooking'
import { provideModelBooking } from '@/views/modelBooking/hooks/useModelBookingContext'

const booking = useModelBooking()
provideModelBooking(booking)

const {
  router,
  form,
  selectedRoleCode,
  roleOptions,
  serviceDrafts,
  selectedDateValues,
  showDatePicker,
  showCustomerTypePicker,
  showStartTimePicker,
  showEndTimePicker,
  showRolePicker,
  pickerServiceCode,
  submitting,
  error,
  success,
  activeServices,
  customerTypeColumns,
  customerTypeLabel,
  roleLabel,
  startColumns,
  endColumns,
  normalizeDate,
  addServiceSlot,
  openDate,
  submit,
} = booking
</script>

<template>
  <section class="bounce-in pb-4">
    <article class="card mb-3 overflow-hidden p-0">
      <div class="model-hero px-4 py-4">
        <div class="flex items-center justify-between">
          <div>
            <p class="title-font text-2xl text-rose-500">统一约单入口</p>
            <p class="text-xs text-slate-600">同一天可同时提交多个服务者，系统会自动关联协同订单</p>
          </div>
          <Button size="small" round plain type="primary" @click="router.push({ name: 'login' })"
            >服务者登录</Button
          >
        </div>
      </div>
    </article>

    <article class="card mb-3 p-3">
      <CellGroup inset>
        <Field
          v-model="form.modelName"
          label="客户昵称"
          required
          placeholder="请输入你的昵称"
          clearable
        />
        <Field
          v-model="form.modelPhone"
          label="联系电话"
          required
          placeholder="请输入手机号"
          maxlength="11"
          clearable
        />
        <Field
          :model-value="customerTypeLabel"
          label="客户类型"
          required
          readonly
          is-link
          @click="showCustomerTypePicker = true"
        />
        <Field
          v-model="form.companions"
          label="陪同人员"
          placeholder="可选：如闺蜜 1 人"
          clearable
        />
        <Field
          :model-value="roleLabel"
          label="服务类型"
          readonly
          is-link
          @click="showRolePicker = true"
        />
        <Field
          :model-value="form.date"
          label="服务日期"
          required
          readonly
          is-link
          @click="openDate"
        />
        <Field
          v-model="form.location"
          label="服务地点"
          placeholder="例如：创意园A栋 / 某某工作室"
          clearable
        />
        <Field
          v-model="form.note"
          label="协同备注"
          placeholder="可选：例如同一主题风格，妆容偏日系"
          clearable
        />
      </CellGroup>

      <p class="mt-2 text-xs text-slate-500">
        先按角色筛选服务者，再在每位服务者下选择本次预约角色（摄影/妆娘）。
      </p>
    </article>

    <BookingServiceCard v-for="service in activeServices" :key="service.code" :service="service" />

    <button class="btn-secondary mb-3" type="button" @click="addServiceSlot">
      <i class="fa-solid fa-plus mr-1" />新增一位服务者
    </button>

    <article v-if="error" class="card mb-3 p-3 text-xs text-amber-700 soft-yellow">
      <p class="font-bold"><i class="fa-solid fa-triangle-exclamation mr-1" />{{ error }}</p>
    </article>

    <article v-if="success" class="card mb-3 p-3 text-xs text-blue-600 soft-blue">
      <i class="fa-solid fa-circle-check mr-1" />{{ success }}
    </article>

    <Button block round type="primary" :loading="submitting" @click="submit">
      <i class="fa-solid fa-paper-plane mr-1" />提交统一约单
    </Button>

    <ProviderPicker />

    <Popup v-model:show="showDatePicker" position="bottom" round>
      <DatePicker
        v-model="selectedDateValues"
        title="选择服务日期"
        @cancel="showDatePicker = false"
        @confirm="
          ({ selectedValues }: any) => {
            form.date = normalizeDate(selectedValues)
            showDatePicker = false
          }
        "
      />
    </Popup>

    <Popup v-model:show="showCustomerTypePicker" position="bottom" round>
      <Picker
        :columns="customerTypeColumns"
        @cancel="showCustomerTypePicker = false"
        @confirm="
          ({ selectedOptions }: any) => {
            form.customerTypeCode = selectedOptions[0]?.value || form.customerTypeCode
            showCustomerTypePicker = false
          }
        "
      />
    </Popup>

    <Popup v-model:show="showRolePicker" position="bottom" round>
      <Picker
        :columns="roleOptions.map((item) => ({ text: item.name, value: item.code }))"
        @cancel="showRolePicker = false"
        @confirm="
          ({ selectedOptions }: any) => {
            selectedRoleCode = selectedOptions[0]?.value || selectedRoleCode
            showRolePicker = false
          }
        "
      />
    </Popup>

    <Popup v-model:show="showStartTimePicker" position="bottom" round>
      <Picker
        :columns="startColumns"
        @cancel="showStartTimePicker = false"
        @confirm="
          ({ selectedOptions }: any) => {
            serviceDrafts[pickerServiceCode].startTime =
              selectedOptions[0]?.value || serviceDrafts[pickerServiceCode].startTime
            showStartTimePicker = false
          }
        "
      />
    </Popup>

    <Popup v-model:show="showEndTimePicker" position="bottom" round>
      <Picker
        :columns="endColumns"
        @cancel="showEndTimePicker = false"
        @confirm="
          ({ selectedOptions }: any) => {
            serviceDrafts[pickerServiceCode].endTime =
              selectedOptions[0]?.value || serviceDrafts[pickerServiceCode].endTime
            showEndTimePicker = false
          }
        "
      />
    </Popup>
  </section>
</template>

<style scoped>
.model-hero {
  background:
    radial-gradient(circle at 15% 18%, #ffe8f2 0%, transparent 30%),
    radial-gradient(circle at 84% 12%, #e3f3ff 0%, transparent 35%),
    linear-gradient(140deg, #fff8fc 0%, #f3f9ff 48%, #fffbed 100%);
}

.service-chip {
  border: 1px solid #f2d9e7;
  border-radius: 12px;
  background: #fff;
  color: #64748b;
  font-weight: 700;
  padding: 8px 10px;
}

.service-chip--active {
  border-color: #ff9ec3;
  background: #fff1f7;
  color: #c63f79;
}

.role-chip-small {
  font-size: 10px;
  line-height: 14px;
  padding: 0 6px;
}
</style>
