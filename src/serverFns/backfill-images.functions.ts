import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const STAFF = ["admin", "editor"] as const;

async function ensureStaff(supabase: any, userId: string) {
  const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  if (!roles?.some((r: any) => (STAFF as readonly string[]).includes(r.role))) {
    throw new Error("forbidden");
  }
}

const WP_BASE = "https://everything-pr.com/wp-json/wp/v2";

async function fetchYoastOg(postId: number): Promise<{ url: string | null; reason: string }> {
  try {
    const r = await fetch(`${WP_BASE}/posts/${postId}?_fields=yoast_head_json,jetpack_featured_media_url`, {
      headers: { accept: "application/json", "user-agent": "everything-pr-backfill/1.0" },
    });
    if (!r.ok) return { url: null, reason: `wp_http_${r.status}` };
    const j: any = await r.json();
    const og = j?.yoast_head_json?.og_image?.[0]?.url;
    if (typeof og === "string" && og.startsWith("http")) return { url: og, reason: "ok_yoast" };
    const jp = j?.jetpack_featured_media_url;
    if (typeof jp === "string" && jp.startsWith("http")) return { url: jp, reason: "ok_jetpack" };
    return { url: null, reason: "wp_no_image_field" };
  } catch (e: any) {
    return { url: null, reason: `wp_fetch_threw:${e?.message ?? "unknown"}` };
  }
}

export const backfillMissingImages = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({
      limit: z.number().int().min(1).max(500).default(100),
      offset: z.number().int().min(0).default(0),
    }).parse(input),
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await ensureStaff(supabase, userId);

    // Posts with no featured_media_id, no first_inline_image, no <img> in HTML.
    const { data: candidates, error } = await supabase
      .from("posts")
      .select("id, slug, content_html")
      .eq("status", "publish")
      .eq("type", "post")
      .is("featured_media_id", null)
      .order("published_at", { ascending: false, nullsFirst: false })
      .range(data.offset, data.offset + data.limit - 1);
    if (error) throw new Error(error.message);

    const targets = (candidates ?? []).filter(
      (p: any) => !p.first_inline_image && !/<img\b/i.test(p.content_html ?? ""),
    );

    let updated = 0;
    let skipped = 0;
    const examples: Array<{ id: number; slug: string; og_image: string | null }> = [];
    const errors: Array<{ id: number; slug: string; error: string }> = [];
    const skipReasons: Record<string, number> = {};
    const bump = (k: string) => { skipReasons[k] = (skipReasons[k] ?? 0) + 1; };

    for (const p of targets) {
      const { data: existingSeo } = await supabase
        .from("seo_meta")
        .select("id, og_image")
        .eq("object_type", "post")
        .eq("object_id", p.id)
        .maybeSingle();
      if (existingSeo?.og_image) {
        skipped++; bump("already_has_og");
        continue;
      }

      const fetched = await fetchYoastOg(p.id);
      if (!fetched.url) {
        skipped++; bump(fetched.reason);
        continue;
      }
      const og = fetched.url;

      if (existingSeo?.id) {
        const { error: upErr } = await supabase
          .from("seo_meta")
          .update({ og_image: og })
          .eq("id", existingSeo.id);
        if (upErr) {
          errors.push({ id: p.id, slug: p.slug, error: `update:${upErr.message}` });
          skipped++; bump("update_error");
          continue;
        }
      } else {
        const urlPath = `/${p.slug}/`;
        const { error: insErr, data: insData } = await supabase
          .from("seo_meta")
          .insert({
            object_type: "post",
            object_id: p.id,
            url_path: urlPath,
            og_image: og,
            og_type: "article",
            twitter_card: "summary_large_image",
          } as any)
          .select("id")
          .maybeSingle();
        if (insErr || !insData) {
          errors.push({ id: p.id, slug: p.slug, error: `insert:${insErr?.message ?? "no row"}` });
          skipped++; bump("insert_error");
          continue;
        }
      }

      updated++;
      if (examples.length < 5) examples.push({ id: p.id, slug: p.slug, og_image: og });
    }

    return { scanned: targets.length, updated, skipped, examples, errors, skipReasons };
  });
