import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Check your .env file.');
}

const globalForSupabase = globalThis as unknown as {
  __btaSupabaseClient?: SupabaseClient;
};

export const supabase: SupabaseClient =
  globalForSupabase.__btaSupabaseClient ??
  (globalForSupabase.__btaSupabaseClient = createClient(supabaseUrl, supabaseAnonKey));

