/**
 * Hand-authored service worker (vite-plugin-pwa `injectManifest` strategy).
 *
 * Why this replaced the old `generateSW` config: Firebase Cloud Messaging needs a
 * service worker that calls `onBackgroundMessage(...)`, and only one worker can control
 * a given scope at a time — a second `register()` at the same scope silently replaces
 * whichever worker got there first. `injectManifest` lets one file own both jobs: Vite
 * injects the Workbox precache manifest (`self.__WB_MANIFEST`) into this file at build
 * time, and this is also where the (not-yet-added) Firebase background-message handler
 * will live. See docs/NOTIFICATIONS_PLAN.md §6.
 *
 * Behavior below is a direct, deliberate port of the previous `generateSW` config in
 * vite.config.ts — same precache globs, same runtime caching rules, same offline
 * fallback — nothing about existing offline behavior is meant to change.
 */
/// <reference lib="webworker" />
import { precacheAndRoute, cleanupOutdatedCaches, createHandlerBoundToURL } from 'workbox-precaching';
import { registerRoute, NavigationRoute } from 'workbox-routing';
import { CacheFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { clientsClaim } from 'workbox-core';

declare const self: ServiceWorkerGlobalScope;

self.skipWaiting();
clientsClaim();
cleanupOutdatedCaches();

// injected at build time from the globPatterns/globIgnores in vite.config.ts
precacheAndRoute(self.__WB_MANIFEST);

// SPA navigations fall back to the precached offline shell when the network is down —
// same as navigateFallback + navigateFallbackDenylist did under generateSW.
registerRoute(
  new NavigationRoute(createHandlerBoundToURL(`${import.meta.env.BASE_URL}offline.html`), {
    denylist: [/^\/api/],
  }),
);

registerRoute(
  ({ request }) => request.destination === 'font',
  new CacheFirst({
    cacheName: 'zesto-fonts',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 }),
    ],
  }),
);

registerRoute(
  ({ url }) => url.pathname.includes('/splash/'),
  new CacheFirst({
    cacheName: 'zesto-splash',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 20 }),
    ],
  }),
);
