import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const BUCKET = "wp-media";
const STAFF = ["admin", "editor"] as const;

async function ensureStaff(supabase: any, userId: string) {
  const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  if (!roles?.some((r: any) => (STAFF as readonly string[]).includes(r.role))) {
    throw new Error("forbidden");
  }
}

const LEGACY_RE =
  /https?:\/\/(?:www\.)?everything-pr\.com\/wp-content\/uploads\/[^\s"'<>)\]]+/gi;

function extractUploadsPath(url: string): string | null {
  try {
    const u = new URL(url);
    const m = u.pathname.match(/\/wp-content\/uploads\/(.+)$/i);
    return m?.[1] ?? null;
  } catch { return null; }
}

function guessMime(p: string): string {
  const ext = p.split(".").pop()?.toLowerCase() ?? "";
  return ({ jpg:"image/jpeg",jpeg:"image/jpeg",png:"image/png",gif:"image/gif",webp:"image/webp",svg:"image/svg+xml",avif:"image/avif",bmp:"image/bmp",ico:"image/x-icon",mp4:"video/mp4",webm:"video/webm",pdf:"application/pdf" } as Record<string,string>)[ext] ?? "application/octet-stream";
}

function publicUrl(supabaseUrl: string, key: string): string {
  return `${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/public/${BUCKET}/${key}`;
}

function normalizeUrl(u: string): string {
  // Strip trailing punctuation/quotes the regex may catch.
  return u.replace(/[)\].,;:!?"']+$/, "");
}

// ---------- Stats ----------
export const getBackfillStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await ensureStaff(supabase, userId);

    const [pending, done, failed, totalQ] = await Promise.all([
      supabaseAdmin.from("media_backfill_queue").select("url", { count: "exact", head: true }).eq("status", "pending"),
      supabaseAdmin.from("media_backfill_queue").select("url", { count: "exact", head: true }).eq("status", "done"),
      supabaseAdmin.from("media_backfill_queue").select("url", { count: "exact", head: true }).eq("status", "failed"),
      supabaseAdmin.from("media_backfill_queue").select("url", { count: "exact", head: true }),
    ]);

    return {
      total: totalQ.count ?? 0,
      pending: pending.count ?? 0,
      done: done.count ?? 0,
      failed: failed.count ?? 0,
    };
  });

// ---------- Build queue from posts ----------
export const buildBackfillQueue = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await ensureStaff(supabase, userId);

    const PAGE = 500;
    let offset = 0;
    const urls = new Set<string>();

    while (true) {
      const { data, error } = await supabaseAdmin
        .from("posts")
        .select("first_inline_image, content_html")
        .eq("status", "publish")
        .eq("type", "post")
        .range(offset, offset + PAGE - 1);
      if (error) throw new Error(error.message);
      if (!data?.length) break;

      for (const p of data) {
        if (p.first_inline_image && /everything-pr\.com\/wp-content\/uploads\//i.test(p.first_inline_image)) {
          urls.add(normalizeUrl(p.first_inline_image));
        }
        if (p.content_html) {
          const matches = p.content_html.match(LEGACY_RE);
          if (matches) for (const m of matches) urls.add(normalizeUrl(m));
        }
      }
      if (data.length < PAGE) break;
      offset += PAGE;
    }

    // Insert in chunks; ignore duplicates.
    const rows = Array.from(urls)
      .map((u) => {
        const rel = extractUploadsPath(u);
        if (!rel) return null;
        return { url: u, storage_key: `wp-content/uploads/${rel}`, status: "pending" as const };
      })
      .filter((r): r is { url: string; storage_key: string; status: "pending" } => !!r);

    let inserted = 0;
    const CHUNK = 1000;
    for (let i = 0; i < rows.length; i += CHUNK) {
      const slice = rows.slice(i, i + CHUNK);
      const { error: upErr, count } = await supabaseAdmin
        .from("media_backfill_queue")
        .upsert(slice, { onConflict: "url", ignoreDuplicates: true, count: "exact" });
      if (upErr) throw new Error(upErr.message);
      inserted += count ?? 0;
    }

    return { scanned_urls: urls.size, queued: rows.length, newly_inserted: inserted };
  });

// ---------- Process a batch ----------
export const runBackfillBatch = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ batchSize: z.number().int().min(1).max(50).default(10) }).parse(input),
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await ensureStaff(supabase, userId);

    const SUPABASE_URL = process.env.EPR_SUPABASE_URL!;

    const { data: rows, error } = await supabaseAdmin
      .from("media_backfill_queue")
      .select("url, storage_key")
      .eq("status", "pending")
      .limit(data.batchSize);
    if (error) throw new Error(error.message);

    let uploaded = 0, failed = 0;
    const errors: Array<{ url: string; error: string }> = [];

    for (const row of rows ?? []) {
      const newUrl = publicUrl(SUPABASE_URL, row.storage_key);
      const mime = guessMime(row.storage_key);

      try {
        const res = await fetch(row.url, { headers: { "user-agent": "epr-media-backfill/1.0" } });
        if (!res.ok) {
          await supabaseAdmin.from("media_backfill_queue").update({
            status: "failed", attempts: 1 as any, last_error: `http_${res.status}`, updated_at: new Date().toISOString(),
          }).eq("url", row.url);
          failed++;
          errors.push({ url: row.url, error: `http_${res.status}` });
          continue;
        }
        const buf = new Uint8Array(await res.arrayBuffer());

        const { error: upErr } = await supabaseAdmin.storage
          .from(BUCKET)
          .upload(row.storage_key, buf, {
            contentType: res.headers.get("content-type") ?? mime,
            upsert: true,
          });
        if (upErr && !/exists/i.test(upErr.message)) throw new Error(`upload:${upErr.message}`);

        // Rewrite media table rows pointing at this URL (if any).
        await supabaseAdmin.from("media").update({
          storage_path: row.storage_key, url: newUrl, mime_type: mime, filesize: buf.byteLength,
        }).eq("url", row.url);

        // Rewrite posts.first_inline_image references.
        await supabaseAdmin.from("posts").update({ first_inline_image: newUrl }).eq("first_inline_image", row.url);

        // Note: posts.content_html is left as-is — `rewriteWpContentUrls` already
        // handles legacy URLs at render time, and now those proxied URLs will hit
        // Supabase storage (we'll patch the proxy / lib).

        await supabaseAdmin.from("media_backfill_queue").update({
          status: "done", bytes: buf.byteLength, last_error: null, updated_at: new Date().toISOString(),
        }).eq("url", row.url);

        uploaded++;
      } catch (e: any) {
        await supabaseAdmin.from("media_backfill_queue").update({
          status: "failed", last_error: String(e?.message ?? e).slice(0, 500), updated_at: new Date().toISOString(),
        }).eq("url", row.url);
        failed++;
        errors.push({ url: row.url, error: String(e?.message ?? e) });
      }
    }

    return { processed: rows?.length ?? 0, uploaded, failed, errors: errors.slice(0, 5) };
  });

// ---------- Reset failed → pending ----------
export const resetFailedBackfill = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await ensureStaff(supabase, userId);
    const { error, count } = await supabaseAdmin
      .from("media_backfill_queue")
      .update({ status: "pending", last_error: null }, { count: "exact" })
      .eq("status", "failed");
    if (error) throw new Error(error.message);
    return { reset: count ?? 0 };
  });
