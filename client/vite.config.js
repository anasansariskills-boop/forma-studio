import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const apiTarget = process.env.API_URL ?? 'http://localhost:8787'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': { target: apiTarget, changeOrigin: true },
      '/uploads': { target: apiTarget, changeOrigin: true },
      // Keep the browser's own host in `host` so the generated absolute URLs
      // point at the dev site rather than the API port.
      '/sitemap.xml': { target: apiTarget, changeOrigin: false },
      '/robots.txt': { target: apiTarget, changeOrigin: false },
    },
  },
  preview: { port: 4173 },
  build: {
    target: 'es2022',
    assetsInlineLimit: 0,
    reportCompressedSize: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react-dom')) return 'react'
          if (id.includes('node_modules/react-router')) return 'router'
          if (id.includes('@fontsource')) return 'fonts'
          return undefined
        },
      },
    },
  },
})
