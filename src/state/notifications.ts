import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { NotificationSupportState } from '../lib/notifications/permission';
import { DEFAULT_NOTIFICATION_PREFERENCES, type NotificationPreferences } from '../domain/types';

/**
 * Notification enablement + the anonymous device identity (§9 Q4 of
 * docs/NOTIFICATIONS_PLAN.md — no login in this app, so a generated device id is what
 * a future Vercel API call registers against). Also holds the meal/smart/quiet-hours
 * preferences (Phase 4) — persisted locally so the Profile panel has something correct
 * to show instantly, and reconciled against the Vercel API (the source of truth) once
 * it's reachable. Nothing here throws or blocks if the API isn't configured.
 */
interface NotificationsStore {
  /** generated once, persisted forever — the "userId" a backend would see */
  deviceId: string;
  enabled: boolean;
  fcmToken: string | null;
  lastPermission: NotificationSupportState | null;
  preferences: NotificationPreferences;
  enable: (token: string) => void;
  disable: () => void;
  setPermission: (state: NotificationSupportState) => void;
  /** replaces the whole preferences doc — used when the API's copy comes back */
  setPreferences: (p: NotificationPreferences) => void;
  /** shallow-merges at the top level; callers pass a full nested object (e.g. all of
   *  `meals`) when changing one flag inside it, never a deep partial — see
   *  `NotificationsSettings.tsx` for why. */
  updatePreferences: (patch: Partial<NotificationPreferences>) => void;
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
      preferences: DEFAULT_NOTIFICATION_PREFERENCES,
      enable: (token) => set({ enabled: true, fcmToken: token }),
      disable: () => set({ enabled: false, fcmToken: null }),
      setPermission: (state) => set({ lastPermission: state }),
      setPreferences: (p) => set({ preferences: p }),
      updatePreferences: (patch) => set((s) => ({ preferences: { ...s.preferences, ...patch } })),
    }),
    {
      name: 'zesto.notifications.v1',
      // deviceId must survive even a reset of everything else — persisted as-is
      partialize: (s) => ({ deviceId: s.deviceId, enabled: s.enabled, fcmToken: s.fcmToken, preferences: s.preferences }),
    },
  ),
);
