import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const n = (v) => {
    const x = Number(v)
    return Number.isFinite(x) && x > 0 ? x : null
  }
  const port = n(env.VITE_DEV_PORT) ?? n(process.env.PORT) ?? 5174
  const base = env.VITE_APP_BASE || (mode === 'production' ? '/pro/' : '/')

  return {
    base,
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
    server: { port, strictPort: true },
  }
})
