import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// GitHub Pages serves the site from /chinese-learning/
const base = process.env.BASE_PATH ?? '/chinese-learning/'

export default defineConfig({
  base,
  // shown in 我的 → 版本, so you can tell which version a phone is running
  define: { __BUILT__: JSON.stringify(new Date().toISOString()) },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: '中国通',
        short_name: '中国通',
        description: '用中文探索中国的地理、历史和诗词',
        lang: 'zh-CN',
        theme_color: '#ED5126',
        background_color: '#FFFFFF',
        display: 'standalone',
        start_url: base,
        scope: base,
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        runtimeCaching: [
          {
            // Small lists that change daily (new 刷一刷 cards, new episodes): fresh when online, cached offline
            urlPattern: ({ url }) => /\/content\/(index|feed|places|jieqi)\.json$/.test(url.pathname),
            handler: 'NetworkFirst',
            options: { cacheName: 'zh-index', networkTimeoutSeconds: 4 },
          },
          {
            // Photos: fetch each once and keep it (a different photo gets a new ?v=, so a new cache entry)
            urlPattern: ({ url }) => url.pathname.includes('/img/'),
            handler: 'CacheFirst',
            options: { cacheName: 'zh-photos', expiration: { maxEntries: 600 }, cacheableResponse: { statuses: [0, 200] } },
          },
          {
            // Stories, texts and the dictionary: use the cached copy, refresh in the background
            urlPattern: ({ url }) => url.pathname.includes('/content/') || url.pathname.includes('/data/'),
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'zh-content', expiration: { maxEntries: 400 } },
          },
        ],
      },
    }),
  ],
})
