import { existsSync } from 'fs'
import { resolve } from 'path'
import { defineConfig } from '@rsbuild/core'
import { pluginReact } from '@rsbuild/plugin-react'
import { pluginModuleFederation } from '@module-federation/rsbuild-plugin'

const useLocalPackages = process.env.USE_LOCAL_PACKAGES === 'true'
const localBusSrc = resolve(__dirname, '../mfe-bus/src/index.ts')
const localBusDist = resolve(__dirname, '../mfe-bus/dist/mfe-bus.js')
const fallbackBusSrc = resolve(__dirname, './src/vendor/mfe-bus/index.ts')

const resolvedBusAlias =
  useLocalPackages && existsSync(localBusSrc)
    ? localBusSrc
    : existsSync(localBusDist)
      ? localBusDist
      : fallbackBusSrc

export default defineConfig({
  output: {
    assetPrefix: 'auto',
  },
  resolve: {
    alias: {
      'mfe-bus': resolvedBusAlias,
      '@avdgabriel/mfe-bus': resolvedBusAlias,
    },
  },
  server: {
    port: 3002,
    cors: true,
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
  },
  plugins: [
    pluginReact(),
    pluginModuleFederation({
      name: 'taskManagerRemote',
      filename: 'remoteEntry.js',
      exposes: {
        './TaskManager': './src/TaskManager.tsx',
      },
      shared: {
        react: {
          singleton: true,
          requiredVersion: false,
        },
        'react-dom': {
          singleton: true,
          requiredVersion: false,
        },
      },
    }),
  ],
})
