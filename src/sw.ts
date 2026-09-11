/**
 * Hand-authored service worker (vite-plugin-pwa `injectManifest` strategy).
 *
 * Why this replaced the old `generateSW` config: Firebase Cloud Messaging needs a
 * service worker that calls `onBackgroundMessage(...)`, and only one worker can control
 * a given scope at a time — a second `register()` at the same scope silently replaces
 * whichever worker got there first. `injectManifest` lets one file own both jobs: Vite
 * injects the Workbox precache manifest (`self.__WB_MANIFEST`) into this file at build
 * time, and the Firebase background-message handler lives here too, below. See
 * docs/NOTIFICATIONS_PLAN.md §6.
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
import { initializeApp } from 'firebase/app';
import { getMessaging, isSupported, onBackgroundMessage, type MessagePayload } from 'firebase/messaging/sw';

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

// ---- Firebase Cloud Messaging (§6/§18) ----
// Guarded exactly like the client (src/lib/notifications/firebase.ts): an unconfigured
// build (no VITE_FIREBASE_* at build time) or unsupported browser just skips this
// entirely — offline caching above is completely unaffected either way (spec §29).
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

if (Object.values(firebaseConfig).every(Boolean)) {
  isSupported()
    .then((supported) => {
      if (!supported) return;
      const app = initializeApp(firebaseConfig);
      const messaging = getMessaging(app);

      // The backend (Phase 3+) sends data-only messages, never a `notification` field —
      // a `notification` payload makes the browser auto-display a generic system
      // notification and skips this handler entirely, which would lose the deep-link
      // target and per-category icon. Data-only means every notification, foreground or
      // background, renders through this one code path.
      onBackgroundMessage(messaging, (payload: MessagePayload) => {
        const data = payload.data ?? {};
        const title = data.title ?? 'Zesto';
        self.registration.showNotification(title, {
          body: data.body,
          icon: `${import.meta.env.BASE_URL}icons/icon-192.png`,
          badge: `${import.meta.env.BASE_URL}icons/icon-192.png`,
          tag: data.type ?? 'zesto-notification',
          data: { url: data.url ?? import.meta.env.BASE_URL },
        });
      });
    })
    .catch(() => {
      /* messaging unavailable in this browser — offline/caching above still works */
    });
}

// Deep-link on click (spec §17) — works whether Zesto is already open in a tab or not.
self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close();
  const url = (event.notification.data?.url as string | undefined) ?? import.meta.env.BASE_URL;
  event.waitUntil(
    (async () => {
      const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const existing = clients.find((c) => new URL(c.url).origin === self.location.origin);
      if (existing) {
        existing.focus();
        if ('navigate' in existing) await (existing as WindowClient).navigate(url);
      } else {
        await self.clients.openWindow(url);
      }
    })(),
  );
});
