import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Dev ports across Babyeyi frontends: teacher 5173, main app 5174, manager 5175, DOS 5176, discipline 5177
// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: 5176, strictPort: true },
})
