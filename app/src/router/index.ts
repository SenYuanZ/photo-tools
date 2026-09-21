import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const routes = [
  {
    path: '/',
    redirect: '/home',
  },
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/login/index.vue'),
    meta: { tab: 'login', hideNav: true },
  },
  {
    path: '/register',
    name: 'register',
    component: () => import('@/views/register/index.vue'),
    meta: { tab: 'login', hideNav: true },
  },
  {
    path: '/model-booking',
    name: 'model-booking',
    component: () => import('@/views/modelBooking/index.vue'),
    meta: { tab: 'login', hideNav: true },
  },
  {
    path: '/order-query',
    name: 'order-query',
    component: () => import('@/views/orderQuery/index.vue'),
    meta: { tab: 'login', hideNav: true },
  },
  {
    path: '/order/:bookingGroupId',
    name: 'public-order-detail',
    component: () => import('@/views/orderDetail/index.vue'),
    meta: { tab: 'login', hideNav: true },
  },
  {
    path: '/home',
    name: 'home',
    component: () => import('@/views/home/index.vue'),
    meta: { requiresAuth: true, tab: 'home' },
  },
  {
    path: '/calendar',
    name: 'calendar',
    component: () => import('@/views/calendar/index.vue'),
    meta: { requiresAuth: true, tab: 'calendar' },
  },
  {
    path: '/my',
    name: 'my',
    component: () => import('@/views/my/index.vue'),
    meta: { requiresAuth: true, tab: 'my' },
  },
  {
    path: '/ai-qa',
    name: 'ai-qa',
    component: () => import('@/views/aiQa/index.vue'),
    meta: { requiresAuth: true, tab: 'ai-qa' },
  },
  {
    path: '/customer/new',
    name: 'customer-new',
    component: () => import('@/views/addCustomer/index.vue'),
    meta: { requiresAuth: true, tab: 'my' },
  },
  {
    path: '/schedule/new',
    name: 'schedule-new',
    component: () => import('@/views/scheduleEntry/index.vue'),
    meta: { requiresAuth: true, tab: 'my' },
  },
  {
    path: '/schedule/:id',
    name: 'schedule-detail',
    component: () => import('@/views/scheduleDetail/index.vue'),
    meta: { requiresAuth: true, tab: 'home' },
  },
  {
    path: '/customers',
    name: 'customers',
    component: () => import('@/views/customerManagement/index.vue'),
    meta: { requiresAuth: true, tab: 'my' },
  },
  {
    path: '/history',
    name: 'history',
    component: () => import('@/views/history/index.vue'),
    meta: { requiresAuth: true, tab: 'my' },
  },
  {
    path: '/settings',
    name: 'settings',
    component: () => import('@/views/settings/index.vue'),
    meta: { requiresAuth: true, tab: 'my' },
  },
  {
    path: '/profile',
    name: 'profile',
    component: () => import('@/views/profile/index.vue'),
    meta: { requiresAuth: true, tab: 'my' },
  },
  {
    path: '/invite-codes',
    name: 'invite-codes',
    component: () => import('@/views/inviteCodeManagement/index.vue'),
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
    const authStore = useAuthStore()
    await authStore.restoreSession()
    if (to.meta.requiresAuth && !authStore.isLoggedIn) {
      return { name: 'login' }
    }

    if ((to.name === 'login' || to.name === 'register') && authStore.isLoggedIn) {
      return { name: 'home' }
    }

    return true
  }

  return guard()
})
