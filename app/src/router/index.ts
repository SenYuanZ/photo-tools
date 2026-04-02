import { createRouter, createWebHistory } from 'vue-router'
import { useAppStore } from '../stores/app'

const routes = [
  {
    path: '/',
    redirect: '/home',
  },
  {
    path: '/login',
    name: 'login',
    component: () => import('../views/LoginPage.vue'),
    meta: { tab: 'login' },
  },
  {
    path: '/model-booking',
    name: 'model-booking',
    component: () => import('../views/ModelBookingPage.vue'),
    meta: { tab: 'login', hideNav: true },
  },
  {
    path: '/home',
    name: 'home',
    component: () => import('../views/HomePage.vue'),
    meta: { requiresAuth: true, tab: 'home' },
  },
  {
    path: '/my',
    name: 'my',
    component: () => import('../views/MyPage.vue'),
    meta: { requiresAuth: true, tab: 'my' },
  },
  {
    path: '/customer/new',
    name: 'customer-new',
    component: () => import('../views/AddCustomerPage.vue'),
    meta: { requiresAuth: true, tab: 'my' },
  },
  {
    path: '/schedule/new',
    name: 'schedule-new',
    component: () => import('../views/ScheduleEntryPage.vue'),
    meta: { requiresAuth: true, tab: 'my' },
  },
  {
    path: '/schedule/:id',
    name: 'schedule-detail',
    component: () => import('../views/DetailPage.vue'),
    meta: { requiresAuth: true, tab: 'home' },
  },
  {
    path: '/customers',
    name: 'customers',
    component: () => import('../views/CustomerManagementPage.vue'),
    meta: { requiresAuth: true, tab: 'my' },
  },
  {
    path: '/history',
    name: 'history',
    component: () => import('../views/HistoryPage.vue'),
    meta: { requiresAuth: true, tab: 'my' },
  },
  {
    path: '/settings',
    name: 'settings',
    component: () => import('../views/SettingsPage.vue'),
    meta: { requiresAuth: true, tab: 'my' },
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/home',
  },
]

export const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to) => {
  const guard = async () => {
    const store = useAppStore()
    await store.restoreSession()
    if (to.meta.requiresAuth && !store.isLoggedIn) {
      return {
        name: 'login',
        query: { redirect: to.fullPath },
      }
    }

    if (to.name === 'login' && store.isLoggedIn) {
      return { name: 'home' }
    }

    return true
  }

  return guard()
})
