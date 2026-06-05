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
        react: path.resolve(__dirname, 'node_modules/react'),
        'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
        'react-router-dom': path.resolve(__dirname, 'node_modules/react-router-dom'),
      },
      dedupe: ['react', 'react-dom', 'react-router-dom'],
    },
    // Vite's default assetsDir is "assets", which collides with the /pro/assets portal route on nginx.
    optimizeDeps: {
      include: ['react-qr-code'],
    },
    build: {
      assetsDir: 'bundles',
      commonjsOptions: {
        include: [/react-qr-code/, /node_modules/],
      },
    },
    server: { port, strictPort: true },
  }
})
