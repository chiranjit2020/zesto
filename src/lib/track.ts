/**
 * The one statically-importable entry point for analytics (docs/ANALYTICS_FEEDBACK_PLAN.md).
 * This file itself is tiny and dependency-free — safe to import from anywhere without
 * pulling the Firebase Analytics SDK into that caller's bundle. It internally dynamic-
 * imports `lib/analytics.ts` (the file that actually touches `firebase/analytics`) on
 * first call, so every feature just does `import { track } from '../lib/track'` and
 * calls it directly, instead of repeating the `void import('../lib/analytics').then(...)`
 * dance at every call site — one centralized place, not one per feature (spec: "avoid
 * scattering Firebase Analytics implementation details throughout the entire codebase").
 *
 * Fire-and-forget by design, same as `lib/analytics.ts` itself: a dropped or failed
 * event must never surface as a broken app (spec: "Zesto's core functionality must
 * never depend on analytics being available").
 */
export function track(name: string, params?: Record<string, unknown>): void {
  void import('./analytics').then((m) => m.track(name, params));
}
