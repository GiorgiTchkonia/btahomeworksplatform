import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY || '';

/**
 * SECURITY NOTICE:
 * In production environments, client-side service role keys MUST NOT be used.
 * Privileged user operations (create, update, delete) are routed through the
 * Supabase Edge Function `admin-users`, which validates caller ADMIN role.
 *
 * This client is preserved strictly as a backward-compatible fallback for offline
 * or local development environments prior to Edge Function deployment.
 */
export const isLocalAdminConfigured = (): boolean => {
  return Boolean(supabaseUrl && supabaseServiceKey && supabaseServiceKey.length > 20);
};

const globalForSupabaseAdmin = globalThis as unknown as {
  __btaSupabaseAdminClient?: SupabaseClient;
};

export const supabaseAdmin: SupabaseClient =
  globalForSupabaseAdmin.__btaSupabaseAdminClient ??
  (globalForSupabaseAdmin.__btaSupabaseAdminClient = createClient(
    supabaseUrl || 'https://placeholder.supabase.co',
    supabaseServiceKey || 'dummy-key-for-local-fallback',
    {
      auth: {
        storageKey: 'bta-supabase-admin-fallback-token',
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    }
  ));

