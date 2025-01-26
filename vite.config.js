import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import vitePluginVue from './packages/extensions/vite-plugin-vue'

const dirname = path.dirname(fileURLToPath(new URL(import.meta.url)))

export default defineConfig({
  resolve: {
    alias: {
      vue: path.resolve(dirname, './packages'),
    },
  },
  plugins: [vitePluginVue()],
})
