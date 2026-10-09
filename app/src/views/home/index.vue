<script setup lang="ts">
import dayjs from 'dayjs'
import { Button, DatePicker, Popup } from 'vant'
import HomeScheduleCard from '@/views/home/components/HomeScheduleCard.vue'
import NotificationBell from '@/components/NotificationBell.vue'
import { useHomePage } from '@/views/home/hooks/useHomePage'

const {
  customerStore,
  activeTab,
  showStoredDatePicker,
  restoreDateValues,
  restoreMinDate,
  storedFeedback,
  storedScheduleSorted,
  today,
  todaySchedules,
  tomorrowSchedules,
  futureSchedules,
  futureGroups,
  formatFutureDay,
  selectTab,
  activeMeta,
  activeSchedules,
  toDetail,
  isUrgent,
  isInProgress,
  currentCount,
  inProgressTodayCount,
  nextTodaySchedule,
  greetingText,
  openRestoreDatePicker,
  restoreStoredSchedule,
  toScheduleEntry,
  toCalendar,
  formatCnDate,
} = useHomePage()
</script>

<template>
  <section class="home-page bounce-in">
    <header class="card home-hero">
      <div class="home-hero__top">
        <div>
          <p class="home-eyebrow"><i class="fa-solid fa-camera" />工作台</p>
          <h1 class="title-font">我的排单</h1>
        </div>
        <div class="home-hero__actions">
          <NotificationBell />
          <button
            type="button"
            class="home-add-button"
            aria-label="新增排单"
            title="新增排单"
            @click="toScheduleEntry"
          >
            <i class="fa-solid fa-plus" />
          </button>
        </div>
      </div>

      <div class="home-date-row">
        <div class="home-date-copy">
          <strong>{{ formatCnDate(today) }}</strong>
          <span>{{ greetingText }}</span>
        </div>
        <button type="button" class="home-date-button" @click="toCalendar">
          <i class="fa-regular fa-calendar-days" />
          查看日历
        </button>
      </div>

      <div class="home-overview" aria-label="今日概览">
        <div class="home-overview__item">
          <span>今日排单</span>
          <strong>{{ todaySchedules.length }} 组</strong>
        </div>
        <div class="home-overview__item">
          <span>正在进行</span>
          <strong class="home-overview__live">{{ inProgressTodayCount }} 组</strong>
        </div>
        <div class="home-overview__item">
          <span>下一场</span>
          <strong>{{ nextTodaySchedule?.startTime ?? '暂无' }}</strong>
        </div>
      </div>
    </header>

    <nav class="home-tabs" aria-label="排单范围">
      <button
        type="button"
        :class="{ 'is-active': activeTab === 'today' }"
        :aria-pressed="activeTab === 'today'"
        @click="selectTab('today')"
      >
        <span>今日</span>
        <strong>{{ todaySchedules.length }}</strong>
      </button>
      <button
        type="button"
        :class="{ 'is-active': activeTab === 'tomorrow' }"
        :aria-pressed="activeTab === 'tomorrow'"
        @click="selectTab('tomorrow')"
      >
        <span>明日</span>
        <strong>{{ tomorrowSchedules.length }}</strong>
      </button>
      <button
        type="button"
        :class="{ 'is-active': activeTab === 'future' }"
        :aria-pressed="activeTab === 'future'"
        @click="selectTab('future')"
      >
        <span>未来</span>
        <strong>{{ futureSchedules.length }}</strong>
      </button>
      <button
        type="button"
        :class="{ 'is-active': activeTab === 'stored' }"
        :aria-pressed="activeTab === 'stored'"
        @click="selectTab('stored')"
      >
        <span>暂存</span>
        <strong>{{ storedScheduleSorted.length }}</strong>
      </button>
    </nav>

    <p v-if="storedFeedback" class="home-feedback" role="status">
      <i class="fa-solid fa-circle-check" aria-hidden="true" />
      <span>{{ storedFeedback }}</span>
    </p>

    <section class="home-schedules" aria-live="polite">
      <header class="home-section-heading">
        <h2><i class="home-section-icon" :class="activeMeta.icon" />{{ activeMeta.title }}</h2>
        <span>共 {{ currentCount }} 组</span>
      </header>

      <div v-if="activeTab === 'future' && futureGroups.length" class="home-future-list">
        <section v-for="group in futureGroups" :key="group.date" class="home-future-group">
          <header class="home-future-group__heading">
            <strong
              ><i class="fa-regular fa-calendar-days" />{{ formatFutureDay(group.date) }}</strong
            >
            <span>{{ group.items.length }} 组</span>
          </header>
          <div class="home-schedule-list">
            <HomeScheduleCard
              v-for="item in group.items"
              :key="item.id"
              :schedule="item"
              :customer="customerStore.getCustomerById(item.customerId)"
              @click="toDetail(item.id)"
            />
          </div>
        </section>
      </div>

      <div v-else-if="activeTab === 'stored' && activeSchedules.length" class="home-stored-list">
        <article v-for="item in activeSchedules" :key="item.id" class="home-stored-card">
          <div class="home-stored-card__heading">
            <div>
              <p>{{ customerStore.getCustomerById(item.customerId)?.name || '未知客户' }}</p>
              <span>原档期 {{ dayjs(item.date).format('MM/DD') }} {{ item.startTime }}</span>
            </div>
            <i class="fa-solid fa-box-archive" />
          </div>
          <p class="home-stored-card__location">
            <i class="fa-solid fa-location-dot" />{{ item.location }}
          </p>
          <div class="home-stored-card__actions">
            <Button size="small" plain type="primary" @click="openRestoreDatePicker(item.id)">
              <i class="fa-solid fa-calendar-check mr-1" />恢复并选日期
            </Button>
            <Button size="small" plain type="default" @click="toDetail(item.id)">
              <i class="fa-solid fa-circle-info mr-1" />查看详情
            </Button>
          </div>
        </article>
      </div>

      <div v-else-if="activeSchedules.length" class="home-schedule-list">
        <HomeScheduleCard
          v-for="item in activeSchedules"
          :key="item.id"
          :schedule="item"
          :customer="customerStore.getCustomerById(item.customerId)"
          :in-progress="
            activeTab === 'today' && isInProgress(item.date, item.startTime, item.endTime)
          "
          :urgent="activeTab === 'today' && isUrgent(item.date, item.startTime)"
          @click="toDetail(item.id)"
        />
      </div>

      <div v-else class="home-empty">
        <i class="fa-regular fa-calendar-check" />
        <strong>{{ activeMeta.empty }}</strong>
        <span>新增排单后会出现在这里</span>
        <button type="button" @click="toScheduleEntry">
          <i class="fa-solid fa-plus" />新增排单
        </button>
      </div>
    </section>

    <Popup v-model:show="showStoredDatePicker" position="bottom" round>
      <DatePicker
        v-model="restoreDateValues"
        title="恢复排单日期"
        :min-date="restoreMinDate"
        @cancel="showStoredDatePicker = false"
        @confirm="({ selectedValues }: any) => restoreStoredSchedule(selectedValues)"
      />
    </Popup>
  </section>
</template>

<style scoped>
.home-hero__actions {
  display: flex;
  align-items: center;
  gap: 10px;
}
.home-page {
  display: grid;
  gap: 12px;
}

.home-hero {
  overflow: hidden;
  padding: 18px 16px 14px;
}

.home-hero__top,
.home-date-row,
.home-section-heading,
.home-future-group__heading,
.home-stored-card__heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.home-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
  color: var(--theme-accent-strong);
  font-size: 12px;
  font-weight: 800;
}

.home-hero h1 {
  color: var(--ink);
  font-size: 26px;
  line-height: 1.2;
}

.home-add-button {
  display: grid;
  width: 42px;
  height: 42px;
  flex: 0 0 42px;
  place-items: center;
  border: 0;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--theme-accent), var(--theme-accent-strong));
  color: var(--theme-on-accent);
  box-shadow: 0 8px 16px var(--theme-shadow);
  transition: transform 160ms ease;
}

.home-add-button:active {
  transform: scale(0.94);
}

.home-date-row {
  margin-top: 14px;
}

.home-date-copy {
  min-width: 0;
}

.home-date-copy strong,
.home-date-copy span {
  display: block;
}

.home-date-copy strong {
  font-size: 14px;
  font-weight: 800;
}

.home-date-copy span {
  margin-top: 2px;
  overflow: hidden;
  color: var(--theme-muted);
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.home-date-button {
  display: inline-flex;
  min-height: 40px;
  flex: 0 0 auto;
  align-items: center;
  gap: 6px;
  border: 1px solid var(--theme-accent-soft);
  border-radius: 12px;
  padding: 0 11px;
  background: var(--theme-accent-bg);
  color: var(--theme-accent-strong);
  font-size: 12px;
  font-weight: 800;
}

.home-overview {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  margin-top: 14px;
  border-top: 1px solid var(--line);
  padding-top: 12px;
}

.home-overview__item {
  min-width: 0;
  padding: 0 10px;
  border-right: 1px solid var(--line);
}

.home-overview__item:first-child {
  padding-left: 0;
}

.home-overview__item:last-child {
  border-right: 0;
  padding-right: 0;
}

.home-overview__item span,
.home-overview__item strong {
  display: block;
}

.home-overview__item span {
  color: var(--theme-muted-soft);
  font-size: 11px;
  font-weight: 700;
}

.home-overview__item strong {
  margin-top: 3px;
  overflow: hidden;
  font-size: 16px;
  font-weight: 800;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.home-overview__live {
  color: var(--theme-status);
}

.home-tabs {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 3px;
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 4px;
  background: var(--theme-surface);
  box-shadow: 0 8px 18px var(--theme-shadow);
}

.home-tabs button {
  min-width: 0;
  min-height: 44px;
  border: 0;
  border-radius: 10px;
  padding: 5px 2px;
  background: transparent;
  color: var(--theme-muted-soft);
  font-size: 12px;
  font-weight: 800;
  transition:
    color 180ms ease,
    background-color 180ms ease;
}

.home-tabs button span,
.home-tabs button strong {
  display: block;
}

.home-tabs button strong {
  margin-top: 1px;
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}

.home-tabs button.is-active {
  background: var(--theme-accent-bg);
  color: var(--theme-accent-strong);
}

.home-schedules {
  min-width: 0;
}

.home-section-heading {
  min-height: 42px;
  padding: 7px 2px;
}

.home-section-heading h2 {
  font-size: 15px;
  font-weight: 800;
}

.home-section-heading > span {
  color: var(--theme-muted-soft);
  font-size: 12px;
  font-weight: 700;
}

.home-section-icon {
  margin-right: 6px;
  color: var(--theme-accent-strong);
}

.home-schedule-list,
.home-stored-list,
.home-future-list {
  display: grid;
  gap: 9px;
}

.home-future-list {
  gap: 14px;
}

.home-future-group__heading {
  margin-bottom: 8px;
  padding: 0 2px;
}

.home-future-group__heading strong {
  color: var(--theme-accent-strong);
  font-size: 13px;
  font-weight: 800;
}

.home-future-group__heading strong i {
  margin-right: 6px;
}

.home-future-group__heading span {
  color: var(--theme-muted-soft);
  font-size: 11px;
  font-weight: 700;
}

.home-stored-card {
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 13px;
  background: var(--theme-surface);
  box-shadow: 0 8px 18px var(--theme-shadow);
}

.home-stored-card__heading p {
  font-size: 15px;
  font-weight: 800;
}

.home-stored-card__heading span {
  display: block;
  margin-top: 3px;
  color: var(--theme-muted-soft);
  font-size: 11px;
  font-weight: 700;
}

.home-stored-card__heading > i {
  color: var(--theme-accent);
  font-size: 18px;
}

.home-stored-card__location {
  margin-top: 10px;
  color: var(--theme-muted);
  font-size: 12px;
  font-weight: 600;
}

.home-stored-card__location i {
  margin-right: 6px;
  color: var(--blue-500);
}

.home-stored-card__actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  margin-top: 12px;
}

.home-empty {
  display: flex;
  min-height: 240px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 1px dashed var(--theme-accent-soft);
  border-radius: 14px;
  padding: 24px;
  background: color-mix(in srgb, var(--theme-accent-bg) 58%, var(--theme-surface));
  text-align: center;
}

.home-empty > i {
  color: var(--theme-accent);
  font-size: 26px;
}

.home-empty strong {
  margin-top: 10px;
  font-size: 14px;
  font-weight: 800;
}

.home-empty span {
  margin-top: 4px;
  color: var(--theme-muted-soft);
  font-size: 12px;
}

.home-empty button {
  display: inline-flex;
  min-height: 40px;
  align-items: center;
  gap: 6px;
  margin-top: 14px;
  border: 1px solid var(--theme-accent-soft);
  border-radius: 12px;
  padding: 0 14px;
  background: var(--theme-surface);
  color: var(--theme-accent-strong);
  font-size: 12px;
  font-weight: 800;
}

.home-feedback {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  border: 1px solid var(--theme-accent-soft);
  border-radius: 12px;
  padding: 10px 12px;
  background: var(--theme-accent-bg);
  color: var(--theme-accent-strong);
  font-size: 12px;
  font-weight: 700;
}

@media (max-width: 359px) {
  .home-hero {
    padding-inline: 13px;
  }

  .home-date-button {
    width: 40px;
    justify-content: center;
    padding: 0;
    font-size: 0;
  }

  .home-date-button i {
    font-size: 14px;
  }

  .home-overview__item {
    padding-inline: 7px;
  }

  .home-stored-card__actions {
    grid-template-columns: 1fr;
  }
}
</style>
