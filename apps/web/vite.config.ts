import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['icons/app.svg'],
      manifest: {
        name: 'Valhalla Space — Carta',
        short_name: 'Valhalla',
        description: 'Prototipo visual de la carta y fidelización de Valhalla Space.',
        lang: 'es-AR',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#090d12',
        theme_color: '#090d12',
        icons: [{ src: '/icons/app.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,woff2,webp}'],
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/api\//, /^\/auth\//],
        runtimeCaching: [],
        cleanupOutdatedCaches: true,
      },
      devOptions: { enabled: false },
    }),
  ],
})
