/**
 * WhatsApp feedback deep link (docs/ANALYTICS_FEEDBACK_PLAN.md §9/§10). Opens a
 * pre-filled WhatsApp conversation — the user reviews, edits, and sends it themselves;
 * nothing here ever sends anything automatically (spec §10: "the user must explicitly
 * send the message"). `wa.me` links work with no app-specific integration, no WhatsApp
 * Business API, no server round-trip.
 *
 * Privacy (spec §11): only coarse, non-identifying technical context goes into the
 * message — current page, a coarse OS/browser guess (not a full user-agent string), and
 * the build's git-SHA version. Never pantry contents, meal history, or any device/user
 * identifier.
 */
export type FeedbackType = 'bug' | 'idea' | 'general';

const TYPE_LABELS: Record<FeedbackType, string> = {
  bug: 'Bug report',
  idea: 'Feature idea',
  general: 'General feedback',
};

/** Coarse OS + browser guess from the user agent — enough to be useful for a bug
 *  report, deliberately not a full UA string (which is a fingerprinting vector). */
function deviceSummary(): string {
  const ua = navigator.userAgent;
  const os = /Android/.test(ua)
    ? 'Android'
    : /iPhone|iPad|iPod/.test(ua)
      ? 'iOS'
      : /Windows/.test(ua)
        ? 'Windows'
        : /Mac OS/.test(ua)
          ? 'macOS'
          : /Linux/.test(ua)
            ? 'Linux'
            : 'unknown OS';
  const browser = /Edg\//.test(ua)
    ? 'Edge'
    : /Chrome\//.test(ua)
      ? 'Chrome'
      : /Firefox\//.test(ua)
        ? 'Firefox'
        : /Safari\//.test(ua)
          ? 'Safari'
          : 'unknown browser';
  return `${os} · ${browser}`;
}

/** `null` when `VITE_WHATSAPP_NUMBER` isn't configured — callers should hide the
 *  feedback UI entirely in that case rather than link to nothing (spec §29 posture,
 *  same as every other "unconfigured = safe no-op" piece of this app). */
export function buildWhatsAppFeedbackUrl(type: FeedbackType, page: string): string | null {
  const number = import.meta.env.VITE_WHATSAPP_NUMBER;
  if (!number) return null;

  const message = [
    'Hi Zesto 👋',
    '',
    `Feedback type: ${TYPE_LABELS[type]}`,
    `Page: ${page}`,
    '',
    'Problem:',
    '',
    '',
    `Device/Browser: ${deviceSummary()}`,
    `Zesto version: ${__ZESTO_VERSION__}`,
  ].join('\n');

  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

export const isFeedbackConfigured = !!import.meta.env.VITE_WHATSAPP_NUMBER;
