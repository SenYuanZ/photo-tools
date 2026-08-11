import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

const devApiTarget = process.env.VITE_DEV_API_PROXY_TARGET || 'http://127.0.0.1:3000'
const devAiTarget = process.env.VITE_DEV_AI_PROXY_TARGET || 'http://localhost:3001'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    open: true,
    proxy: {
      '/api': {
        target: devApiTarget,
        changeOrigin: true,
        secure: false,
      },
      '/uploads': {
        target: devApiTarget,
        changeOrigin: true,
        secure: false,
      },
      '/aiapi': {
        target: devAiTarget,
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/aiapi/, ''),
      },
    },
  },
})
