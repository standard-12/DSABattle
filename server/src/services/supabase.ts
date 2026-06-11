import { createClient, SupabaseClient } from '@supabase/supabase-js';
import config from '../config';

/**
 * Lazily-created service-role Supabase client for the game server.
 * Bypasses RLS — server-only, never exposed to clients.
 *
 * Created on first use (not at import) so the server can still boot for
 * matchmaking even if the battle env vars aren't set yet. Battle features
 * that touch the DB will throw a clear error until the env is configured.
 */
let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (client) return client;

  if (!config.supabaseUrl || !config.supabaseServiceKey) {
    throw new Error(
      'Supabase not configured — set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in server/.env',
    );
  }

  client = createClient(config.supabaseUrl, config.supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return client;
}
