/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const backendUrl = process.env.BACKEND_URL ?? 'http://localhost:8080'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/auth': backendUrl,
      '/experiments': {
        target: backendUrl,
        changeOrigin: true,
        // Training (especially /experiments/compare, which trains all 6 architectures
        // sequentially) can take much longer than http-proxy's 2-minute default timeout.
        // Measured ~44 minutes end-to-end on CPU for a single compare-all-6 run, so this
        // needs real headroom above that, not just parity with it.
        proxyTimeout: 120 * 60 * 1000,
        timeout: 120 * 60 * 1000,
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
  },
})
