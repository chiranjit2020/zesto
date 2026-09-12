/**
 * Talks to `api/feedback/*` — same "unconfigured API = silent no-op" posture as
 * `src/lib/notifications/api.ts` (VITE_API_BASE_URL unset just means recipe feedback
 * doesn't reach Mongo; the Analytics event still fires independently — see
 * `RecipeFeedbackPrompt` in src/routes/CookMode.tsx).
 */
const BASE_URL = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ?? '';
const isApiConfigured = BASE_URL.length > 0;

export async function submitRecipeFeedback(
  deviceId: string,
  recipeNumber: number,
  rating: 'up' | 'down',
  reason: string | null = null,
): Promise<boolean> {
  if (!isApiConfigured) return false;
  try {
    const res = await fetch(`${BASE_URL}/api/feedback/recipe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId, recipeNumber, rating, reason }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
