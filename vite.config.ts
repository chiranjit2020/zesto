import { defineConfig, type Plugin } from 'vite';
import { copyFileSync } from 'node:fs';
import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Served under a subpath on GitHub Pages: https://chiranjitkarmakar.com/zesto/
const BASE = '/zesto/';

/** GitHub Pages has no SPA rewrite — a copy of index.html at 404.html makes deep links work. */
function spa404(): Plugin {
  return {
    name: 'spa-404',
    apply: 'build',
    closeBundle() {
      const dist = resolve(__dirname, 'dist');
      copyFileSync(resolve(dist, 'index.html'), resolve(dist, '404.html'));
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  base: BASE,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'favicon.svg', 'favicon.ico', 'favicon-96.png', 'offline.html',
        'icons/*.png', 'zesto-mark.png',
      ],
      workbox: {
        // precache the shell + catalog + icons + logo; NOT the ~7 MB of iOS splash
        // screens (only one is ever used per device, and iOS fetches it at launch)
        globPatterns: ['**/*.{js,css,html,woff2,json}', 'icons/*.png', 'zesto-mark.png'],
        globIgnores: ['**/splash/**'],
        navigateFallback: `${BASE}offline.html`,
        navigateFallbackDenylist: [/^\/api/],
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.destination === 'font',
            handler: 'CacheFirst',
            options: { cacheName: 'zesto-fonts', expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 } },
          },
          {
            urlPattern: ({ url }) => url.pathname.includes('/splash/'),
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
        start_url: BASE,
        id: BASE,
        scope: BASE,
        categories: ['food', 'lifestyle', 'utilities'],
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      devOptions: { enabled: false },
    }),
    spa404(),
  ],
  build: {
    target: 'es2020',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (/node_modules\/(react|react-dom|react-router|react-router-dom|scheduler)\//.test(id)) {
            return 'vendor';
          }
          if (id.includes('node_modules/framer-motion/') || id.includes('node_modules/motion-')) {
            return 'motion';
          }
          if (id.includes('node_modules/lucide-react/')) return 'icons';
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
