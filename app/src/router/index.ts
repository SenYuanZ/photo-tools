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
    meta: { tab: 'login', hideNav: true },
  },
  {
    path: '/register',
    name: 'register',
    component: () => import('../views/RegisterPage.vue'),
    meta: { tab: 'login', hideNav: true },
  },
  {
    path: '/model-booking',
    name: 'model-booking',
    component: () => import('../views/ModelBookingPage.vue'),
    meta: { tab: 'login', hideNav: true },
  },
  {
    path: '/order-query',
    name: 'order-query',
    component: () => import('../views/OrderQueryPage.vue'),
    meta: { tab: 'login', hideNav: true },
  },
  {
    path: '/order/:bookingGroupId',
    name: 'public-order-detail',
    component: () => import('../views/OrderDetailPage.vue'),
    meta: { tab: 'login', hideNav: true },
  },
  {
    path: '/home',
    name: 'home',
    component: () => import('../views/HomePage.vue'),
    meta: { requiresAuth: true, tab: 'home' },
  },
  {
    path: '/calendar',
    name: 'calendar',
    component: () => import('../views/CalendarPage.vue'),
    meta: { requiresAuth: true, tab: 'calendar' },
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
    path: '/profile',
    name: 'profile',
    component: () => import('../views/ProfilePage.vue'),
    meta: { requiresAuth: true, tab: 'my' },
  },
  {
    path: '/invite-codes',
    name: 'invite-codes',
    component: () => import('../views/InviteCodeManagementPage.vue'),
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
      return { name: 'login' }
    }

    if ((to.name === 'login' || to.name === 'register') && store.isLoggedIn) {
      return { name: 'home' }
    }

    return true
  }

  return guard()
})
