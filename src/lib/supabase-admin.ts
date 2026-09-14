import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn('Missing Supabase Service Role Key. User management (add/delete) will not work.');
}

// NOTE: Using service role key in a frontend app is not secure for production. 
// It is recommended to use Edge Functions. But for this specific requirement, we do it here.
export const supabaseAdmin = createClient(
  supabaseUrl || 'https://placeholder.supabase.co', 
  supabaseServiceKey || 'dummy-key-to-prevent-crash', 
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);
