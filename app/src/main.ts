import { createApp } from 'vue'
import 'vant/lib/index.css'
import '@/style.css'
import App from '@/App.vue'
import { createPinia } from 'pinia'
import { router } from '@/router'
import { setUnauthorizedHandler } from '@/api/core/auth'
import { useAuthStore } from '@/stores/auth'
import '@fortawesome/fontawesome-free/css/all.min.css'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

setUnauthorizedHandler(async () => {
  useAuthStore(pinia).logout()
  if (router.currentRoute.value.name !== 'login') {
    await router.replace({ name: 'login' })
  }
})

app.mount('#app')
