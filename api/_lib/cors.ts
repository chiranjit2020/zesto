import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * The frontend (chiranjitkarmakar.com, GitHub Pages) and this API (a Vercel project)
 * are different origins by design (docs/NOTIFICATIONS_PLAN.md §0 — GitHub Pages was
 * kept deliberately). Every handler needs CORS, and needs to answer the browser's
 * preflight OPTIONS request before any real logic runs.
 */
const ALLOWED_ORIGINS = [
  'https://chiranjitkarmakar.com',
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
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return true;
  }
  return false;
}
