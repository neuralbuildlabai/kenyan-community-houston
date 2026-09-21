import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'node:fs'
import { fileURLToPath, URL } from 'node:url'

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string }

export default defineConfig({
  define: {
    __KIGH_APP_VERSION__: JSON.stringify(pkg.version ?? '0.0.0'),
  },
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Split the dependencies that change on a different cadence to our own
        // code, so a routine deploy does not force every visitor to re-download
        // React and Supabase along with it. This does not shrink the first
        // visit — it makes every visit after a deploy cheaper.
        manualChunks(id: string) {
          if (!id.includes('node_modules')) return
          if (/[\\/]node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/.test(id)) {
            return 'react-vendor'
          }
          if (id.includes('@supabase')) return 'supabase-vendor'
          if (/[\\/]node_modules[\\/](react-hook-form|@hookform|zod)[\\/]/.test(id)) {
            return 'forms-vendor'
          }
        },
      },
    },
  },
})
