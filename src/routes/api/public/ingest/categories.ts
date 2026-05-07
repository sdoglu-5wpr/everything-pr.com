import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { jsonResponse, slugify, verifyIngestRequest } from "@/server/ingest-auth.server";

const CreateSchema = z.object({
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(255).optional(),
  description: z.string().max(2000).optional().nullable(),
  parent_id: z.number().int().optional().nullable(),
});

export const Route = createFileRoute("/api/public/ingest/categories")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const verified = await verifyIngestRequest(request);
        if (!verified.ok) return jsonResponse({ error: verified.error }, verified.status);

        const url = new URL(request.url);
        const search = url.searchParams.get("search")?.trim();
        const perPage = Math.min(500, Math.max(1, Number(url.searchParams.get("per_page") ?? 100)));

        let q = supabaseAdmin
          .from("categories")
          .select("id, slug, name, description, parent_id, post_count")
          .order("name", { ascending: true })
          .limit(perPage);
        if (search) q = q.ilike("name", `%${search}%`);

        const { data, error } = await q;
        if (error) return jsonResponse({ error: error.message }, 500);
        return jsonResponse({ ok: true, items: data ?? [] });
      },
      POST: async ({ request }) => {
        const verified = await verifyIngestRequest(request);
        if (!verified.ok) return jsonResponse({ error: verified.error }, verified.status);

        let parsed: z.infer<typeof CreateSchema>;
        try {
          parsed = CreateSchema.parse(JSON.parse(verified.body));
        } catch (e: any) {
          return jsonResponse({ error: "invalid payload", details: e?.message }, 400);
        }

        const slug = parsed.slug ? slugify(parsed.slug) : slugify(parsed.name);
        const { data: existing } = await supabaseAdmin
          .from("categories")
          .select("id, slug, name, description, parent_id, post_count")
          .eq("slug", slug)
          .maybeSingle();
        if (existing) return jsonResponse({ ok: true, item: existing, created: false });

        const { data, error } = await supabaseAdmin
          .from("categories")
          .insert({
            slug,
            name: parsed.name,
            description: parsed.description ?? null,
            parent_id: parsed.parent_id ?? null,
          })
          .select("id, slug, name, description, parent_id, post_count")
          .single();
        if (error) return jsonResponse({ error: error.message }, 500);
        return jsonResponse({ ok: true, item: data, created: true });
      },
    },
  },
});
