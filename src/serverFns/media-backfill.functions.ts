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

function sanitizeStorageKey(key: string): string {
  // Supabase Storage rejects non-ASCII chars (e.g. curly quotes ’).
  // Normalize accents → ASCII, drop combining marks, replace any remaining
  // non-safe char with '-'. Preserve '/' for path segments.
  const noAccents = key.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
  return noAccents
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
    .replace(/[\u201C\u201D\u201E\u201F]/g, '"')
    .replace(/[^A-Za-z0-9._\-/]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+(?=\.)/g, "");
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

    const { data, error } = await supabaseAdmin.rpc("build_media_backfill_queue");
    if (error) throw new Error(error.message);
    const r = (data ?? {}) as { scanned_urls?: number; queued?: number; newly_inserted?: number };
    return {
      scanned_urls: r.scanned_urls ?? 0,
      queued: r.queued ?? 0,
      newly_inserted: r.newly_inserted ?? 0,
    };
  });

// ---------- Process a batch ----------
async function processOne(row: { url: string; storage_key: string }, SUPABASE_URL: string, deadline: number) {
  const safeKey = sanitizeStorageKey(row.storage_key);
  const newUrl = publicUrl(SUPABASE_URL, safeKey);
  const mime = guessMime(safeKey);
  try {
    const ctrl = new AbortController();
    const remaining = Math.max(1000, deadline - Date.now());
    const t = setTimeout(() => ctrl.abort(), Math.min(8000, remaining));
    const res = await fetch(row.url, {
      headers: { "user-agent": "epr-media-backfill/1.0" },
      signal: ctrl.signal,
    }).finally(() => clearTimeout(t));
    if (!res.ok) {
      await supabaseAdmin.from("media_backfill_queue").update({
        status: "failed", last_error: `http_${res.status}`, updated_at: new Date().toISOString(),
      }).eq("url", row.url);
      return { ok: false as const, err: `http_${res.status}`, url: row.url };
    }
    const buf = new Uint8Array(await res.arrayBuffer());

    const { error: upErr } = await supabaseAdmin.storage.from(BUCKET).upload(safeKey, buf, {
      contentType: res.headers.get("content-type") ?? mime, upsert: true,
    });
    if (upErr && !/exists/i.test(upErr.message)) throw new Error(`upload:${upErr.message}`);

    await Promise.all([
      supabaseAdmin.from("media").update({
        storage_path: safeKey, url: newUrl, mime_type: mime, filesize: buf.byteLength,
      }).eq("url", row.url),
      supabaseAdmin.from("posts").update({ first_inline_image: newUrl }).eq("first_inline_image", row.url),
      supabaseAdmin.from("media_backfill_queue").update({
        status: "done", storage_key: safeKey, bytes: buf.byteLength, last_error: null, updated_at: new Date().toISOString(),
      }).eq("url", row.url),
    ]);
    return { ok: true as const, bytes: buf.byteLength };
  } catch (e: any) {
    const msg = String(e?.message ?? e).slice(0, 500);
    await supabaseAdmin.from("media_backfill_queue").update({
      status: "failed", last_error: msg, updated_at: new Date().toISOString(),
    }).eq("url", row.url);
    return { ok: false as const, err: msg, url: row.url };
  }
}

export const runBackfillBatch = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ batchSize: z.number().int().min(1).max(100).default(40) }).parse(input),
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await ensureStaff(supabase, userId);

    const SUPABASE_URL = process.env.EPR_SUPABASE_URL!;
    const deadline = Date.now() + 25000;

    const { data: rows, error } = await supabaseAdmin
      .from("media_backfill_queue")
      .select("url, storage_key")
      .eq("status", "pending")
      .limit(data.batchSize);
    if (error) throw new Error(error.message);

    const results = await Promise.all((rows ?? []).map((r) => processOne(r as any, SUPABASE_URL, deadline)));
    let uploaded = 0, failed = 0;
    const errors: Array<{ url: string; error: string }> = [];
    for (const r of results) {
      if (r.ok) uploaded++;
      else { failed++; errors.push({ url: r.url, error: r.err }); }
    }
    return { processed: rows?.length ?? 0, uploaded, failed, errors: errors.slice(0, 5) };
  });


// ---------- Rewrite via SQL: chunked endpoints ----------
export const rewriteSeoMetaSql = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await ensureStaff(supabase, userId);
    const { data, error } = await supabaseAdmin.rpc("rewrite_seo_meta_legacy");
    if (error) throw new Error(error.message);
    return (data ?? {}) as { og_updated?: number; tw_updated?: number; error?: string };
  });

export const rewritePostsInlineSql = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await ensureStaff(supabase, userId);
    const { data, error } = await supabaseAdmin.rpc("rewrite_posts_inline_legacy");
    if (error) throw new Error(error.message);
    return (data ?? {}) as { inline_updated?: number; error?: string };
  });

export const rewritePostsHtmlSqlChunk = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ limit: z.number().int().min(1).max(50).default(15) }).parse(input),
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await ensureStaff(supabase, userId);
    const { data: r, error } = await supabaseAdmin.rpc("rewrite_posts_html_legacy_chunk", { p_limit: data.limit });
    if (error) throw new Error(error.message);
    return (r ?? {}) as { updated?: number; remaining?: number; error?: string };
  });

// ---------- Rewrite posts: swap legacy URLs → Supabase URLs ----------
export const getRewriteStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await ensureStaff(supabase, userId);
    const { count: remaining } = await supabaseAdmin
      .from("posts")
      .select("id", { count: "exact", head: true })
      .ilike("content_html", "%everything-pr.com/wp-content/uploads/%");
    const { count: remainingInline } = await supabaseAdmin
      .from("posts")
      .select("id", { count: "exact", head: true })
      .ilike("first_inline_image", "%everything-pr.com/wp-content/uploads/%");
    const { count: remainingSeo } = await supabaseAdmin
      .from("seo_meta")
      .select("id", { count: "exact", head: true })
      .or("og_image.ilike.%everything-pr.com/wp-content/uploads/%,twitter_image.ilike.%everything-pr.com/wp-content/uploads/%");
    return { remaining: remaining ?? 0, remainingInline: remainingInline ?? 0, remainingSeo: remainingSeo ?? 0 };
  });

export const rewriteSeoBatch = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({
      batchSize: z.number().int().min(1).max(200).default(80),
      afterId: z.number().int().min(0).default(0),
    }).parse(input),
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await ensureStaff(supabase, userId);
    const SUPABASE_URL = process.env.EPR_SUPABASE_URL!;

    // Build URL → newUrl map from done queue.
    const map = new Map<string, string>();
    let off = 0;
    while (true) {
      const { data: rows, error } = await supabaseAdmin
        .from("media_backfill_queue").select("url, storage_key")
        .eq("status", "done").range(off, off + 999);
      if (error) throw new Error(error.message);
      if (!rows?.length) break;
      for (const r of rows) map.set(r.url, publicUrl(SUPABASE_URL, r.storage_key));
      if (rows.length < 1000) break;
      off += 1000;
    }
    if (map.size === 0) return { processed: 0, updated: 0, lastId: data.afterId };

    const { data: rows, error } = await supabaseAdmin
      .from("seo_meta")
      .select("id, og_image, twitter_image, raw")
      .gt("id", data.afterId)
      .or("og_image.ilike.%everything-pr.com/wp-content/uploads/%,twitter_image.ilike.%everything-pr.com/wp-content/uploads/%")
      .order("id", { ascending: true })
      .limit(data.batchSize);
    if (error) throw new Error(error.message);

    const replaceUrl = (s: string | null) => {
      if (!s) return s;
      const clean = normalizeUrl(s);
      return map.get(clean) ?? s;
    };
    const replaceInText = (txt: string) =>
      txt.replace(LEGACY_RE, (raw) => {
        const clean = normalizeUrl(raw);
        const trail = raw.slice(clean.length);
        const mapped = map.get(clean);
        return mapped ? mapped + trail : raw;
      });

    let updated = 0;
    let lastId = data.afterId;
    const updates: Promise<unknown>[] = [];
    for (const r of rows ?? []) {
      lastId = r.id;
      const patch: any = {};
      const newOg = replaceUrl(r.og_image);
      const newTw = replaceUrl(r.twitter_image);
      if (newOg !== r.og_image) patch.og_image = newOg;
      if (newTw !== r.twitter_image) patch.twitter_image = newTw;
      if (r.raw) {
        const txt = JSON.stringify(r.raw);
        const newTxt = replaceInText(txt);
        if (newTxt !== txt) {
          try { patch.raw = JSON.parse(newTxt); } catch {}
        }
      }
      if (Object.keys(patch).length > 0) {
        updates.push((async () => {
          const u = await supabaseAdmin.from("seo_meta").update(patch).eq("id", r.id);
          if (!u.error) updated++;
        })());
      }
    }
    await Promise.all(updates);
    return { processed: rows?.length ?? 0, updated, lastId, done: (rows?.length ?? 0) < data.batchSize };
  });

export const rewritePostsBatch = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({
      batchSize: z.number().int().min(1).max(200).default(80),
      afterId: z.number().int().min(0).default(0),
      withCount: z.boolean().default(false),
    }).parse(input),
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await ensureStaff(supabase, userId);

    const SUPABASE_URL = process.env.EPR_SUPABASE_URL!;
    const deadline = Date.now() + 24000;

    // Load full URL → storage_key map of all successfully migrated images.
    const map = new Map<string, string>();
    let off = 0;
    while (true) {
      const { data: rows, error } = await supabaseAdmin
        .from("media_backfill_queue")
        .select("url, storage_key")
        .eq("status", "done")
        .range(off, off + 999);
      if (error) throw new Error(error.message);
      if (!rows?.length) break;
      for (const r of rows) map.set(r.url, publicUrl(SUPABASE_URL, r.storage_key));
      if (rows.length < 1000) break;
      off += 1000;
    }
    if (map.size === 0) return { processed: 0, updated: 0, lastId: data.afterId, done: true, remaining: 0 };

    // Cursor scan by id — much faster than re-running ORed ilike + sort each call.
    const { data: posts, error: pErr } = await supabaseAdmin
      .from("posts")
      .select("id, content_html, first_inline_image")
      .gt("id", data.afterId)
      .or(
        "content_html.ilike.%everything-pr.com/wp-content/uploads/%,first_inline_image.ilike.%everything-pr.com/wp-content/uploads/%",
      )
      .order("id", { ascending: true })
      .limit(data.batchSize);
    if (pErr) throw new Error(pErr.message);

    const updates: Promise<unknown>[] = [];
    let updated = 0;
    let lastId = data.afterId;
    for (const p of posts ?? []) {
      lastId = p.id;
      if (Date.now() > deadline) break;
      let html = p.content_html ?? "";
      let inline = p.first_inline_image ?? null;
      const original = html;
      const originalInline = inline;

      html = html.replace(LEGACY_RE, (raw) => {
        const clean = normalizeUrl(raw);
        const trail = raw.slice(clean.length);
        const mapped = map.get(clean);
        return mapped ? mapped + trail : raw;
      });
      if (inline) {
        const clean = normalizeUrl(inline);
        const mapped = map.get(clean);
        if (mapped) inline = mapped;
      }

      if (html !== original || inline !== originalInline) {
        const patch: { content_html?: string; first_inline_image?: string | null } = {};
        if (html !== original) patch.content_html = html;
        if (inline !== originalInline) patch.first_inline_image = inline;
        updates.push(
          (async () => {
            const r = await supabaseAdmin.from("posts").update(patch).eq("id", p.id);
            if (!r.error) updated++;
          })(),
        );
      }
    }
    await Promise.all(updates);

    let remaining: number | null = null;
    if (data.withCount) {
      const { count } = await supabaseAdmin
        .from("posts")
        .select("id", { count: "exact", head: true })
        .or(
          "content_html.ilike.%everything-pr.com/wp-content/uploads/%,first_inline_image.ilike.%everything-pr.com/wp-content/uploads/%",
        );
      remaining = count ?? 0;
    }

    return {
      processed: posts?.length ?? 0,
      updated,
      lastId,
      done: (posts?.length ?? 0) < data.batchSize,
      remaining: remaining ?? -1,
    };
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
