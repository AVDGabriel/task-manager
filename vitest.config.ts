import { existsSync } from 'fs'
import { resolve } from 'path'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

const localBusDist = resolve(__dirname, '../mfe-bus/dist/mfe-bus.js')
const fallbackBusSrc = resolve(__dirname, './src/vendor/mfe-bus/index.ts')

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'mfe-bus': existsSync(localBusDist) ? localBusDist : fallbackBusSrc,
      '@avdgabriel/mfe-bus': existsSync(localBusDist)
        ? localBusDist
        : fallbackBusSrc,
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
  },
})
