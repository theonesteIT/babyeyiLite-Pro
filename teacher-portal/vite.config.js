import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Dev ports: teacher 5173, main 5174, manager 5175, DOS 5176, discipline 5177
// https://vite.dev/config/
// When `VITE_API_URL` is empty in dev, `src/services/api.js` uses `/api` here → Babyeyi backend (MTN .env).
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const proxyTarget = env.VITE_PROXY_TARGET || 'http://localhost:5100'
  return {
    plugins: [react(), tailwindcss()],
    legacy: {
      // Recharts 3 pulls es-toolkit/compat CJS shims — needed on Vite 8 / Rolldown interop
      inconsistentCjsInterop: true,
    },
    optimizeDeps: {
      include: ['recharts', 'es-toolkit', 'es-toolkit/compat'],
    },
    server: {
      port: 5173,
      strictPort: true,
      proxy: {
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
        },
      },
    },
  }
})
