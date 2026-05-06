import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

export const Route = createFileRoute("/api/public/hooks/publish-scheduled")({
  server: {
    handlers: {
      POST: async () => {
        const url = process.env.SUPABASE_URL || process.env.EPR_SUPABASE_URL;
        const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EPR_SUPABASE_SERVICE_KEY;
        if (!url || !key) {
          return new Response(JSON.stringify({ error: "missing service credentials" }), { status: 500 });
        }
        const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

        const { data, error } = await supabase
          .from("posts")
          .update({ status: "publish", modified_at: new Date().toISOString() })
          .eq("status", "future")
          .lte("published_at", new Date().toISOString())
          .select("id, slug, published_at");

        if (error) {
          return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { "Content-Type": "application/json" } });
        }
        return new Response(
          JSON.stringify({ ok: true, published: data?.length ?? 0, items: data ?? [] }),
          { headers: { "Content-Type": "application/json" } }
        );
      },
      GET: async () => new Response(JSON.stringify({ ok: true, hint: "POST to publish due scheduled posts" }), { headers: { "Content-Type": "application/json" } }),
    },
  },
});
