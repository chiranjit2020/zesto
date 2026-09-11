import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors } from './_lib/cors.js';

/** No auth, no Mongo — just confirms the Vercel deployment itself is reachable. */
export default function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;
  res.status(200).json({ ok: true, service: 'zesto-notifications-api', time: new Date().toISOString() });
}
