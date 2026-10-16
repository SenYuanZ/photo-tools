<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import dayjs from 'dayjs'
import { Button, CellGroup, DatePicker, Field, Popup, TimePicker, Uploader } from 'vant'
import type { PublicBookingAiBrief } from '@/api/public-booking/types'
import DetailAccordionRow from '@/views/scheduleDetail/components/DetailAccordionRow.vue'
import DetailActionDock from '@/views/scheduleDetail/components/DetailActionDock.vue'
import DetailCustomerSummary from '@/views/scheduleDetail/components/DetailCustomerSummary.vue'
import DetailScheduleOverview from '@/views/scheduleDetail/components/DetailScheduleOverview.vue'
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
  restoreMinDate,
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
  showAssistant,
  isGenerating: aiIsGenerating,
  rawText: aiRawText,
  result: aiResult,
  sources: aiSources,
  warnings: aiWarnings,
  error: aiError,
  timeline: aiTimeline,
  shooting: aiShooting,
  poses: aiPoses,
  lighting: aiLighting,
  risks: aiRisks,
  questions: aiQuestions,
  isCached: aiIsCached,
  generatedAtText: aiGeneratedAtText,
  openAssistant,
  closeAssistant,
  stop: stopAiGeneration,
  copyResult: copyAiResult,
  saveResult: saveAiResult,
  retry: retryAiGeneration,
  formatAdviceItem: formatAiAdviceItem,
} = useScheduleDetailPage()

const aiBriefThemeLabels: Record<string, string> = {
  cosplay: 'Cosplay',
  jk: 'JK',
  lolita: '洛丽塔',
  hanfu: '汉服',
  daily: '日常写真',
  other: '其他',
}

const aiBriefItems = computed(() => {
  const rawBrief = schedule.value?.serviceMeta?.aiBrief
  if (!rawBrief || typeof rawBrief !== 'object' || Array.isArray(rawBrief)) return []

  const brief = rawBrief as PublicBookingAiBrief
  return [
    { label: '拍摄类型', value: brief.themeType ? aiBriefThemeLabels[brief.themeType] : '' },
    { label: '作品风格', value: brief.workName || '' },
    { label: '角色名称', value: brief.characterName || '' },
    { label: '角色设定', value: brief.characterSetting || '' },
    { label: '服装妆造', value: brief.outfit || '' },
    { label: '妆容发型', value: brief.makeupHair || '' },
    { label: '必留元素', value: brief.props || '' },
    { label: '画面重点', value: brief.visualGoal || '' },
    { label: '动作偏好', value: brief.posePreference || '' },
    { label: '避免事项', value: brief.avoid || '' },
  ].filter((item) => item.value.trim())
})

const customerNeedItems = computed(() => {
  const aiValues = new Set(aiBriefItems.value.map((item) => item.value.trim()))
  const items = [
    { label: '拍摄风格', value: customer.value?.style || '' },
    { label: '客户爱好', value: customer.value?.hobby || '' },
    { label: '特殊需求', value: customer.value?.specialNeed || '' },
    { label: '现场备注', value: schedule.value?.note || '' },
    { label: '陪同人员', value: customer.value?.companions || '' },
    { label: '穿搭建议', value: customer.value?.outfit || '' },
  ]
  return items.filter((item) => item.value.trim() && !aiValues.has(item.value.trim()))
})

const hasShootingNeeds = computed(
  () => aiBriefItems.value.length > 0 || customerNeedItems.value.length > 0,
)

const hasSavedAiPlan = computed(() => {
  const aiPlan = schedule.value?.serviceMeta?.aiPlan
  return Boolean(aiPlan && typeof aiPlan === 'object' && !Array.isArray(aiPlan))
})

const customerTagItems = computed(() => customer.value?.tags || [])
const sourceLabel = computed(() =>
  schedule.value?.bookingGroupId || schedule.value?.serviceMeta?.source === 'public-model-booking'
    ? '自助预约'
    : '手动排单',
)

const hasReferenceImages = computed(
  () => isEditing.value || Boolean(schedule.value?.referenceImages?.length),
)

const showMoreActions = shallowRef(false)

const statusLabel = computed(() => {
  if (isStored.value) return '暂存'
  if (isCompleted.value) return '已完成'
  if (schedule.value?.status === 'pending_confirm') return '待确认'
  return '正常排单'
})

const scheduleDate = computed(() => dayjs(schedule.value?.date))
const weekdayLabels = ['日', '一', '二', '三', '四', '五', '六']
const dateLabel = computed(
  () =>
    `${scheduleDate.value.month() + 1}月${scheduleDate.value.date()}日 · 周${weekdayLabels[scheduleDate.value.day()]}`,
)
const fullDate = computed(() => scheduleDate.value.format('YYYY年M月D日'))
const timeRange = computed(
  () => `${schedule.value?.startTime || '--:--'}–${schedule.value?.endTime || '--:--'}`,
)
const durationText = computed(() => {
  if (!schedule.value) return '时长待定'
  const start = dayjs(`${schedule.value.date} ${schedule.value.startTime}`)
  const end = dayjs(`${schedule.value.date} ${schedule.value.endTime}`)
  const minutes = Math.max(0, end.diff(start, 'minute'))
  const hours = Math.floor(minutes / 60)
  const restMinutes = minutes % 60
  if (!minutes) return '时长待定'
  if (!hours) return `${restMinutes} 分钟`
  return `${hours} 小时${restMinutes ? ` ${restMinutes} 分钟` : ''}`
})
const serviceTypeLabel = computed(() =>
  schedule.value ? catalogStore.getServiceTypeName(schedule.value.serviceTypeCode) : '',
)
const roleLabels = computed(() =>
  detailRoleCodes.value.map((code) => catalogStore.getRoleName(code)),
)
const paymentLabel = computed(() => {
  if (!schedule.value) return ''
  return `${depositStatusText[schedule.value.depositStatus]} · ¥${schedule.value.amount}`
})
const shootingNeedItems = computed(() => [...aiBriefItems.value, ...customerNeedItems.value])
const reminderLabels = computed(() =>
  (schedule.value?.reminders || []).map((item) => (item === '1d' ? '提前1天' : '提前1小时')),
)
const visibleReferenceImages = computed(() =>
  isEditing.value ? getReferenceUrls() : schedule.value?.referenceImages || [],
)

const primaryAction = computed(() => {
  if (isEditing.value) {
    return { label: '保存修改', disabled: false }
  }
  if (isStored.value) {
    return { label: '恢复排单', disabled: false }
  }
  if (isCompleted.value) {
    return { label: '订单已完成', disabled: true }
  }
  return { label: '完成订单', disabled: false }
})

const handlePrimaryAction = () => {
  if (isEditing.value) {
    void saveEdit()
    return
  }
  if (isStored.value) {
    openRestoreDate()
    return
  }
  if (!isCompleted.value) void completeSchedule()
}

const handleStoreSchedule = () => {
  showMoreActions.value = false
  void storeSchedule()
}

const handleRemove = () => {
  showMoreActions.value = false
  void remove()
}
</script>

<template>
  <section v-if="schedule && customer" class="schedule-detail-page">
    <header class="detail-header">
      <button type="button" class="header-button" aria-label="返回" @click="router.back()">
        <i class="fa-solid fa-chevron-left" aria-hidden="true" />
      </button>
      <h1>排单详情</h1>
      <button
        type="button"
        class="header-button header-button--edit"
        @click="isEditing = !isEditing"
      >
        {{ isEditing ? '取消' : '编辑' }}
      </button>
    </header>

    <div class="detail-content">
      <DetailScheduleOverview
        v-if="!isEditing"
        :date-label="dateLabel"
        :full-date="fullDate"
        :time-range="timeRange"
        :duration-text="durationText"
        :status-label="statusLabel"
        :location="schedule.location"
        @navigate="navigateToMap"
      />

      <article v-else class="surface edit-schedule" aria-labelledby="edit-schedule-heading">
        <div class="section-heading">
          <h2 id="edit-schedule-heading" class="section-title">
            <i class="fa-solid fa-pen-to-square" aria-hidden="true" />
            编辑拍摄安排
          </h2>
          <span class="section-note">保存后立即生效</span>
        </div>
        <CellGroup inset>
          <Field :model-value="editForm.date" label="拍摄日期" readonly is-link @click="openDate" />
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
      </article>

      <div class="information-surface">
        <DetailCustomerSummary
          :customer-name="customer.name"
          :phone="customer.phone"
          :customer-type="catalogStore.getCustomerTypeName(customer.type)"
          :tags="customerTagItems"
          :source-label="sourceLabel"
          :service-type="serviceTypeLabel"
          :role-labels="roleLabels"
          @copy-phone="copyPhone"
        />
        <section class="needs-section" aria-labelledby="detail-needs-heading">
          <div class="section-heading">
            <h2 id="detail-needs-heading" class="section-title">拍摄需求</h2>
            <span v-if="isEditing" class="section-note">编辑现场备注</span>
          </div>
          <textarea
            v-if="isEditing"
            v-model="editForm.note"
            class="textarea"
            rows="4"
            placeholder="补充客户现场要求"
          />
          <dl v-else-if="hasShootingNeeds" class="needs-list">
            <div v-for="item in shootingNeedItems" :key="item.label" class="need-row">
              <dt>
                <span class="detail-tag">{{ item.label }}</span>
              </dt>
              <dd>
                <span :class="{ 'detail-tag': item.label === '陪同人员' }">{{ item.value }}</span>
              </dd>
            </div>
          </dl>
          <p v-else class="empty-copy">暂无补充需求</p>
        </section>
      </div>

      <button type="button" class="ai-panel" @click="openAssistant">
        <i class="fa-solid fa-wand-magic-sparkles" aria-hidden="true" />
        <span>{{ hasSavedAiPlan ? '查看 AI 拍摄方案' : '生成 AI 拍摄方案' }}</span>
        <i class="fa-solid fa-chevron-right ai-panel__arrow" aria-hidden="true" />
      </button>

      <section class="secondary-list" aria-label="其他排单信息">
        <DetailAccordionRow title="收款详情" :summary="paymentLabel">
          <template #summary>
            <span class="detail-tag detail-tag--status">{{
              depositStatusText[schedule.depositStatus]
            }}</span>
            <span class="payment-amount">¥{{ schedule.amount }}</span>
          </template>
          <p v-if="customer.tailPaymentDate" class="tail-payment">
            尾款日期：{{ customer.tailPaymentDate }}
          </p>
          <div class="payment-options" role="group" aria-label="收款状态">
            <button
              type="button"
              :class="{ 'is-active': paymentForm.depositStatus === 'unpaid' }"
              @click="paymentForm.depositStatus = 'unpaid'"
            >
              未支付
            </button>
            <button
              type="button"
              :class="{ 'is-active': paymentForm.depositStatus === 'paid' }"
              @click="paymentForm.depositStatus = 'paid'"
            >
              已支付
            </button>
            <button
              type="button"
              :class="{ 'is-active': paymentForm.depositStatus === 'full' }"
              @click="paymentForm.depositStatus = 'full'"
            >
              全款
            </button>
          </div>
          <Field
            v-model="paymentForm.amount"
            class="payment-field"
            label="实收金额"
            type="number"
            placeholder="请输入到账金额"
          />
          <p class="form-hint">建议到账后再确认状态；切回未支付时将保留历史金额记录。</p>
          <Button block round type="primary" class="payment-save" @click="savePaymentStatus">
            <i class="fa-solid fa-money-check-dollar" aria-hidden="true" />保存收款状态
          </Button>
        </DetailAccordionRow>

        <DetailAccordionRow title="提醒设置">
          <template #summary>
            <span v-for="label in reminderLabels" :key="label" class="detail-tag">{{ label }}</span>
            <span v-if="!reminderLabels.length">未设置</span>
          </template>
          <div class="reminder-options">
            <button
              type="button"
              :class="{ 'is-active': schedule.reminders.includes('1d') }"
              @click="toggleReminder('1d')"
            >
              <i
                :class="
                  schedule.reminders.includes('1d') ? 'fa-solid fa-check' : 'fa-solid fa-plus'
                "
                aria-hidden="true"
              />
              提前 1 天
            </button>
            <button
              type="button"
              :class="{ 'is-active': schedule.reminders.includes('1h') }"
              @click="toggleReminder('1h')"
            >
              <i
                :class="
                  schedule.reminders.includes('1h') ? 'fa-solid fa-check' : 'fa-solid fa-plus'
                "
                aria-hidden="true"
              />
              提前 1 小时
            </button>
          </div>
        </DetailAccordionRow>

        <DetailAccordionRow
          v-if="hasReferenceImages"
          title="参考图"
          :summary="`${visibleReferenceImages.length} 张`"
        >
          <template #summary>
            <span class="detail-tag">{{ visibleReferenceImages.length }} 张</span>
          </template>
          <div v-if="isEditing" class="reference-uploader">
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

            <div v-if="failedReferenceUploads.length" class="upload-errors">
              <div
                v-for="item in failedReferenceUploads"
                :key="item.url || item.file?.name"
                class="upload-error"
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

          <div class="reference-grid">
            <button
              v-for="(image, index) in visibleReferenceImages"
              :key="`${image}-${index}`"
              type="button"
              class="reference-image"
              @click="previewReferences(index)"
            >
              <img :src="image" alt="动作参考图" />
            </button>
          </div>
        </DetailAccordionRow>
        <DetailAccordionRow title="预约信息" :summary="sourceLabel">
          <template #summary
            ><span class="detail-tag detail-tag--accent">{{ sourceLabel }}</span></template
          >
          <dl class="booking-fields">
            <div>
              <dt>预约来源</dt>
              <dd>{{ sourceLabel }}</dd>
            </div>
            <div>
              <dt>拍摄日期</dt>
              <dd>{{ fullDate }}</dd>
            </div>
            <div v-if="schedule.bookingGroupId">
              <dt>预约单号</dt>
              <dd>{{ schedule.bookingGroupId }}</dd>
            </div>
          </dl>
        </DetailAccordionRow>
      </section>

      <p v-if="feedback" class="feedback" role="status">{{ feedback }}</p>
    </div>

    <DetailActionDock
      :primary-label="primaryAction.label"
      :primary-disabled="primaryAction.disabled"
      :show-more="!isEditing"
      @primary="handlePrimaryAction"
      @more="showMoreActions = true"
    />

    <Popup v-model:show="showMoreActions" position="bottom" round>
      <section class="action-sheet" aria-labelledby="more-action-heading">
        <div class="sheet-handle" />
        <h2 id="more-action-heading">更多操作</h2>
        <button v-if="!isStored" type="button" class="sheet-action" @click="handleStoreSchedule">
          <i class="fa-solid fa-box-archive" aria-hidden="true" />
          暂存订单
        </button>
        <button type="button" class="sheet-action sheet-action--danger" @click="handleRemove">
          <i class="fa-regular fa-trash-can" aria-hidden="true" />
          删除排单
        </button>
        <button type="button" class="sheet-cancel" @click="showMoreActions = false">取消</button>
      </section>
    </Popup>

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
        :min-date="restoreMinDate"
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

    <Popup v-model:show="showAssistant" position="bottom" round :style="{ height: '88%' }">
      <div class="ai-assistant">
        <div class="ai-header">
          <div>
            <p class="ai-title">AI 拍摄方案</p>
            <p v-if="aiIsCached && aiGeneratedAtText" class="ai-subtitle">
              已使用上次生成方案 · {{ aiGeneratedAtText }}
            </p>
            <p v-else class="ai-subtitle">仅基于当前排单文字信息生成</p>
          </div>
          <button
            class="ai-close"
            type="button"
            aria-label="关闭 AI 拍摄方案"
            :disabled="aiIsGenerating"
            @click="closeAssistant"
          >
            <i class="fa-solid fa-xmark" />关闭
          </button>
        </div>

        <div class="ai-scroll">
          <div v-if="aiIsGenerating" class="ai-progress">
            <span><i class="fa-solid fa-spinner fa-spin mr-1" />正在生成拍摄方案...</span>
            <button class="ai-inline-button" type="button" @click="stopAiGeneration">停止</button>
          </div>

          <p v-if="aiError" class="ai-error">
            {{ aiError }}
          </p>

          <p v-if="aiIsGenerating && aiRawText" class="ai-raw">
            已收到方案内容，正在整理为可执行的拍摄建议...
          </p>

          <template v-if="aiResult">
            <section class="ai-summary">
              <h3>
                {{ aiResult.title || 'AI 拍摄方案' }}
              </h3>
              <p>
                {{ aiResult.summary || '暂无摘要' }}
              </p>
            </section>

            <section v-if="aiResult.format === 'markdown'" class="ai-advice-block">
              <pre class="ai-markdown">{{ aiResult.markdown }}</pre>
            </section>

            <template v-else>
              <section v-if="aiTimeline.length" class="ai-section">
                <h3 class="ai-section-title">时间安排</h3>
                <div class="ai-timeline">
                  <div
                    v-for="item in aiTimeline"
                    :key="`${item.time}-${item.title}`"
                    class="ai-timeline-item"
                  >
                    <p class="ai-time">{{ item.time || '待定' }}</p>
                    <p class="ai-item-title">{{ item.title }}</p>
                    <p class="ai-item-copy">{{ item.detail }}</p>
                  </div>
                </div>
              </section>

              <section
                v-for="section in [
                  { title: '怎么拍', items: aiShooting },
                  { title: '通用动作参考', items: aiPoses },
                  { title: '打光思路', items: aiLighting },
                  { title: '风险提醒', items: aiRisks },
                  { title: '待确认事项', items: aiQuestions },
                ]"
                :key="section.title"
                v-show="section.items.length"
                class="ai-advice-block"
              >
                <h3 class="ai-section-title">{{ section.title }}</h3>
                <ul class="ai-advice-list">
                  <li v-for="(item, index) in section.items" :key="`${section.title}-${index}`">
                    {{ formatAiAdviceItem(item) }}
                  </li>
                </ul>
              </section>
            </template>

            <p v-for="warning in aiWarnings" :key="warning" class="ai-warning">
              <i class="fa-solid fa-triangle-exclamation mr-1" />{{ warning }}
            </p>

            <section v-if="aiSources.length" class="ai-sources">
              <p class="ai-source-title">参考资料</p>
              <p
                v-for="source in aiSources"
                :key="`${source.source}-${source.chunkId}`"
                class="ai-source"
              >
                {{ source.source }}
              </p>
            </section>
          </template>

          <button
            v-if="aiError && !aiIsGenerating"
            class="btn-secondary ai-retry"
            type="button"
            @click="retryAiGeneration"
          >
            <i class="fa-solid fa-rotate-right mr-1" />重新获取拍摄方案
          </button>
        </div>

        <div v-if="aiResult && !aiIsGenerating" class="ai-actions">
          <button class="btn-secondary" type="button" @click="retryAiGeneration">
            <i class="fa-solid fa-rotate-right mr-1" />重新获取
          </button>
          <button class="btn-secondary" type="button" @click="copyAiResult">
            <i class="fa-regular fa-copy mr-1" />复制方案
          </button>
          <button class="btn-primary" type="button" @click="saveAiResult">
            <i class="fa-solid fa-floppy-disk mr-1" />保存到备注
          </button>
        </div>
      </div>
    </Popup>
  </section>

  <section v-else class="empty-state">未找到排单信息，可能已被删除。</section>
</template>

<style scoped>
.schedule-detail-page {
  --detail-accent-text: color-mix(in srgb, var(--theme-accent-strong) 62%, var(--ink));
  padding-bottom: 90px;
  background: var(--bg-grad-a);
  font-family: 'PingFang SC', 'Microsoft YaHei', 'Noto Sans SC', sans-serif;
  font-size: 15px;
  line-height: 1.6;
}
.detail-header {
  display: grid;
  min-height: 60px;
  grid-template-columns: 64px minmax(0, 1fr) 64px;
  align-items: center;
  margin: -16px -16px 16px;
  padding: 0 16px;
  background: var(--theme-surface);
}
.detail-header h1 {
  margin: 0;
  color: var(--ink);
  font-size: 17px;
  font-weight: 600;
  text-align: center;
}
.header-button {
  display: inline-flex;
  min-width: 44px;
  min-height: 44px;
  align-items: center;
  border: 0;
  padding: 0;
  background: transparent;
  color: var(--ink);
  font-size: 14px;
}
.header-button--edit {
  justify-content: flex-end;
  color: var(--detail-accent-text);
}
.detail-content {
  display: grid;
  gap: 16px;
}
.information-surface,
.secondary-list {
  min-width: 0;
  border-radius: 18px;
  padding: 0 20px;
  background: var(--theme-surface);
}
.needs-section {
  border-top: 1px solid var(--line);
  padding: 22px 0;
}
.surface {
  border: 1px solid var(--theme-accent-soft);
  border-radius: 20px;
  background: var(--theme-surface);
}
.edit-schedule {
  padding: 20px;
}
.edit-schedule :deep(.van-cell-group) {
  box-shadow: none;
}
.section-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}
.section-title {
  margin: 0;
  color: var(--ink);
  font-size: 17px;
  font-weight: 700;
}
.section-note {
  color: var(--theme-muted);
  font-size: 12px;
}
.needs-list {
  margin: 0;
}
.need-row {
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr);
  align-items: start;
  gap: 16px;
}
.need-row + .need-row {
  margin-top: 14px;
}
.need-row dt {
  color: var(--theme-muted);
  font-size: 14px;
}
.need-row dt .detail-tag {
  padding: 2px 6px;
}
.need-row dd {
  min-width: 0;
  margin: 0;
  padding-top: 1px;
  color: var(--ink);
  font-size: 14px;
  line-height: 1.6;
  overflow-wrap: anywhere;
  white-space: pre-line;
}
.detail-tag {
  display: inline-flex;
  max-width: 100%;
  align-items: center;
  border-radius: 999px;
  padding: 3px 9px;
  background: var(--theme-accent-bg);
  color: var(--theme-muted);
  font-size: 13px;
  line-height: 1.6;
  overflow-wrap: anywhere;
}
.detail-tag--accent {
  background: var(--theme-accent-soft);
  color: var(--detail-accent-text);
}
.detail-tag--status {
  background: var(--theme-status-soft);
  color: var(--theme-status);
}
.empty-copy {
  margin: 0;
  color: var(--theme-muted);
  font-size: 14px;
}
.ai-panel {
  display: flex;
  width: 100%;
  min-height: 60px;
  align-items: center;
  gap: 12px;
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 17px 20px;
  background: var(--theme-accent-bg);
  color: var(--detail-accent-text);
  text-align: left;
}
.ai-panel > span {
  min-width: 0;
  flex: 1;
  font-size: 14px;
  font-weight: 600;
}
.ai-panel__arrow {
  font-size: 12px;
}
.secondary-list {
  margin-top: 4px;
}
.payment-amount {
  font-variant-numeric: tabular-nums;
}
.tail-payment {
  margin: 0 0 12px;
}
.booking-fields {
  display: grid;
  gap: 10px;
  margin: 0;
}
.booking-fields > div {
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr);
  gap: 12px;
}
.booking-fields dt {
  color: var(--theme-muted);
}
.booking-fields dd {
  min-width: 0;
  margin: 0;
  color: var(--ink);
  overflow-wrap: anywhere;
}
.schedule-detail-page :deep(button:focus-visible),
.schedule-detail-page :deep(a:focus-visible),
.schedule-detail-page :deep(summary:focus-visible) {
  outline: 3px solid var(--theme-accent-strong);
  outline-offset: 3px;
}
.reminder-options {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.reminder-options button,
.payment-options button {
  min-height: 44px;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: var(--theme-surface);
  color: var(--theme-muted);
  font-size: 11px;
  font-weight: 700;
}

.reminder-options button.is-active,
.payment-options button.is-active {
  border-color: var(--theme-accent-soft);
  background: var(--theme-accent-bg);
  color: var(--theme-accent-strong);
  box-shadow: 0 0 0 2px var(--theme-focus-ring);
}

.payment-options {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 7px;
}

.payment-field {
  margin-top: 10px;
  border: 1px solid var(--theme-form-border);
  border-radius: 12px;
}

.form-hint {
  margin: 7px 0 0;
  color: var(--theme-muted-soft);
  font-size: 10px;
  line-height: 1.6;
}

.payment-save {
  margin-top: 9px;
}

.reference-uploader {
  margin-bottom: 8px;
}

.upload-errors {
  display: grid;
  gap: 4px;
  margin-top: 8px;
}

.upload-error {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  color: var(--theme-status);
  font-size: 11px;
}

.reference-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.reference-image {
  overflow: hidden;
  aspect-ratio: 1;
  min-width: 0;
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 0;
  background: var(--theme-surface);
}

.reference-image img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.feedback {
  margin: 0;
  border: 1px solid var(--theme-accent-soft);
  border-radius: 10px;
  padding: 9px 11px;
  background: var(--theme-accent-bg);
  color: var(--theme-accent-strong);
  font-size: 11px;
}

.action-sheet {
  width: 100%;
  max-width: 760px;
  margin: 0 auto;
  padding: 8px 16px calc(12px + env(safe-area-inset-bottom));
  background: var(--theme-surface);
}

.sheet-handle {
  width: 38px;
  height: 4px;
  margin: 2px auto 10px;
  border-radius: 999px;
  background: var(--line);
}

.action-sheet h2 {
  margin: 0 0 6px;
  color: var(--ink);
  font-size: 14px;
  font-weight: 800;
  text-align: center;
}

.sheet-action {
  display: flex;
  width: 100%;
  min-height: 48px;
  align-items: center;
  gap: 10px;
  border: 0;
  border-top: 1px solid var(--line);
  background: transparent;
  color: var(--ink);
  font-size: 13px;
  font-weight: 700;
  text-align: left;
}

.sheet-action i {
  width: 30px;
  color: var(--theme-accent-strong);
  text-align: center;
}

.sheet-action--danger,
.sheet-action--danger i {
  color: #c94b5d;
}

.sheet-cancel {
  display: inline-flex;
  width: 100%;
  min-height: 44px;
  align-items: center;
  justify-content: center;
  margin-top: 6px;
  border: 0;
  border-radius: 11px;
  background: var(--theme-accent-bg);
  color: var(--theme-muted);
  font-size: 12px;
  font-weight: 700;
}

.ai-assistant {
  display: flex;
  height: 100%;
  flex-direction: column;
  background: var(--theme-surface);
}

.ai-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border-bottom: 1px solid var(--line);
  padding: 12px 16px;
}

.ai-title {
  margin: 0;
  color: var(--ink);
  font-size: 16px;
  font-weight: 800;
}

.ai-subtitle {
  margin: 2px 0 0;
  color: var(--theme-muted-soft);
  font-size: 11px;
}

.ai-close,
.ai-inline-button {
  display: inline-flex;
  min-height: 44px;
  align-items: center;
  justify-content: center;
  gap: 5px;
  border: 1px solid var(--theme-accent-soft);
  border-radius: 10px;
  padding: 0 12px;
  background: var(--theme-accent-bg);
  color: var(--theme-accent-strong);
  font-size: 11px;
  font-weight: 700;
}

.ai-close:disabled {
  opacity: 0.5;
}

.ai-scroll {
  min-height: 0;
  flex: 1;
  overflow-y: auto;
  padding: 12px 16px;
}

.ai-progress,
.ai-error,
.ai-raw,
.ai-summary,
.ai-advice-block,
.ai-timeline-item {
  border-radius: 12px;
  padding: 12px;
}

.ai-progress {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 12px;
  background: var(--theme-accent-bg);
  color: var(--theme-accent-strong);
  font-size: 11px;
}

.ai-error {
  margin: 0 0 12px;
  background: #fff1f2;
  color: #c94b5d;
  font-size: 11px;
  line-height: 1.7;
}

.ai-raw,
.ai-advice-block {
  margin-top: 12px;
  background: color-mix(in srgb, var(--theme-accent-bg) 54%, var(--theme-surface));
  color: var(--theme-muted);
  font-size: 11px;
  line-height: 1.8;
}

.ai-summary {
  background: var(--theme-accent-bg);
}

.ai-summary h3,
.ai-summary p {
  margin: 0;
}

.ai-summary h3 {
  color: var(--ink);
  font-size: 16px;
  font-weight: 800;
}

.ai-summary p {
  margin-top: 4px;
  color: var(--theme-muted);
  font-size: 11px;
  line-height: 1.7;
}

.ai-markdown {
  margin: 0;
  color: var(--ink);
  font-family: inherit;
  font-size: 11px;
  line-height: 1.8;
  white-space: pre-wrap;
}

.ai-section {
  margin-top: 12px;
}

.ai-section-title {
  margin: 0 0 7px;
  color: var(--ink);
  font-size: 13px;
  font-weight: 800;
}

.ai-timeline {
  display: grid;
  gap: 8px;
}

.ai-timeline-item {
  border: 1px solid var(--line);
  background: var(--theme-surface);
}

.ai-time,
.ai-item-title,
.ai-item-copy {
  margin: 0;
}

.ai-time {
  color: var(--theme-accent-strong);
  font-size: 11px;
  font-weight: 800;
}

.ai-item-title {
  margin-top: 4px;
  color: var(--ink);
  font-size: 13px;
  font-weight: 700;
}

.ai-item-copy {
  margin-top: 4px;
  color: var(--theme-muted);
  font-size: 11px;
  line-height: 1.7;
}

.ai-advice-list {
  display: grid;
  gap: 4px;
  margin: 0;
  padding-left: 18px;
  color: var(--theme-muted);
  font-size: 11px;
  line-height: 1.7;
}

.ai-warning {
  margin: 12px 0 0;
  color: var(--theme-status);
  font-size: 11px;
  line-height: 1.7;
}

.ai-sources {
  margin-top: 12px;
  border-top: 1px solid var(--line);
  padding-top: 12px;
}

.ai-source-title,
.ai-source {
  margin: 0;
  font-size: 11px;
}

.ai-source-title {
  margin-bottom: 4px;
  color: var(--ink);
  font-weight: 800;
}

.ai-source {
  color: var(--theme-muted-soft);
  line-height: 1.7;
}

.ai-retry {
  margin-top: 12px;
}

.ai-actions {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  border-top: 1px solid var(--line);
  padding: 12px 16px;
}

.empty-state {
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 16px;
  background: var(--theme-surface);
  color: var(--theme-muted);
  font-size: 13px;
}

@media (min-width: 640px) {
  .detail-header {
    margin-right: -20px;
    margin-left: -20px;
    padding-right: 20px;
    padding-left: 20px;
  }
}
@media (max-width: 350px) {
  .schedule-detail-page {
    margin-right: -4px;
    margin-left: -4px;
  }
  .detail-header {
    margin-right: -12px;
    margin-left: -12px;
  }
  .information-surface,
  .secondary-list {
    padding-right: 16px;
    padding-left: 16px;
  }
  .need-row {
    grid-template-columns: 64px minmax(0, 1fr);
    gap: 12px;
  }

  .ai-actions {
    gap: 6px;
    padding-right: 10px;
    padding-left: 10px;
  }

  .ai-actions :deep(.btn-secondary),
  .ai-actions :deep(.btn-primary) {
    font-size: 11px;
  }
}
</style>
