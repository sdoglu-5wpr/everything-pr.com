// Server-side Supabase client with service role key — bypasses RLS.
// Reads from EPR_-prefixed env vars to avoid Lovable's reserved SUPABASE_ namespace.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';
import { PUBLIC_SUPABASE_URL } from './public-env';

function createSupabaseAdminClient() {
  const SUPABASE_URL =
    process.env.EPR_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    process.env.VITE_EPR_SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    PUBLIC_SUPABASE_URL;
  const SUPABASE_SERVICE_KEY =
    process.env.EPR_SUPABASE_SERVICE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    const missing = [
      ...(!SUPABASE_URL ? ['EPR_SUPABASE_URL or SUPABASE_URL'] : []),
      ...(!SUPABASE_SERVICE_KEY ? ['EPR_SUPABASE_SERVICE_KEY or SUPABASE_SERVICE_ROLE_KEY'] : []),
    ];
    const message = `Missing env var(s): ${missing.join(', ')}. Set them in Project Secrets.`;
    console.error(`[Supabase] ${message}`);
    throw new Error(message);
  }

  return createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: {
      storage: undefined,
      persistSession: false,
      autoRefreshToken: false,
    }
  });
}

let _supabaseAdmin: ReturnType<typeof createSupabaseAdminClient> | undefined;

export const supabaseAdmin = new Proxy({} as ReturnType<typeof createSupabaseAdminClient>, {
  get(_, prop, receiver) {
    if (!_supabaseAdmin) _supabaseAdmin = createSupabaseAdminClient();
    return Reflect.get(_supabaseAdmin, prop, receiver);
  },
});
