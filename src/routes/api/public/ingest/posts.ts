import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { jsonResponse, verifyIngestRequest } from "@/server/ingest-auth.server";

export const Route = createFileRoute("/api/public/ingest/posts")({
  server: {
    handlers: {
      // GET requires HMAC too (uses empty body for signature)
      GET: async ({ request }) => {
        const verified = await verifyIngestRequest(request);
        if (!verified.ok) return jsonResponse({ error: verified.error }, verified.status);

        const url = new URL(request.url);
        const search = url.searchParams.get("search")?.trim();
        const status = url.searchParams.get("status");
        const page = Math.max(1, Number(url.searchParams.get("page") ?? 1));
        const perPage = Math.min(100, Math.max(1, Number(url.searchParams.get("per_page") ?? 20)));
        const from = (page - 1) * perPage;
        const to = from + perPage - 1;

        let q = supabaseAdmin
          .from("posts")
          .select("id, slug, title, excerpt, status, type, published_at, modified_at, author_id, featured_media_id", { count: "exact" })
          .eq("type", "post")
          .order("modified_at", { ascending: false })
          .range(from, to);

        if (status) q = q.eq("status", status);
        if (search) q = q.ilike("title", `%${search}%`);

        const { data, count, error } = await q;
        if (error) return jsonResponse({ error: error.message }, 500);

        return jsonResponse({
          ok: true,
          page,
          per_page: perPage,
          total: count ?? 0,
          items: data ?? [],
        });
      },
    },
  },
});
