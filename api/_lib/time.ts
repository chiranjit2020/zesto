/**
 * Timezone-aware helpers for the dispatcher (spec §13: "never assume every user is in
 * India… evaluate meal windows in the user's local timezone"). Deliberately minimal —
 * just `Intl.DateTimeFormat`, which Node's built-in ICU resolves for any IANA zone
 * without an extra date library.
 */

export interface LocalParts {
  hour: number;
  minute: number;
  /** "YYYY-MM-DD" in the given timezone — the user's local calendar day */
  dateKey: string;
}

const formatterCache = new Map<string, Intl.DateTimeFormat>();

function formatterFor(timezone: string): Intl.DateTimeFormat {
  let f = formatterCache.get(timezone);
  if (!f) {
    f = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
    formatterCache.set(timezone, f);
  }
  return f;
}

export function localParts(timezone: string, now = new Date()): LocalParts {
  const parts = formatterFor(timezone).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '00';
  return {
    hour: Number(get('hour')) % 24, // guard against a stray "24" for local midnight
    minute: Number(get('minute')),
    dateKey: `${get('year')}-${get('month')}-${get('day')}`,
  };
}

export function minutesSinceMidnight(p: LocalParts): number {
  return p.hour * 60 + p.minute;
}

/** `start > end` means the window wraps past local midnight (e.g. quiet hours, midnight-snack). */
export function inWindow(minutes: number, start: number, end: number): boolean {
  return start <= end ? minutes >= start && minutes < end : minutes >= start || minutes < end;
}

/**
 * Approximate UTC instant of local midnight for `timezone`, `minutesIntoDay` minutes
 * before `now` — used to bound "sent today" queries against `notificationHistory`.
 * Off by up to an hour on the day a DST transition happens in `timezone`; acceptable
 * for a once-a-day notification-count limit, not worth a full timezone-database
 * dependency to fix.
 */
export function approxLocalMidnightUtc(minutesIntoDay: number, now = new Date()): Date {
  return new Date(now.getTime() - minutesIntoDay * 60_000);
}
