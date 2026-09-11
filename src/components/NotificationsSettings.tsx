import { useEffect, useState } from 'react';
import { SectionHeader } from './ui/primitives';
import { Button } from './ui/Button';
import { Icon } from './ui/Icon';
import { useNotifications } from '../state/notifications';
import {
  disableNotifications,
  enableNotifications,
  getNotificationSupportState,
  type NotificationSupportState,
} from '../lib/notifications/permission';

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

  const handleEnable = async () => {
    setBusy(true);
    setError(null);
    const result = await enableNotifications();
    setBusy(false);
    if (result.ok && result.token) {
      store.enable(result.token);
      setSupport('granted');
      // No backend to register this with yet (Phase 3) — logged so it can be pasted
      // into Firebase Console → Cloud Messaging → "Send test message" for a real
      // end-to-end check in the meantime. Harmless to leave in: an FCM token is only
      // useful together with this project's own server key, and isn't sensitive on
      // its own the way an auth credential would be.
      console.info('[Zesto] FCM token (for Firebase Console → Send test message):', result.token);
      return;
    }
    setSupport(await getNotificationSupportState());
    setError(
      result.reason === 'permission-denied'
        ? "Blocked. You'll need to allow notifications from your browser's site settings to turn this on."
        : result.reason === 'unsupported'
          ? "This browser doesn't support push notifications."
          : "Couldn't turn that on — try again in a moment.",
    );
  };

  const handleDisable = async () => {
    setBusy(true);
    await disableNotifications();
    store.disable();
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
