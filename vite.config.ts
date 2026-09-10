import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'favicon.ico', 'favicon-96.png', 'offline.html', 'icons/*.png'],
      workbox: {
        // precache the shell + catalog + icons; NOT the ~7 MB of iOS splash screens
        // (only one is ever used per device, and iOS fetches it at launch anyway)
        globPatterns: ['**/*.{js,css,html,woff2,json}', 'icons/*.png'],
        globIgnores: ['**/splash/**'],
        navigateFallback: '/offline.html',
        navigateFallbackDenylist: [/^\/api/],
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.destination === 'font',
            handler: 'CacheFirst',
            options: { cacheName: 'zesto-fonts', expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 } },
          },
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/splash/'),
            handler: 'CacheFirst',
            options: { cacheName: 'zesto-splash', expiration: { maxEntries: 20 } },
          },
        ],
      },
      manifest: {
        name: 'Zesto',
        short_name: 'Zesto',
        description: 'Tell Zesto your situation. Zesto tells you what you can eat.',
        theme_color: '#0A0A12',
        background_color: '#0A0A12',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        id: '/',
        scope: '/',
        categories: ['food', 'lifestyle', 'utilities'],
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  build: {
    target: 'es2020',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('react') || id.includes('/scheduler/')) return 'vendor';
          // the recipe seed is the CONTENT FOUNDATION — its own cache-stable chunk so the
          // app shell stays tiny and the data layer can grow independently (see ARCHITECTURE.md)
          if (id.includes('src/data/recipes.json') || id.includes('src/data/ingredients.json')) {
            return 'catalog';
          }
          return undefined;
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
  },
});
