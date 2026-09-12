import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * The frontend (chiranjitkarmakar.com, GitHub Pages) and this API (a Vercel project)
 * are different origins by design (docs/NOTIFICATIONS_PLAN.md §0 — GitHub Pages was
 * kept deliberately). Every handler needs CORS, and needs to answer the browser's
 * preflight OPTIONS request before any real logic runs.
 */
const ALLOWED_ORIGINS = [
  'https://chiranjitkarmakar.com',
  // the live site actually resolves at the `www` subdomain (chiranjitkarmakar.com
  // 301s to it) — found 2026-09-12 when the bare-domain-only allowlist here silently
  // dropped Access-Control-Allow-Origin for every real production request.
  'https://www.chiranjitkarmakar.com',
  /^http:\/\/localhost:\d+$/,
  /^http:\/\/127\.0\.0\.1:\d+$/,
];

function isAllowedOrigin(origin: string | undefined): origin is string {
  if (!origin) return false;
  return ALLOWED_ORIGINS.some((rule) => (typeof rule === 'string' ? rule === origin : rule.test(origin)));
}

/** Returns `true` if the request was a preflight and has already been answered. */
export function applyCors(req: VercelRequest, res: VercelResponse): boolean {
  const origin = req.headers.origin;
  if (isAllowedOrigin(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  // `x-admin-token`: api/notifications/test.ts's dev-only manual test send (spec §28)
  // is deliberately called with this header directly from the browser (see that file's
  // own comment on why that doesn't conflict with spec §23) — a non-simple header like
  // this forces a CORS preflight, so it has to be allowlisted here or that call fails
  // before it ever reaches the handler's own admin-token check.
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-token');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return true;
  }
  return false;
}
