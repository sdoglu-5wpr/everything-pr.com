import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { jsonResponse, slugify, verifyIngestRequest } from "@/server/ingest-auth.server";

const PostSchema = z.object({
  slug: z.string().min(1).max(255).optional(),
  title: z.string().min(1).max(500),
  html: z.string().min(1),
  excerpt: z.string().max(2000).optional().nullable(),
  status: z.enum(["draft", "publish", "future", "private", "trash"]).default("draft"),
  type: z.enum(["post", "page"]).default("post"),
  published_at: z.string().datetime().optional().nullable(),
  category: z.union([z.string(), z.number(), z.array(z.union([z.string(), z.number()]))]).optional(),
  tags: z.array(z.union([z.string(), z.number()])).optional(),
  cover_url: z.string().url().optional().nullable(),
  author: z.union([z.string(), z.number()]).optional().nullable(),
  seo_title: z.string().max(255).optional().nullable(),
  seo_description: z.string().max(500).optional().nullable(),
  focus_keyword: z.string().max(255).optional().nullable(),
  canonical: z.string().url().optional().nullable(),
});

async function resolveCategoryIds(input: unknown): Promise<number[]> {
  if (input == null) return [];
  const arr = Array.isArray(input) ? input : [input];
  const ids: number[] = [];
  for (const c of arr) {
    if (typeof c === "number") {
      ids.push(c);
      continue;
    }
    const slug = slugify(String(c));
    const { data: existing } = await supabaseAdmin
      .from("categories")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (existing?.id) {
      ids.push(existing.id as number);
    } else {
      const { data: created, error } = await supabaseAdmin
        .from("categories")
        .insert({ slug, name: String(c) })
        .select("id")
        .single();
      if (error) throw new Error(`category insert failed: ${error.message}`);
      ids.push(created!.id as number);
    }
  }
  return ids;
}

async function resolveTagIds(input: unknown): Promise<number[]> {
  if (!Array.isArray(input)) return [];
  const ids: number[] = [];
  for (const t of input) {
    if (typeof t === "number") {
      ids.push(t);
      continue;
    }
    const slug = slugify(String(t));
    const { data: existing } = await supabaseAdmin
      .from("tags")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (existing?.id) {
      ids.push(existing.id as number);
    } else {
      const { data: created, error } = await supabaseAdmin
        .from("tags")
        .insert({ slug, name: String(t) })
        .select("id")
        .single();
      if (error) throw new Error(`tag insert failed: ${error.message}`);
      ids.push(created!.id as number);
    }
  }
  return ids;
}

async function resolveAuthorId(input: unknown): Promise<number | null> {
  if (input == null) return null;
  if (typeof input === "number") return input;
  const name = String(input).trim();
  if (!name) return null;
  const slug = slugify(name);
  const { data: existing } = await supabaseAdmin
    .from("authors")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (existing?.id) return existing.id as number;
  const { data: created, error } = await supabaseAdmin
    .from("authors")
    .insert({ slug, display_name: name })
    .select("id")
    .single();
  if (error) throw new Error(`author insert failed: ${error.message}`);
  return created!.id as number;
}

async function resolveFeaturedMediaId(coverUrl?: string | null): Promise<number | null> {
  if (!coverUrl) return null;
  const { data: existing } = await supabaseAdmin
    .from("media")
    .select("id")
    .eq("url", coverUrl)
    .maybeSingle();
  if (existing?.id) return existing.id as number;
  const filename = coverUrl.split("/").pop() ?? "cover";
  const { data: created, error } = await supabaseAdmin
    .from("media")
    .insert({ url: coverUrl, filename })
    .select("id")
    .single();
  if (error) throw new Error(`media insert failed: ${error.message}`);
  return created!.id as number;
}

export const Route = createFileRoute("/api/public/ingest/post")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const verified = await verifyIngestRequest(request);
        if (!verified.ok) return jsonResponse({ error: verified.error }, verified.status);

        let parsed: z.infer<typeof PostSchema>;
        try {
          parsed = PostSchema.parse(JSON.parse(verified.body));
        } catch (e: any) {
          return jsonResponse({ error: "invalid payload", details: e?.message }, 400);
        }

        try {
          const slug = parsed.slug ? slugify(parsed.slug) : slugify(parsed.title);
          const author_id = await resolveAuthorId(parsed.author);
          const featured_media_id = await resolveFeaturedMediaId(parsed.cover_url);
          const category_ids = await resolveCategoryIds(parsed.category);
          const tag_ids = await resolveTagIds(parsed.tags);

          const postRow = {
            slug,
            title: parsed.title,
            content_html: parsed.html,
            excerpt: parsed.excerpt ?? null,
            status: parsed.status,
            type: parsed.type,
            published_at: parsed.published_at
              ?? (parsed.status === "publish" ? new Date().toISOString() : null),
            author_id,
            featured_media_id,
            modified_at: new Date().toISOString(),
          };

          // Upsert by slug
          const { data: existing } = await supabaseAdmin
            .from("posts")
            .select("id")
            .eq("slug", slug)
            .maybeSingle();

          let postId: number;
          if (existing?.id) {
            const { data, error } = await supabaseAdmin
              .from("posts")
              .update(postRow)
              .eq("id", existing.id)
              .select("id")
              .single();
            if (error) return jsonResponse({ error: error.message }, 500);
            postId = data!.id as number;
          } else {
            const { data, error } = await supabaseAdmin
              .from("posts")
              .insert(postRow)
              .select("id")
              .single();
            if (error) return jsonResponse({ error: error.message }, 500);
            postId = data!.id as number;
          }

          // Replace category/tag joins
          await supabaseAdmin.from("post_categories").delete().eq("post_id", postId);
          if (category_ids.length) {
            await supabaseAdmin.from("post_categories").insert(
              category_ids.map((category_id) => ({ post_id: postId, category_id })),
            );
          }
          await supabaseAdmin.from("post_tags").delete().eq("post_id", postId);
          if (tag_ids.length) {
            await supabaseAdmin.from("post_tags").insert(
              tag_ids.map((tag_id) => ({ post_id: postId, tag_id })),
            );
          }

          // Upsert SEO meta
          const hasSeo =
            parsed.seo_title || parsed.seo_description ||
            parsed.focus_keyword || parsed.canonical || parsed.cover_url;
          if (hasSeo) {
            const seoRow = {
              object_type: "post",
              object_id: postId,
              title: parsed.seo_title ?? null,
              description: parsed.seo_description ?? null,
              canonical_url: parsed.canonical ?? null,
              og_image: parsed.cover_url ?? null,
              twitter_image: parsed.cover_url ?? null,
              raw: parsed.focus_keyword ? { focus_keyword: parsed.focus_keyword } : null,
            };
            const { data: existingSeo } = await supabaseAdmin
              .from("seo_meta")
              .select("id")
              .eq("object_type", "post")
              .eq("object_id", postId)
              .maybeSingle();
            if (existingSeo?.id) {
              await supabaseAdmin.from("seo_meta").update(seoRow).eq("id", existingSeo.id);
            } else {
              await supabaseAdmin.from("seo_meta").insert(seoRow);
            }
          }

          return jsonResponse({
            ok: true,
            id: postId,
            slug,
            url: `https://everything-pr.com/${slug}`,
          });
        } catch (e: any) {
          return jsonResponse({ error: e?.message ?? "internal error" }, 500);
        }
      },
    },
  },
});
