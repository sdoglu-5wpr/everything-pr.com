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

const LEGACY_HOST_RE = /^https?:\/\/(?:www\.)?everything-pr\.com\//i;

/** Extract YYYY/MM/filename.ext from a wp-content/uploads URL. */
function extractUploadsPath(url: string): string | null {
  try {
    const u = new URL(url);
    const m = u.pathname.match(/\/wp-content\/uploads\/(.+)$/i);
    return m?.[1] ?? null;
  } catch {
    return null;
  }
}

function guessMime(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  return (
    {
      jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", gif: "image/gif",
      webp: "image/webp", svg: "image/svg+xml", avif: "image/avif", bmp: "image/bmp",
      ico: "image/x-icon", mp4: "video/mp4", webm: "video/webm", pdf: "application/pdf",
    } as Record<string, string>
  )[ext] ?? "application/octet-stream";
}

function publicUrl(supabaseUrl: string, key: string): string {
  return `${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/public/${BUCKET}/${key}`;
}

// ---------- Stats ----------
export const getMediaBackfillStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await ensureStaff(supabase, userId);

    const [{ count: total }, { count: done }, { count: pending }] = await Promise.all([
      supabaseAdmin.from("media").select("id", { count: "exact", head: true })
        .ilike("url", "%everything-pr.com/wp-content/uploads/%"),
      supabaseAdmin.from("media").select("id", { count: "exact", head: true })
        .not("storage_path", "is", null),
      supabaseAdmin.from("media").select("id", { count: "exact", head: true })
        .is("storage_path", null)
        .ilike("url", "%everything-pr.com/wp-content/uploads/%"),
    ]);

    return { total: total ?? 0, done: done ?? 0, pending: pending ?? 0 };
  });

// ---------- Batch processor ----------
export const runMediaBackfillBatch = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({
      batchSize: z.number().int().min(1).max(50).default(10),
    }).parse(input),
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await ensureStaff(supabase, userId);

    const SUPABASE_URL = process.env.EPR_SUPABASE_URL!;

    const { data: rows, error } = await supabaseAdmin
      .from("media")
      .select("id, url")
      .is("storage_path", null)
      .ilike("url", "%everything-pr.com/wp-content/uploads/%")
      .limit(data.batchSize);
    if (error) throw new Error(error.message);

    let uploaded = 0;
    let skipped = 0;
    let failed = 0;
    const errors: Array<{ id: number; url: string; error: string }> = [];

    for (const row of rows ?? []) {
      const url: string = row.url;
      const relPath = extractUploadsPath(url);
      if (!relPath) {
        skipped++;
        continue;
      }
      const storageKey = `wp-content/uploads/${relPath}`;
      const mime = guessMime(relPath);

      try {
        const res = await fetch(url, {
          headers: { "user-agent": "everything-pr-media-backfill/1.0" },
        });
        if (!res.ok) {
          failed++;
          errors.push({ id: row.id, url, error: `http_${res.status}` });
          continue;
        }
        const buf = new Uint8Array(await res.arrayBuffer());

        const { error: upErr } = await supabaseAdmin.storage
          .from(BUCKET)
          .upload(storageKey, buf, {
            contentType: res.headers.get("content-type") ?? mime,
            upsert: true,
          });
        if (upErr && !/exists/i.test(upErr.message)) {
          failed++;
          errors.push({ id: row.id, url, error: `upload:${upErr.message}` });
          continue;
        }

        const newUrl = publicUrl(SUPABASE_URL, storageKey);
        const { error: updErr } = await supabaseAdmin
          .from("media")
          .update({
            storage_path: storageKey,
            url: newUrl,
            mime_type: mime,
            filesize: buf.byteLength,
          })
          .eq("id", row.id);
        if (updErr) {
          failed++;
          errors.push({ id: row.id, url, error: `db:${updErr.message}` });
          continue;
        }
        uploaded++;
      } catch (e: any) {
        failed++;
        errors.push({ id: row.id, url, error: e?.message ?? "unknown" });
      }
    }

    return {
      processed: rows?.length ?? 0,
      uploaded,
      skipped,
      failed,
      errors: errors.slice(0, 5),
    };
  });
