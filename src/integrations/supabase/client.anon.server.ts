// Server-side anon Supabase client. Uses the publishable key so RLS applies
// (anonymous role). Use this for public reads from server functions instead
// of supabaseAdmin, so policies like "status = 'publish'" filter rows.
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";
import { PUBLIC_SUPABASE_PUBLISHABLE_KEY, PUBLIC_SUPABASE_URL } from "./public-env";

function build() {
  const url =
    process.env.EPR_SUPABASE_URL ||
    process.env.VITE_EPR_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    PUBLIC_SUPABASE_URL;
  const key =
    process.env.EPR_SUPABASE_PUBLISHABLE_KEY ||
    process.env.VITE_EPR_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Missing Supabase URL or publishable key."
    );
  }
  return createClient<Database>(url, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
}

let _client: ReturnType<typeof build> | undefined;
export const supabaseAnon = new Proxy({} as ReturnType<typeof build>, {
  get(_, p, r) {
    if (!_client) _client = build();
    return Reflect.get(_client, p, r);
  },
});
