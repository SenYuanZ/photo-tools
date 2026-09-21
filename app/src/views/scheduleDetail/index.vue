<script setup lang="ts">
import { Button, CellGroup, DatePicker, Field, Popup, TimePicker, Uploader } from 'vant'
import PageHeader from '@/components/PageHeader.vue'
import ServiceTags from '@/components/ServiceTags.vue'
import { useScheduleDetailPage } from '@/views/scheduleDetail/hooks/useScheduleDetailPage'

const {
  router,
  catalogStore,
  schedule,
  customer,
  isEditing,
  feedback,
  showDatePicker,
  showRestoreDatePicker,
  showStartTimePicker,
  showEndTimePicker,
  uploadingReferences,
  referenceFileList,
  failedReferenceUploads,
  selectedDateValues,
  selectedRestoreDateValues,
  selectedStartTimeValues,
  selectedEndTimeValues,
  timeColumns,
  isStored,
  isCompleted,
  detailRoleCodes,
  editForm,
  paymentForm,
  getReferenceUrls,
  normalizeDate,
  openDate,
  openStartTime,
  openEndTime,
  toggleReminder,
  saveEdit,
  savePaymentStatus,
  storeSchedule,
  completeSchedule,
  openRestoreDate,
  restoreSchedule,
  remove,
  copyPhone,
  navigateToMap,
  previewReferences,
  onAfterReadReference,
  retryReferenceUpload,
  depositStatusText,
  formatCnDate,
} = useScheduleDetailPage()
</script>

<template>
  <section class="bounce-in" v-if="schedule && customer">
    <PageHeader
      title="排单详情"
      back
      right-text="编辑"
      @back="router.back()"
      @right="isEditing = !isEditing"
    />

    <article class="card mb-3 p-3 soft-pink">
      <p class="mb-2 text-sm font-extrabold">
        <i class="fa-regular fa-calendar mr-1 text-rose-500" />排单基础信息
      </p>
      <p v-if="isStored" class="mb-2 text-xs font-bold text-amber-600">
        <i class="fa-solid fa-box-archive mr-1" />当前订单处于暂存状态，不参与日程安排。
      </p>
      <p v-else-if="isCompleted" class="mb-2 text-xs font-bold text-emerald-600">
        <i class="fa-solid fa-circle-check mr-1" />当前订单已完成，可在日历的当天完成中查看。
      </p>
      <div class="space-y-1 text-sm">
        <template v-if="isEditing">
          <CellGroup inset>
            <Field
              :model-value="editForm.date"
              label="拍摄日期"
              readonly
              is-link
              @click="openDate"
            />
            <Field
              :model-value="editForm.startTime"
              label="开始时间"
              readonly
              is-link
              @click="openStartTime"
            />
            <Field
              :model-value="editForm.endTime"
              label="结束时间"
              readonly
              is-link
              @click="openEndTime"
            />
            <Field v-model="editForm.location" label="拍摄地点" placeholder="请输入地点" />
          </CellGroup>
        </template>
        <template v-else>
          <p>拍摄日期：{{ formatCnDate(schedule.date) }}</p>
          <p>拍摄时段：{{ schedule.startTime }} - {{ schedule.endTime }}</p>
          <p>
            支付情况：{{ depositStatusText[schedule.depositStatus] }}（¥{{ schedule.amount }}）
            <span v-if="customer.tailPaymentDate">· 尾款 {{ customer.tailPaymentDate }}</span>
          </p>
          <p>
            拍摄地点：{{ schedule.location }}
            <button type="button" class="chip ml-1" @click="navigateToMap">一键导航</button>
          </p>
        </template>
      </div>
    </article>

    <article class="card mb-3 p-3 soft-blue">
      <p class="mb-2 text-sm font-extrabold">
        <i class="fa-solid fa-book-open mr-1 text-blue-500" />客户备注信息
      </p>
      <template v-if="isEditing">
        <textarea v-model="editForm.note" class="textarea" rows="4" />
      </template>
      <template v-else>
        <div class="space-y-1 text-xs leading-6 text-slate-600">
          <p><span class="font-extrabold">拍摄风格：</span>{{ customer.style || '未填写' }}</p>
          <p><span class="font-extrabold">客户爱好：</span>{{ customer.hobby || '未填写' }}</p>
          <p>
            <span class="font-extrabold">特殊需求：</span>{{ customer.specialNeed || '未填写' }}
          </p>
          <p><span class="font-extrabold">现场备注：</span>{{ schedule.note || '无' }}</p>
          <p><span class="font-extrabold">穿搭建议：</span>{{ customer.outfit || '未填写' }}</p>
          <p><span class="font-extrabold">陪同人员：</span>{{ customer.companions || '无' }}</p>
        </div>
      </template>
    </article>

    <article class="card mb-3 p-3 soft-yellow">
      <p class="mb-2 text-sm font-extrabold">
        <i class="fa-solid fa-user mr-1 text-amber-500" />客户基础信息
      </p>
      <div class="space-y-1 text-sm">
        <p>客户姓名：{{ customer.name }}</p>
        <p>
          联系电话：{{ customer.phone }}
          <button class="chip ml-1" type="button" @click="copyPhone">复制</button>
          <a class="chip ml-1" :href="`tel:${customer.phone}`">拨号</a>
        </p>
        <p>服务类型：{{ catalogStore.getServiceTypeName(schedule.serviceTypeCode) }}</p>
        <div class="flex items-start gap-1">
          <span class="text-sm">服务角色：</span>
          <ServiceTags :role-codes="detailRoleCodes" />
        </div>
        <p>客户类型：{{ catalogStore.getCustomerTypeName(customer.type) }}</p>
        <p>
          备注标签：
          <span v-for="tag in customer.tags" :key="tag" class="chip ml-1">{{ tag }}</span>
          <span v-if="!customer.tags.length" class="text-xs text-slate-500">无</span>
        </p>
      </div>
    </article>

    <article class="card mb-4 p-3">
      <p class="mb-2 text-sm font-extrabold">
        <i class="fa-regular fa-bell mr-1 text-rose-500" />提醒设置
      </p>
      <div class="grid grid-cols-2 gap-2 text-xs">
        <button class="btn-secondary" type="button" @click="toggleReminder('1d')">
          <i
            :class="
              schedule.reminders.includes('1d')
                ? 'fa-solid fa-toggle-on text-blue-500'
                : 'fa-solid fa-toggle-off text-slate-300'
            "
            class="mr-1"
          />
          提前 1 天
        </button>
        <button class="btn-secondary" type="button" @click="toggleReminder('1h')">
          <i
            :class="
              schedule.reminders.includes('1h')
                ? 'fa-solid fa-toggle-on text-blue-500'
                : 'fa-solid fa-toggle-off text-slate-300'
            "
            class="mr-1"
          />
          提前 1 小时
        </button>
      </div>
    </article>

    <article class="card mb-4 p-3 soft-yellow">
      <p class="mb-2 text-sm font-extrabold">
        <i class="fa-solid fa-wallet mr-1 text-amber-500" />收款确认
      </p>
      <div class="grid grid-cols-3 gap-2 text-xs">
        <button
          type="button"
          class="btn-secondary"
          :class="
            paymentForm.depositStatus === 'unpaid'
              ? 'ring-2 ring-rose-200 bg-rose-50 text-rose-500'
              : ''
          "
          @click="paymentForm.depositStatus = 'unpaid'"
        >
          未支付
        </button>
        <button
          type="button"
          class="btn-secondary"
          :class="
            paymentForm.depositStatus === 'paid'
              ? 'ring-2 ring-blue-200 bg-blue-50 text-blue-500'
              : ''
          "
          @click="paymentForm.depositStatus = 'paid'"
        >
          已支付
        </button>
        <button
          type="button"
          class="btn-secondary"
          :class="
            paymentForm.depositStatus === 'full'
              ? 'ring-2 ring-emerald-200 bg-emerald-50 text-emerald-600'
              : ''
          "
          @click="paymentForm.depositStatus = 'full'"
        >
          全款
        </button>
      </div>

      <Field
        v-model="paymentForm.amount"
        class="mt-2 rounded-xl"
        label="实收金额"
        type="number"
        placeholder="请输入到账金额"
      />

      <p class="mt-1 text-xs text-slate-500">
        建议到账后再确认状态；切回未支付时将保留历史金额记录。
      </p>

      <Button block round type="primary" class="mt-2" @click="savePaymentStatus">
        <i class="fa-solid fa-money-check-dollar mr-1" />保存收款状态
      </Button>
    </article>

    <article v-if="isEditing || schedule.referenceImages?.length" class="card mb-4 p-3 soft-blue">
      <div class="mb-2 flex items-center justify-between">
        <p class="text-sm font-extrabold">
          <i class="fa-regular fa-image mr-1 text-blue-500" />动作参考图
        </p>
        <button class="chip" type="button" @click="previewReferences(0)">预览全部</button>
      </div>

      <div v-if="isEditing" class="mb-2">
        <Uploader
          v-model="referenceFileList"
          :max-count="6"
          multiple
          :disabled="uploadingReferences"
          :after-read="onAfterReadReference"
          :deletable="!uploadingReferences"
          preview-size="72"
          upload-text="继续添加参考图"
        />

        <div v-if="failedReferenceUploads.length" class="mt-2 space-y-1">
          <div
            v-for="item in failedReferenceUploads"
            :key="item.url || item.file?.name"
            class="flex items-center justify-between text-xs text-amber-700"
          >
            <span>有图片上传失败，可重试</span>
            <Button
              size="small"
              round
              plain
              type="primary"
              :disabled="uploadingReferences"
              @click="retryReferenceUpload(item)"
            >
              重试
            </Button>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-3 gap-2">
        <button
          v-for="(image, index) in isEditing ? getReferenceUrls() : schedule.referenceImages || []"
          :key="`${image}-${index}`"
          type="button"
          class="overflow-hidden rounded-xl border border-blue-100 bg-white"
          @click="previewReferences(index)"
        >
          <img :src="image" alt="动作参考图" class="h-20 w-full object-cover" />
        </button>
      </div>
    </article>

    <p v-if="feedback" class="mb-2 text-xs text-blue-500">{{ feedback }}</p>
    <div class="grid grid-cols-2 gap-2">
      <button v-if="isEditing" class="btn-primary" type="button" @click="saveEdit">
        <i class="fa-solid fa-floppy-disk mr-1" />保存修改
      </button>
      <button v-else class="btn-primary" type="button" @click="router.push({ name: 'settings' })">
        <i class="fa-regular fa-bell mr-1" />设置提醒
      </button>
      <button class="btn-secondary" type="button" @click="remove">
        <i class="fa-solid fa-trash-can mr-1" />删除排单
      </button>
      <button
        v-if="!isEditing && !isStored && !isCompleted"
        class="btn-secondary"
        type="button"
        @click="completeSchedule"
      >
        <i class="fa-solid fa-flag-checkered mr-1" />完成订单
      </button>
      <button v-if="!isStored" class="btn-secondary" type="button" @click="storeSchedule">
        <i class="fa-solid fa-box-archive mr-1" />存单
      </button>
      <button v-else class="btn-primary" type="button" @click="openRestoreDate">
        <i class="fa-solid fa-calendar-check mr-1" />恢复排单
      </button>
    </div>

    <Popup v-model:show="showDatePicker" position="bottom" round>
      <DatePicker
        v-model="selectedDateValues"
        title="选择拍摄日期"
        @cancel="showDatePicker = false"
        @confirm="
          ({ selectedValues }: any) => {
            editForm.date = normalizeDate(selectedValues)
            showDatePicker = false
          }
        "
      />
    </Popup>

    <Popup v-model:show="showRestoreDatePicker" position="bottom" round>
      <DatePicker
        v-model="selectedRestoreDateValues"
        title="恢复排单日期"
        @cancel="showRestoreDatePicker = false"
        @confirm="({ selectedValues }: any) => restoreSchedule(selectedValues)"
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
            editForm.startTime = `${selectedValues[0]}:${selectedValues[1]}`
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
            editForm.endTime = `${selectedValues[0]}:${selectedValues[1]}`
            showEndTimePicker = false
          }
        "
      />
    </Popup>
  </section>

  <section v-else class="card p-4 text-sm text-slate-500">未找到排单信息，可能已被删除。</section>
</template>
