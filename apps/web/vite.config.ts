import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { platformBrand } from './src/config/platform'
import { commercialHtml } from './marketing-build'
import { resolve } from 'node:path'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    commercialHtml(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['icons/app.svg'],
      manifest: {
        name: `${platformBrand.name} — Cartas digitales`,
        short_name: platformBrand.name,
        description: 'Cartas digitales independientes para cada comercio.',
        lang: 'es-AR',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#090d12',
        theme_color: '#090d12',
        icons: [
          {
            src: '/icons/app.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,woff2,webp,png,jpg}'],
        navigateFallback: 'app.html',
        // /auth/* are SPA pages, not Auth API responses. API/private responses
        // are never runtime-cached; only the static application shell is cached.
        navigateFallbackDenylist: [
          /^\/api\//,
          /^\/$/,
          /^\/planes(?:\/|$)/,
          /^\/(?:contacto|privacidad)\/?$/,
        ],
        runtimeCaching: [],
        cleanupOutdatedCaches: true,
      },
      devOptions: { enabled: false },
    }),
  ],
  build: {
    rollupOptions: {
      input: {
        index: resolve(process.cwd(), 'index.html'),
        app: resolve(process.cwd(), 'app.html'),
      },
    },
  },
})
