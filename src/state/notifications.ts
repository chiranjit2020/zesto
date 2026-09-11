import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { NotificationSupportState } from '../lib/notifications/permission';

/**
 * Notification enablement + the anonymous device identity (§9 Q4 of
 * docs/NOTIFICATIONS_PLAN.md — no login in this app, so a generated device id is what
 * a future Vercel API call registers against). Phase 2 only: this store records local
 * enablement and holds the FCM token for Phase 3 to actually POST to the API once it
 * exists — nothing is sent anywhere yet.
 */
interface NotificationsStore {
  /** generated once, persisted forever — the "userId" a backend would see */
  deviceId: string;
  enabled: boolean;
  fcmToken: string | null;
  lastPermission: NotificationSupportState | null;
  enable: (token: string) => void;
  disable: () => void;
  setPermission: (state: NotificationSupportState) => void;
}

function makeDeviceId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    // extremely old browser without crypto.randomUUID — good enough as a local fallback
    return `dev-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}

export const useNotifications = create<NotificationsStore>()(
  persist(
    (set) => ({
      deviceId: makeDeviceId(),
      enabled: false,
      fcmToken: null,
      lastPermission: null,
      enable: (token) => set({ enabled: true, fcmToken: token }),
      disable: () => set({ enabled: false, fcmToken: null }),
      setPermission: (state) => set({ lastPermission: state }),
    }),
    {
      name: 'zesto.notifications.v1',
      // deviceId must survive even a reset of everything else — persisted as-is
      partialize: (s) => ({ deviceId: s.deviceId, enabled: s.enabled, fcmToken: s.fcmToken }),
    },
  ),
);
