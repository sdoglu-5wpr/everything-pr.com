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
async function processOne(row: { url: string; storage_key: string }, SUPABASE_URL: string, deadline: number) {
  const newUrl = publicUrl(SUPABASE_URL, row.storage_key);
  const mime = guessMime(row.storage_key);
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

    const { error: upErr } = await supabaseAdmin.storage.from(BUCKET).upload(row.storage_key, buf, {
      contentType: res.headers.get("content-type") ?? mime, upsert: true,
    });
    if (upErr && !/exists/i.test(upErr.message)) throw new Error(`upload:${upErr.message}`);

    await Promise.all([
      supabaseAdmin.from("media").update({
        storage_path: row.storage_key, url: newUrl, mime_type: mime, filesize: buf.byteLength,
      }).eq("url", row.url),
      supabaseAdmin.from("posts").update({ first_inline_image: newUrl }).eq("first_inline_image", row.url),
      supabaseAdmin.from("media_backfill_queue").update({
        status: "done", bytes: buf.byteLength, last_error: null, updated_at: new Date().toISOString(),
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
    z.object({ batchSize: z.number().int().min(1).max(10).default(5) }).parse(input),
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await ensureStaff(supabase, userId);

    const SUPABASE_URL = process.env.EPR_SUPABASE_URL!;
    const deadline = Date.now() + 22000; // stay under 30s edge timeout

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
    return { remaining: remaining ?? 0, remainingInline: remainingInline ?? 0 };
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
          supabaseAdmin.from("posts").update(patch).eq("id", p.id).then((r) => {
            if (!r.error) updated++;
          }),
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
