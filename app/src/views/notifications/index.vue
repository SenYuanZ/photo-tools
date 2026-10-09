<script setup lang="ts">
import { useRouter } from 'vue-router'
import { Button, Empty, Loading } from 'vant'
import PageHeader from '@/components/PageHeader.vue'
import NotificationFilters from './components/NotificationFilters.vue'
import NotificationListItem from './components/NotificationListItem.vue'
import { useNotificationsPage } from './hooks/useNotificationsPage'

const router = useRouter()
const { store, filter, items, loading, working, error, hasMore, load, open, readAll } =
  useNotificationsPage()
</script>

<template>
  <section class="notifications-page bounce-in">
    <PageHeader title="站内通知" back @back="router.push({ name: 'home' })" />
    <NotificationFilters
      :filter="filter"
      :unread-count="store.unreadCount"
      :busy="working"
      @select="filter = $event"
      @read-all="readAll"
    />
    <div v-if="error" class="notifications-error" role="alert">
      <p>{{ error }}</p>
      <Button size="small" plain round @click="load()">重新加载</Button>
    </div>
    <div class="notifications-list">
      <NotificationListItem
        v-for="item in items"
        :key="item.id"
        :item="item"
        :busy="working"
        @open="open"
      />
    </div>
    <Loading v-if="loading" class="notifications-loading" size="22">加载中</Loading>
    <Empty
      v-else-if="!items.length && !error"
      :description="filter === 'unread' ? '暂无未读通知' : '暂无通知，到点提醒会出现在这里'"
    />
    <Button
      v-if="hasMore && !loading"
      class="notifications-more"
      block
      round
      plain
      @click="load(true)"
      >加载更多</Button
    >
  </section>
</template>

<style scoped>
.notifications-list {
  display: grid;
  gap: 10px;
}
.notifications-loading {
  padding: 30px;
  text-align: center;
}
.notifications-error {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
  padding: 12px;
  border-radius: 14px;
  background: var(--theme-status-soft);
  color: var(--theme-status);
  font-size: 12px;
}
.notifications-more {
  margin-top: 16px;
  min-height: 44px;
}
</style>
