<script setup lang="ts">
import { computed } from 'vue'
import { Button, CellGroup, DatePicker, Field, Popup, TimePicker, Uploader } from 'vant'
import PageHeader from '@/components/PageHeader.vue'
import type { PublicBookingAiBrief } from '@/api/public-booking/types'
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
    { label: '作品 / 角色 / 风格', value: brief.workName || '' },
    { label: '角色名称', value: brief.characterName || '' },
    { label: '角色气质 / 设定', value: brief.characterSetting || '' },
    { label: '服装 / 妆容 / 发型 / 道具', value: brief.outfit || '' },
    { label: '妆容与发型', value: brief.makeupHair || '' },
    { label: '道具 / 必留元素', value: brief.props || '' },
    { label: '画面与动作重点', value: brief.visualGoal || '' },
    { label: '动作偏好', value: brief.posePreference || '' },
    { label: '禁忌 / 不希望出现', value: brief.avoid || '' },
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

const hasReferenceImages = computed(
  () => isEditing.value || Boolean(schedule.value?.referenceImages?.length),
)
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

    <article class="card mb-3 p-3 soft-yellow">
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <p class="text-lg font-extrabold text-slate-800">{{ customer.name }}</p>
          <p class="mt-1 text-xs text-slate-500">
            {{ catalogStore.getCustomerTypeName(customer.type) }} · {{ customer.phone }}
          </p>
        </div>
        <div class="flex shrink-0 gap-1">
          <button class="chip" type="button" title="复制电话" @click="copyPhone">
            <i class="fa-regular fa-copy" />
          </button>
          <a class="chip" :href="`tel:${customer.phone}`" title="拨打电话">
            <i class="fa-solid fa-phone" />
          </a>
        </div>
      </div>
      <div class="mt-3 flex flex-wrap items-center gap-1.5">
        <span v-if="isStored" class="chip border-amber-200 bg-amber-50 text-amber-600">
          <i class="fa-solid fa-box-archive mr-1" />暂存
        </span>
        <span
          v-else-if="isCompleted"
          class="chip border-emerald-200 bg-emerald-50 text-emerald-600"
        >
          <i class="fa-solid fa-circle-check mr-1" />已完成
        </span>
        <span v-for="tag in customerTagItems" :key="tag" class="chip">{{ tag }}</span>
      </div>
    </article>

    <article class="card mb-3 p-3 soft-pink">
      <p class="mb-3 text-sm font-extrabold">
        <i class="fa-regular fa-calendar mr-1 text-rose-500" />拍摄安排
      </p>
      <template v-if="isEditing">
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
      </template>
      <template v-else>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <p class="text-[11px] font-bold text-slate-400">拍摄日期</p>
            <p class="mt-1 text-sm font-extrabold text-slate-800">
              {{ formatCnDate(schedule.date) }}
            </p>
          </div>
          <div>
            <p class="text-[11px] font-bold text-slate-400">拍摄时间</p>
            <p class="mt-1 text-sm font-extrabold text-slate-800">
              {{ schedule.startTime }} - {{ schedule.endTime }}
            </p>
          </div>
        </div>
        <div class="mt-3 border-t border-rose-100 pt-3">
          <p class="text-[11px] font-bold text-slate-400">拍摄地点</p>
          <div class="mt-1 flex items-center justify-between gap-2">
            <p class="min-w-0 text-sm font-bold text-slate-800">{{ schedule.location }}</p>
            <button type="button" class="chip shrink-0" @click="navigateToMap">
              <i class="fa-solid fa-location-arrow mr-1" />导航
            </button>
          </div>
        </div>
      </template>
      <div
        class="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-rose-100 pt-3 text-xs text-slate-600"
      >
        <span>{{ catalogStore.getServiceTypeName(schedule.serviceTypeCode) }}</span>
        <ServiceTags :role-codes="detailRoleCodes" />
        <span>
          {{ depositStatusText[schedule.depositStatus] }} · ¥{{ schedule.amount }}
          <span v-if="customer.tailPaymentDate">· 尾款 {{ customer.tailPaymentDate }}</span>
        </span>
      </div>
    </article>

    <article class="card mb-3 p-3 soft-blue">
      <p class="mb-3 text-sm font-extrabold">
        <i class="fa-solid fa-book-open mr-1 text-blue-500" />拍摄需求
      </p>
      <template v-if="isEditing">
        <textarea
          v-model="editForm.note"
          class="textarea"
          rows="4"
          placeholder="补充客户现场要求"
        />
      </template>
      <template v-else>
        <div v-if="aiBriefItems.length" class="space-y-2">
          <p class="text-xs font-extrabold text-blue-600">AI 角色与造型</p>
          <div class="space-y-2">
            <div
              v-for="item in aiBriefItems"
              :key="item.label"
              class="rounded-lg bg-white/80 px-3 py-2 text-xs leading-5 text-slate-600"
            >
              <span class="font-extrabold text-slate-700">{{ item.label }}</span>
              <p class="mt-0.5">{{ item.value }}</p>
            </div>
          </div>
        </div>
        <div v-if="customerNeedItems.length" class="mt-3 space-y-2">
          <p class="text-xs font-extrabold text-blue-600">客户补充信息</p>
          <div class="space-y-1.5 text-xs leading-5 text-slate-600">
            <p v-for="item in customerNeedItems" :key="item.label">
              <span class="font-extrabold text-slate-700">{{ item.label }}：</span>{{ item.value }}
            </p>
          </div>
        </div>
        <p v-if="!hasShootingNeeds" class="text-xs text-slate-500">暂无补充需求</p>
      </template>
    </article>

    <article class="card mb-3 p-3 soft-pink">
      <div class="flex items-start justify-between gap-3">
        <div>
          <p class="mb-1 text-sm font-extrabold">
            <i class="fa-solid fa-wand-magic-sparkles mr-1 text-rose-500" />AI 拍摄助手
          </p>
          <p class="text-xs leading-5 text-slate-600">
            {{ hasSavedAiPlan ? '已有上次生成方案，可直接查看。' : '首次打开时生成现场拍摄建议。' }}
          </p>
        </div>
        <button class="chip shrink-0" type="button" @click="openAssistant">
          <i class="fa-solid fa-arrow-up-right-from-square" />打开
        </button>
      </div>
    </article>

    <details class="card mb-3 p-3">
      <summary class="cursor-pointer text-sm font-extrabold">
        <i class="fa-regular fa-bell mr-1 text-rose-500" />提醒设置
      </summary>
      <div class="mt-3 grid grid-cols-2 gap-2 text-xs">
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
    </details>

    <details class="card mb-3 p-3 soft-yellow">
      <summary class="cursor-pointer text-sm font-extrabold">
        <i class="fa-solid fa-wallet mr-1 text-amber-500" />收款详情
        <span class="ml-2 text-xs font-normal text-slate-500">
          {{ depositStatusText[schedule.depositStatus] }} · ¥{{ schedule.amount }}
        </span>
      </summary>
      <div class="mt-3">
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
      </div>
    </details>

    <details v-if="hasReferenceImages" class="card mb-3 p-3 soft-blue">
      <summary class="cursor-pointer text-sm font-extrabold">
        <i class="fa-regular fa-image mr-1 text-blue-500" />参考图
        <span class="ml-2 text-xs font-normal text-slate-500">
          {{ (isEditing ? getReferenceUrls() : schedule.referenceImages || []).length }} 张
        </span>
      </summary>
      <div class="mt-3">
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
            v-for="(image, index) in isEditing
              ? getReferenceUrls()
              : schedule.referenceImages || []"
            :key="`${image}-${index}`"
            type="button"
            class="overflow-hidden rounded-xl border border-blue-100 bg-white"
            @click="previewReferences(index)"
          >
            <img :src="image" alt="动作参考图" class="h-20 w-full object-cover" />
          </button>
        </div>
      </div>
    </details>

    <p v-if="feedback" class="mb-2 text-xs text-blue-500">{{ feedback }}</p>
    <div class="sticky bottom-0 z-10 -mx-4 mt-4 border-t bg-white/95 px-4 py-3 backdrop-blur">
      <button v-if="isEditing" class="btn-primary w-full" type="button" @click="saveEdit">
        <i class="fa-solid fa-floppy-disk mr-1" />保存修改
      </button>
      <template v-else>
        <button
          v-if="!isStored && !isCompleted"
          class="btn-primary w-full"
          type="button"
          @click="completeSchedule"
        >
          <i class="fa-solid fa-flag-checkered mr-1" />完成订单
        </button>
        <button
          v-else-if="isStored"
          class="btn-primary w-full"
          type="button"
          @click="openRestoreDate"
        >
          <i class="fa-solid fa-calendar-check mr-1" />恢复排单
        </button>
        <details class="mt-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
          <summary class="cursor-pointer text-center text-xs font-bold text-slate-600">
            更多操作
          </summary>
          <div class="mt-2 grid grid-cols-2 gap-2">
            <button v-if="!isStored" class="btn-secondary" type="button" @click="storeSchedule">
              <i class="fa-solid fa-box-archive mr-1" />存单
            </button>
            <button class="btn-secondary" type="button" @click="remove">
              <i class="fa-solid fa-trash-can mr-1" />删除排单
            </button>
          </div>
        </details>
      </template>
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

    <Popup v-model:show="showAssistant" position="bottom" round :style="{ height: '88%' }">
      <div class="flex h-full flex-col bg-white">
        <div
          class="flex items-center justify-between border-b px-4 py-3"
          style="border-color: var(--line)"
        >
          <div>
            <p class="text-base font-extrabold text-slate-800">AI 拍摄方案</p>
            <p v-if="aiIsCached && aiGeneratedAtText" class="mt-0.5 text-xs text-slate-500">
              已使用上次生成方案 · {{ aiGeneratedAtText }}
            </p>
            <p v-else class="mt-0.5 text-xs text-slate-500">仅基于当前排单文字信息生成</p>
          </div>
          <button class="chip" type="button" :disabled="aiIsGenerating" @click="closeAssistant">
            <i class="fa-solid fa-xmark" />关闭
          </button>
        </div>

        <div class="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          <div
            v-if="aiIsGenerating"
            class="mb-3 flex items-center justify-between rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-600"
          >
            <span><i class="fa-solid fa-spinner fa-spin mr-1" />正在生成拍摄方案...</span>
            <button class="chip" type="button" @click="stopAiGeneration">停止</button>
          </div>

          <p
            v-if="aiError"
            class="mb-3 rounded-xl bg-red-50 px-3 py-2 text-xs leading-5 text-red-600"
          >
            {{ aiError }}
          </p>

          <p
            v-if="aiIsGenerating && aiRawText"
            class="rounded-xl bg-slate-50 p-3 text-xs leading-6 text-slate-600"
          >
            已收到方案内容，正在整理为可执行的拍摄建议...
          </p>

          <template v-if="aiResult">
            <section class="rounded-xl bg-rose-50 p-3">
              <h3 class="text-base font-extrabold text-slate-800">
                {{ aiResult.title || 'AI 拍摄方案' }}
              </h3>
              <p class="mt-1 text-xs leading-5 text-slate-600">
                {{ aiResult.summary || '暂无摘要' }}
              </p>
            </section>

            <section v-if="aiResult.format === 'markdown'" class="mt-3 rounded-xl bg-slate-50 p-3">
              <pre class="whitespace-pre-wrap text-xs leading-6 text-slate-700">{{
                aiResult.markdown
              }}</pre>
            </section>

            <template v-else>
              <section v-if="aiTimeline.length" class="mt-3">
                <h3 class="mb-2 text-sm font-extrabold text-slate-800">时间安排</h3>
                <div class="space-y-2">
                  <div
                    v-for="item in aiTimeline"
                    :key="`${item.time}-${item.title}`"
                    class="rounded-xl border border-rose-100 bg-white p-3"
                  >
                    <p class="text-xs font-extrabold text-rose-500">{{ item.time || '待定' }}</p>
                    <p class="mt-1 text-sm font-bold text-slate-800">{{ item.title }}</p>
                    <p class="mt-1 text-xs leading-5 text-slate-600">{{ item.detail }}</p>
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
                class="mt-3 rounded-xl bg-slate-50 p-3"
              >
                <h3 class="mb-1 text-sm font-extrabold text-slate-800">{{ section.title }}</h3>
                <ul class="space-y-1 text-xs leading-5 text-slate-600">
                  <li v-for="(item, index) in section.items" :key="`${section.title}-${index}`">
                    {{ formatAiAdviceItem(item) }}
                  </li>
                </ul>
              </section>
            </template>

            <p
              v-for="warning in aiWarnings"
              :key="warning"
              class="mt-3 text-xs leading-5 text-amber-600"
            >
              <i class="fa-solid fa-triangle-exclamation mr-1" />{{ warning }}
            </p>

            <section
              v-if="aiSources.length"
              class="mt-3 border-t pt-3"
              style="border-color: var(--line)"
            >
              <p class="mb-1 text-xs font-extrabold text-slate-700">参考资料</p>
              <p
                v-for="source in aiSources"
                :key="`${source.source}-${source.chunkId}`"
                class="text-xs leading-5 text-slate-500"
              >
                {{ source.source }}
              </p>
            </section>
          </template>

          <button
            v-if="aiError && !aiIsGenerating"
            class="btn-secondary mt-3"
            type="button"
            @click="retryAiGeneration"
          >
            <i class="fa-solid fa-rotate-right mr-1" />重新获取拍摄方案
          </button>
        </div>

        <div
          v-if="aiResult && !aiIsGenerating"
          class="grid grid-cols-3 gap-2 border-t px-4 py-3"
          style="border-color: var(--line)"
        >
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

  <section v-else class="card p-4 text-sm text-slate-500">未找到排单信息，可能已被删除。</section>
</template>
