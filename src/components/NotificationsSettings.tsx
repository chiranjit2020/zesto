import { useEffect, useState } from 'react';
import { SectionHeader } from './ui/primitives';
import { Segmented } from './ui/Segmented';
import { Button } from './ui/Button';
import { Icon } from './ui/Icon';
import { useNotifications } from '../state/notifications';
import type { NotificationPreferences } from '../domain/types';
import {
  disableNotifications,
  enableNotifications,
  getNotificationSupportState,
  type NotificationSupportState,
} from '../lib/notifications/permission';
import { fetchPreferences, registerDevice, savePreferences, sendTestNotification } from '../lib/notifications/api';

const MEAL_LABELS: [keyof NotificationPreferences['meals'], string][] = [
  ['breakfast', 'Breakfast'],
  ['brunch', 'Brunch'],
  ['lunch', 'Lunch'],
  ['dinner', 'Dinner'],
  ['supper', 'Supper'],
];

const SMART_LABELS: [keyof NotificationPreferences['smart'], string][] = [
  ['pantry', 'Pantry opportunities'],
  ['leftovers', 'Leftover rescue'],
  ['budget', 'Budget ideas'],
  ['weeklySummary', 'Weekly summary'],
];

const MAX_PER_DAY_OPTIONS = [1, 2, 3].map((n) => ({ value: n, label: String(n) }));

/** Dynamically imported per call, same bundle-splitting rationale as the foreground
 *  message listener — the Analytics SDK never touches the initial bundle. */
function track(name: string, params?: Record<string, unknown>) {
  void import('../lib/notifications/analytics').then((m) => m.track(name, params));
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <label className="flex items-center justify-between gap-3 text-sm py-1.5">
      <span>{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="accent-[rgb(var(--z-brand))] w-4 h-4 shrink-0"
      />
    </label>
  );
}

/**
 * The contextual notifications prompt (spec §5) — lives in Profile ("You"), never pops
 * up on load. Handles every state the spec calls out explicitly: unsupported, default,
 * granted, denied, and permission-revoked-after-the-fact, without ever calling
 * `Notification.requestPermission()` except from the button below.
 */
export function NotificationsSettings() {
  const store = useNotifications();
  const [support, setSupport] = useState<NotificationSupportState | 'checking'>('checking');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testStatus, setTestStatus] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getNotificationSupportState().then((s) => {
      if (cancelled) return;
      setSupport(s);
      store.setPermission(s);
      // permission can be revoked from the browser's own site settings at any time —
      // reconcile our local "enabled" flag rather than trust a stale value (spec §29)
      if (s !== 'granted' && store.enabled) store.disable();
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Once notifications are actually on, reconcile the locally-shown preferences (instant,
  // possibly stale/default) against the API's copy (the source of truth) — a no-op object
  // if the API isn't configured yet, so this never blocks or errors visibly (spec §29).
  useEffect(() => {
    if (!(store.enabled && support === 'granted')) return;
    let cancelled = false;
    fetchPreferences(store.deviceId).then((remote) => {
      if (!cancelled && remote) store.setPreferences(remote);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.enabled, support]);

  // Mongo's $set replaces a nested field's value wholesale (api/notifications/preferences.ts),
  // so every save below sends the *complete* nested object it belongs to (all five meals,
  // all four smart flags, or the whole quietHours shape) — never just the one flag that
  // changed, or the sibling flags would be silently wiped server-side.
  const toggleMeal = (key: keyof NotificationPreferences['meals']) => {
    const meals = { ...store.preferences.meals, [key]: !store.preferences.meals[key] };
    store.updatePreferences({ meals });
    void savePreferences(store.deviceId, { meals });
  };

  const toggleSmart = (key: keyof NotificationPreferences['smart']) => {
    const smart = { ...store.preferences.smart, [key]: !store.preferences.smart[key] };
    store.updatePreferences({ smart });
    void savePreferences(store.deviceId, { smart });
  };

  const setMaxPerDay = (maxPerDay: number) => {
    store.updatePreferences({ maxPerDay });
    void savePreferences(store.deviceId, { maxPerDay });
  };

  const setQuietHours = (patch: Partial<NotificationPreferences['quietHours']>) => {
    const quietHours = { ...store.preferences.quietHours, ...patch };
    store.updatePreferences({ quietHours });
    void savePreferences(store.deviceId, { quietHours });
  };

  const handleEnable = async () => {
    setBusy(true);
    setError(null);
    track('notification_permission_requested');
    const result = await enableNotifications();
    setBusy(false);
    if (result.ok && result.token) {
      store.enable(result.token);
      setSupport('granted');
      track('notification_permission_granted');
      track('notification_enabled');
      // Harmless to leave in: an FCM token is only useful together with this
      // project's own server key, and isn't sensitive the way an auth credential is.
      console.info('[Zesto] FCM token:', result.token);
      // Fire-and-forget: registerDevice no-ops until VITE_API_BASE_URL exists (Phase 3
      // deploy), and even once it does, a failed registration here must never read as
      // "notifications are broken" — the token is already valid and stored locally.
      void registerDevice(store.deviceId, result.token);
      return;
    }
    if (result.reason === 'permission-denied') track('notification_permission_denied');
    setSupport(await getNotificationSupportState());
    setError(
      result.reason === 'permission-denied'
        ? "Blocked. You'll need to allow notifications from your browser's site settings to turn this on."
        : result.reason === 'unsupported'
          ? "This browser doesn't support push notifications."
          : "Couldn't turn that on — try again in a moment.",
    );
  };

  // Dev-only (see the button below and src/lib/notifications/api.ts's comment on
  // sendTestNotification): asks for the admin token interactively, never stores it.
  const handleTest = async () => {
    const token = window.prompt('NOTIFICATIONS_TEST_ADMIN_TOKEN (not stored anywhere):');
    if (!token) return;
    setTestStatus('Sending…');
    const result = await sendTestNotification(store.deviceId, token);
    setTestStatus(result.ok ? 'Sent — check for the notification.' : `Failed: ${result.error ?? 'unknown error'}`);
  };

  const handleDisable = async () => {
    setBusy(true);
    await disableNotifications();
    store.disable();
    track('notification_disabled');
    setBusy(false);
  };

  return (
    <section>
      <SectionHeader title="Notifications" sub="Useful meal ideas when they actually matter" />
      <div className="z-card p-4">
        {support === 'checking' ? (
          <div className="h-10" />
        ) : support === 'unsupported' ? (
          <div className="flex items-center gap-3 text-sm text-content-faint">
            <Icon name="notify-off" size={20} />
            Not supported in this browser.
          </div>
        ) : support === 'denied' ? (
          <div className="flex items-start gap-3">
            <Icon name="notify-off" size={20} className="text-content-faint shrink-0 mt-0.5" />
            <p className="text-sm text-content-muted">
              Blocked. Allow notifications for this site in your browser's settings to turn this back on.
            </p>
          </div>
        ) : store.enabled && support === 'granted' ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Icon name="notify-on" size={20} className="text-positive shrink-0" />
                <div>
                  <div className="text-sm font-bold">Smart notifications on</div>
                  <div className="text-2xs text-content-faint mt-0.5">Meal ideas, budget tips, pantry rescues.</div>
                </div>
              </div>
              <Button variant="secondary" size="sm" disabled={busy} onClick={handleDisable}>
                Turn off
              </Button>
            </div>

            <div className="border-t border-line pt-3">
              <div className="text-2xs font-bold uppercase tracking-wide text-content-faint mb-1">Meal ideas</div>
              {MEAL_LABELS.map(([key, label]) => (
                <ToggleRow key={key} label={label} checked={store.preferences.meals[key]} onChange={() => toggleMeal(key)} />
              ))}
            </div>

            <div className="border-t border-line pt-3">
              <div className="text-2xs font-bold uppercase tracking-wide text-content-faint mb-1">Smart suggestions</div>
              {SMART_LABELS.map(([key, label]) => (
                <ToggleRow key={key} label={label} checked={store.preferences.smart[key]} onChange={() => toggleSmart(key)} />
              ))}
            </div>

            <div className="border-t border-line pt-3">
              <div className="text-sm font-semibold mb-2">Maximum per day</div>
              <Segmented size="sm" value={store.preferences.maxPerDay} onChange={setMaxPerDay} options={MAX_PER_DAY_OPTIONS} />
            </div>

            <div className="border-t border-line pt-3">
              <ToggleRow
                label="Quiet hours"
                checked={store.preferences.quietHours.enabled}
                onChange={() => setQuietHours({ enabled: !store.preferences.quietHours.enabled })}
              />
              {store.preferences.quietHours.enabled && (
                <div className="flex items-center gap-2 mt-2 text-sm">
                  <input
                    type="time"
                    value={store.preferences.quietHours.start}
                    onChange={(e) => setQuietHours({ start: e.target.value })}
                    className="rounded-xl border border-line bg-surface-sunken px-3 py-2 text-sm focus:border-brand outline-none"
                    aria-label="Quiet hours start"
                  />
                  <span className="text-content-faint">to</span>
                  <input
                    type="time"
                    value={store.preferences.quietHours.end}
                    onChange={(e) => setQuietHours({ end: e.target.value })}
                    className="rounded-xl border border-line bg-surface-sunken px-3 py-2 text-sm focus:border-brand outline-none"
                    aria-label="Quiet hours end"
                  />
                </div>
              )}
            </div>

            {import.meta.env.DEV && (
              <div className="border-t border-line pt-3">
                <Button variant="secondary" size="sm" onClick={handleTest}>
                  Send test notification
                </Button>
                <p className="text-2xs text-content-faint mt-2">
                  Dev only — asks for the admin token each time, never stores it.
                </p>
                {testStatus && <p className="text-2xs text-content-faint mt-1">{testStatus}</p>}
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-start gap-3">
            <Icon name="notify" size={20} className="text-brand shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-bold">Want Zesto to remind you when there's actually something worth cooking?</p>
              <p className="text-xs text-content-muted mt-1">
                Personalized meal ideas based on your pantry, budget and routine — not a daily alarm.
              </p>
              <Button size="sm" className="mt-3" disabled={busy} onClick={handleEnable}>
                {busy ? 'Enabling…' : 'Enable smart notifications'}
              </Button>
              {error && <p className="text-2xs text-critical mt-2">{error}</p>}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
