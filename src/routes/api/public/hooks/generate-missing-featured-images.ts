import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

/**
 * Auto-generates a featured image for any published / scheduled post that
 * doesn't have one. Uses Lovable AI Gateway (Nano Banana). Uploads the
 * resulting PNG to the wp-media bucket with an SEO-friendly filename and
 * links it via posts.featured_media_id with descriptive alt text.
 *
 * Safe to call repeatedly — it skips posts that already have a featured
 * image, an inline image, or any <img> in their HTML.
 */
export const Route = createFileRoute(
  "/api/public/hooks/generate-missing-featured-images",
)({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const supabaseUrl =
          process.env.SUPABASE_URL || process.env.EPR_SUPABASE_URL;
        const serviceKey =
          process.env.SUPABASE_SERVICE_ROLE_KEY ||
          process.env.EPR_SUPABASE_SERVICE_KEY;
        const aiKey = process.env.LOVABLE_API_KEY;
        if (!supabaseUrl || !serviceKey) {
          return json({ error: "missing supabase service credentials" }, 500);
        }
        if (!aiKey) {
          return json({ error: "missing LOVABLE_API_KEY" }, 500);
        }

        const url = new URL(request.url);
        const limit = Math.min(
          25,
          Math.max(1, Number(url.searchParams.get("limit") ?? 5)),
        );
        const includeFuture = url.searchParams.get("future") !== "0";

        const supabase = createClient(supabaseUrl, serviceKey, {
          auth: { persistSession: false, autoRefreshToken: false },
        });

        const statuses = includeFuture ? ["publish", "future"] : ["publish"];
        const { data: candidates, error: selErr } = await supabase
          .from("posts")
          .select("id, slug, title, excerpt, content_html")
          .in("status", statuses)
          .eq("type", "post")
          .is("featured_media_id", null)
          .order("published_at", { ascending: false, nullsFirst: false })
          .limit(limit * 4);
        if (selErr) return json({ error: selErr.message }, 500);

        const targets = (candidates ?? [])
          .filter(
            (p: any) =>
              !p.first_inline_image &&
              !/<img\b/i.test(p.content_html ?? ""),
          )
          .slice(0, limit);

        const results: Array<Record<string, unknown>> = [];
        for (const post of targets) {
          try {
            const r = await generateForPost(supabase, aiKey, post);
            results.push({ id: post.id, slug: post.slug, ...r });
          } catch (e: any) {
            results.push({
              id: post.id,
              slug: post.slug,
              error: e?.message ?? String(e),
            });
          }
        }

        return json({
          ok: true,
          scanned: targets.length,
          generated: results.filter((r) => !r.error).length,
          results,
        });
      },
      GET: async () =>
        json({
          ok: true,
          hint:
            "POST to generate featured images for posts without one. ?limit=N&future=1",
        }),
    },
  },
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function slugify(s: string): string {
  return (s || "image")
    .toLowerCase()
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z]+;/g, " ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "featured-image";
}

function buildAltText(title: string): string {
  const clean = title.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
  return `Editorial illustration for article: ${clean}`.slice(0, 240);
}

function buildPrompt(title: string, excerpt: string | null): string {
  const ex = (excerpt || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z]+;/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 400);
  return `Editorial cover image for a public-relations industry news article.
Title: "${title}".
${ex ? `Context: ${ex}` : ""}
Style: modern editorial illustration, clean composition, professional, magazine-quality, subtle gradient background, no text, no logos, no watermarks, 16:9 framing. Photographic or illustrative as appropriate to the topic.`;
}

async function generateForPost(
  supabase: any,
  aiKey: string,
  post: { id: number; slug: string; title: string; excerpt: string | null },
) {
  const prompt = buildPrompt(post.title, post.excerpt);

  const aiResp = await fetch(
    "https://ai.gateway.lovable.dev/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${aiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3.1-flash-image-preview",
        messages: [{ role: "user", content: prompt }],
        modalities: ["image", "text"],
      }),
    },
  );
  if (!aiResp.ok) {
    const t = await aiResp.text();
    throw new Error(`ai_${aiResp.status}: ${t.slice(0, 200)}`);
  }
  const aiJson: any = await aiResp.json();
  const dataUrl: string | undefined =
    aiJson?.choices?.[0]?.message?.images?.[0]?.image_url?.url;
  if (!dataUrl || !dataUrl.startsWith("data:")) {
    throw new Error("ai_no_image_returned");
  }
  const commaIdx = dataUrl.indexOf(",");
  const meta = dataUrl.slice(5, commaIdx); // image/png;base64
  const mime = meta.split(";")[0] || "image/png";
  const b64 = dataUrl.slice(commaIdx + 1);
  const bytes = Buffer.from(b64, "base64");

  const ext = mime === "image/jpeg" ? "jpg" : mime === "image/webp" ? "webp" : "png";
  const seoSlug = slugify(post.title);
  const filename = `${seoSlug}-featured.${ext}`;
  const now = new Date();
  const path = `auto-featured/${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}/${post.id}-${filename}`;

  const { error: upErr } = await supabase.storage
    .from("wp-media")
    .upload(path, bytes, { contentType: mime, upsert: true });
  if (upErr) throw new Error(`upload:${upErr.message}`);

  const { data: pub } = supabase.storage.from("wp-media").getPublicUrl(path);
  const publicUrl = pub.publicUrl;
  const altText = buildAltText(post.title);

  const { data: maxRow } = await supabase
    .from("media")
    .select("id")
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextId = ((maxRow?.id as number | undefined) ?? 0) + 1;

  const { data: ins, error: insErr } = await supabase
    .from("media")
    .insert({
      id: nextId,
      url: publicUrl,
      storage_path: path,
      filename,
      mime_type: mime,
      alt_text: altText,
      title: post.title,
      filesize: bytes.byteLength,
      uploaded_at: now.toISOString(),
    })
    .select("id, url, alt_text")
    .single();
  if (insErr) throw new Error(`media_insert:${insErr.message}`);

  const { error: postErr } = await supabase
    .from("posts")
    .update({ featured_media_id: ins.id, modified_at: now.toISOString() })
    .eq("id", post.id);
  if (postErr) throw new Error(`post_update:${postErr.message}`);

  // Best-effort: also set seo_meta og_image if missing
  const { data: existingSeo } = await supabase
    .from("seo_meta")
    .select("id, og_image")
    .eq("object_type", "post")
    .eq("object_id", post.id)
    .maybeSingle();
  if (!existingSeo?.og_image) {
    if (existingSeo?.id) {
      await supabase
        .from("seo_meta")
        .update({ og_image: publicUrl })
        .eq("id", existingSeo.id);
    } else {
      await supabase.from("seo_meta").insert({
        object_type: "post",
        object_id: post.id,
        url_path: `/${post.slug}/`,
        og_image: publicUrl,
        og_type: "article",
        twitter_card: "summary_large_image",
      } as any);
    }
  }

  return {
    media_id: ins.id,
    url: publicUrl,
    alt: altText,
    filename,
  };
}
