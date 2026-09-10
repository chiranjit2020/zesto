import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Optional backend. Zesto is fully usable without it — this returns null when no
 * credentials are configured, and the app falls back to on-device storage (§28).
 * The anon key is the ONLY key that ever reaches the client (§27, §39).
 */
const url = import.meta.env.VITE_SUPABASE_URL;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase: SupabaseClient | null =
  url && anon
    ? createClient(url, anon, {
        auth: { persistSession: true, autoRefreshToken: true },
      })
    : null;

export const isBackendConfigured = supabase !== null;
