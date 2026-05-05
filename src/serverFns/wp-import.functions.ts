import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * WordPress REST API importer (sync only missing items).
 * - Driven by the `import_jobs` table (one batch per `tickImportJob` call).
 * - Pulls authors → categories → tags → media → posts → pages.
 * - Downloads featured images to the public `wp-media` Supabase Storage bucket.
 *
 * Required env: WP_BASE_URL (e.g. https://everything-pr.com), WP_USERNAME,
 * WP_APP_PASSWORD (WordPress application password).
 */

const STORAGE_BUCKET = "wp-media";
const PHASES = ["authors", "categories", "tags", "media", "posts", "pages", "done"] as const;
type Phase = (typeof PHASES)[number];

function wpAuthHeader() {
  const u = process.env.WP_USERNAME;
  const p = process.env.WP_APP_PASSWORD;
  if (!u || !p) throw new Error("WP_USERNAME / WP_APP_PASSWORD not configured");
  return "Basic " + Buffer.from(`${u}:${p}`).toString("base64");
}

function wpBase() {
  const b = process.env.WP_BASE_URL;
  if (!b) throw new Error("WP_BASE_URL not configured");
  return b.replace(/\/$/, "");
}

async function wpFetch(path: string) {
  const res = await fetch(`${wpBase()}/wp-json/wp/v2${path}`, {
    headers: { Authorization: wpAuthHeader(), "User-Agent": "everything-pr-importer" },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`WP ${path} → ${res.status} ${body.slice(0, 200)}`);
  }
  const total = Number(res.headers.get("x-wp-total") ?? 0);
  const totalPages = Number(res.headers.get("x-wp-totalpages") ?? 0);
  const data = await res.json();
  return { data, total, totalPages };
}

const stripHtml = (s: string) =>
  (s ?? "").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

const decodeEntities = (s: string) =>
  (s ?? "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&#8217;/g, "'").replace(/&#8211;/g, "–").replace(/&#8212;/g, "—").replace(/&hellip;/g, "…");

/** Require admin/editor staff for any mutation here. */
async function requireStaff(supabase: any, userId: string) {
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  const roles = (data ?? []).map((r: any) => r.role as string);
  if (!roles.some((r: string) => ["admin", "editor"].includes(r))) {
    throw new Error("forbidden: requires admin/editor");
  }
}

// ─────────────────────────────────────────────────────────────
// Public server fns
// ─────────────────────────────────────────────────────────────

export const startImportJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      downloadMedia: z.boolean().default(true),
      perPage: z.number().int().min(5).max(50).default(20),
    }).parse,
  )
  .handler(async ({ data, context }) => {
    await requireStaff(context.supabase, context.userId);

    // Quick credential sanity-check
    try {
      await wpFetch(`/users/me?context=edit`);
    } catch (e: any) {
      return { ok: false as const, error: `WP auth failed: ${e.message}` };
    }

    const { data: row, error } = await supabaseAdmin
      .from("import_jobs")
      .insert({
        status: "pending",
        phase: "authors",
        page: 1,
        per_page: data.perPage,
        download_media: data.downloadMedia,
        created_by: context.userId,
      })
      .select("id")
      .single();
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const, jobId: row.id };
  });

export const getImportJob = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ jobId: z.string().uuid() }).parse)
  .handler(async ({ data, context }) => {
    await requireStaff(context.supabase, context.userId);
    const { data: row, error } = await supabaseAdmin
      .from("import_jobs")
      .select("*")
      .eq("id", data.jobId)
      .single();
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const, job: row };
  });

export const getLatestImportJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireStaff(context.supabase, context.userId);
    const { data: row, error } = await supabaseAdmin
      .from("import_jobs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const, job: row };
  });

export const resumeImportJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ jobId: z.string().uuid(), perPage: z.number().int().min(5).max(50).optional() }).parse)
  .handler(async ({ data, context }) => {
    await requireStaff(context.supabase, context.userId);
    const update: any = { status: "running", completed_at: null };
    if (data.perPage) update.per_page = data.perPage;
    const { data: row, error } = await supabaseAdmin
      .from("import_jobs")
      .update(update)
      .eq("id", data.jobId)
      .select("*")
      .single();
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const, job: row };
  });

export const cancelImportJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ jobId: z.string().uuid() }).parse)
  .handler(async ({ data, context }) => {
    await requireStaff(context.supabase, context.userId);
    await supabaseAdmin
      .from("import_jobs")
      .update({ status: "cancelled", completed_at: new Date().toISOString() })
      .eq("id", data.jobId)
      .in("status", ["pending", "running"]);
    return { ok: true as const };
  });

export const tickImportJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ jobId: z.string().uuid() }).parse)
  .handler(async ({ data, context }) => {
    await requireStaff(context.supabase, context.userId);

    const { data: job, error: jErr } = await supabaseAdmin
      .from("import_jobs")
      .select("*")
      .eq("id", data.jobId)
      .single();
    if (jErr || !job) return { ok: false as const, error: jErr?.message ?? "job not found" };
    if (job.status === "completed" || job.status === "cancelled" || job.status === "failed") {
      return { ok: true as const, job };
    }

    const inserted: Record<string, number> = { ...(job.inserted as any) };
    const skipped: Record<string, number> = { ...(job.skipped as any) };
    const totals: Record<string, number> = { ...(job.totals as any) };
    const errors: Array<{ phase: string; message: string }> = Array.isArray(job.errors) ? [...(job.errors as any)] : [];
    const bumpInserted = (k: string, n = 1) => (inserted[k] = (inserted[k] ?? 0) + n);
    const bumpSkipped = (k: string, n = 1) => (skipped[k] = (skipped[k] ?? 0) + n);
    const setTotal = (k: string, n: number) => (totals[k] = n);

    let phase: Phase = job.phase as Phase;
    let page: number = job.page;
    let message = "";
    let done = false;

    try {
      if (phase === "authors") {
        // Only import users with the "author" role — skip subscribers/spammers.
        const { data: items, total, totalPages } = await wpFetch(`/users?per_page=${job.per_page}&page=${page}&context=edit&roles=author`);
        setTotal("authors", total);
        const ids = (items as any[]).map((x) => x.id);
        const { data: existing } = await supabaseAdmin.from("authors").select("id").in("id", ids);
        const have = new Set((existing ?? []).map((r: any) => r.id));
        const rows = (items as any[]).filter((x) => !have.has(x.id)).map((u) => ({
          id: u.id,
          slug: u.slug,
          display_name: decodeEntities(u.name) || u.slug,
          bio: u.description || null,
          avatar_url: u.avatar_urls?.["96"] ?? u.avatar_urls?.["48"] ?? null,
          website: u.url || null,
          email: u.email || null,
          social: {},
          post_count: 0,
        }));
        if (rows.length) {
          const { error } = await supabaseAdmin.from("authors").upsert(rows, { onConflict: "id" });
          if (error) throw new Error(`authors upsert: ${error.message}`);
          bumpInserted("authors", rows.length);
        }
        bumpSkipped("authors", (items as any[]).length - rows.length);
        message = `authors page ${page}/${totalPages || 1}: +${rows.length} new`;
        if (page >= (totalPages || 1) || (items as any[]).length === 0) {
          phase = "categories"; page = 1;
        } else page++;
      } else if (phase === "categories") {
        const { data: items, totalPages, total } = await wpFetch(`/categories?per_page=${job.per_page}&page=${page}&hide_empty=false`);
        setTotal("categories", total);
        const ids = (items as any[]).map((x) => x.id);
        const { data: existing } = await supabaseAdmin.from("categories").select("id").in("id", ids);
        const have = new Set((existing ?? []).map((r: any) => r.id));
        const rows = (items as any[]).filter((x) => !have.has(x.id)).map((c) => ({
          id: c.id, slug: c.slug, name: decodeEntities(c.name),
          description: c.description || null, post_count: c.count ?? 0,
          parent_id: c.parent && c.parent !== 0 ? c.parent : null,
        }));
        if (rows.length) {
          const { error } = await supabaseAdmin.from("categories").upsert(rows, { onConflict: "id" });
          if (error) throw new Error(`categories upsert: ${error.message}`);
          bumpInserted("categories", rows.length);
        }
        bumpSkipped("categories", (items as any[]).length - rows.length);
        message = `categories page ${page}/${totalPages || 1}: +${rows.length} new`;
        if (page >= (totalPages || 1) || (items as any[]).length === 0) { phase = "tags"; page = 1; }
        else page++;
      } else if (phase === "tags") {
        const { data: items, totalPages, total } = await wpFetch(`/tags?per_page=${job.per_page}&page=${page}&hide_empty=false`);
        setTotal("tags", total);
        const ids = (items as any[]).map((x) => x.id);
        const { data: existing } = await supabaseAdmin.from("tags").select("id").in("id", ids);
        const have = new Set((existing ?? []).map((r: any) => r.id));
        const rows = (items as any[]).filter((x) => !have.has(x.id)).map((t) => ({
          id: t.id, slug: t.slug, name: decodeEntities(t.name),
          description: t.description || null, post_count: t.count ?? 0,
        }));
        if (rows.length) {
          const { error } = await supabaseAdmin.from("tags").upsert(rows, { onConflict: "id" });
          if (error) throw new Error(`tags upsert: ${error.message}`);
          bumpInserted("tags", rows.length);
        }
        bumpSkipped("tags", (items as any[]).length - rows.length);
        message = `tags page ${page}/${totalPages || 1}: +${rows.length} new`;
        if (page >= (totalPages || 1) || (items as any[]).length === 0) { phase = "media"; page = 1; }
        else page++;
      } else if (phase === "media") {
        const { data: items, totalPages, total } = await wpFetch(`/media?per_page=${job.per_page}&page=${page}`);
        setTotal("media", total);
        const ids = (items as any[]).map((x) => x.id);
        const { data: existing } = await supabaseAdmin.from("media").select("id").in("id", ids);
        const have = new Set((existing ?? []).map((r: any) => r.id));
        const candidates = (items as any[]).filter((x) => !have.has(x.id));
        let added = 0;
        for (const m of candidates) {
          const sourceUrl: string | null = m.source_url ?? m.guid?.rendered ?? null;
          if (!sourceUrl) { bumpSkipped("media"); continue; }
          let finalUrl = sourceUrl;
          let storagePath: string | null = null;
          if (job.download_media) {
            try {
              const r = await fetch(sourceUrl);
              if (r.ok) {
                const ct = r.headers.get("content-type") ?? m.mime_type ?? "application/octet-stream";
                const buf = new Uint8Array(await r.arrayBuffer());
                const ext = (sourceUrl.split(".").pop() ?? "bin").split("?")[0].slice(0, 5);
                storagePath = `wp/${m.id}.${ext}`;
                const up = await supabaseAdmin.storage.from(STORAGE_BUCKET).upload(storagePath, buf, {
                  contentType: ct, upsert: true,
                });
                if (!up.error) {
                  const { data: pub } = supabaseAdmin.storage.from(STORAGE_BUCKET).getPublicUrl(storagePath);
                  finalUrl = pub.publicUrl;
                } else {
                  errors.push({ phase: "media", message: `upload ${m.id}: ${up.error.message}` });
                }
              }
            } catch (e: any) {
              errors.push({ phase: "media", message: `download ${m.id}: ${e.message}` });
            }
          }
          const { error } = await supabaseAdmin.from("media").upsert({
            id: m.id,
            url: finalUrl,
            storage_path: storagePath,
            filename: m.slug ?? null,
            title: decodeEntities(m.title?.rendered ?? "") || null,
            caption: decodeEntities(m.caption?.rendered ?? "") || null,
            alt_text: m.alt_text || null,
            mime_type: m.mime_type || null,
            width: m.media_details?.width ?? null,
            height: m.media_details?.height ?? null,
            filesize: m.media_details?.filesize ?? null,
            uploaded_at: m.date_gmt ? new Date(m.date_gmt + "Z").toISOString() : null,
          }, { onConflict: "id" });
          if (error) errors.push({ phase: "media", message: `media ${m.id}: ${error.message}` });
          else added++;
        }
        bumpInserted("media", added);
        bumpSkipped("media", (items as any[]).length - candidates.length);
        message = `media page ${page}/${totalPages || 1}: +${added} new`;
        if (page >= (totalPages || 1) || (items as any[]).length === 0) { phase = "posts"; page = 1; }
        else page++;
      } else if (phase === "posts" || phase === "pages") {
        const endpoint = phase === "posts" ? "posts" : "pages";
        const postType = phase === "posts" ? "post" : "page";
        const { data: items, totalPages, total } = await wpFetch(`/${endpoint}?per_page=${job.per_page}&page=${page}&status=publish,draft,future,private,pending&context=edit`);
        setTotal(phase, total);
        const ids = (items as any[]).map((x) => x.id);
        const { data: existing } = await supabaseAdmin.from("posts").select("id").in("id", ids);
        const have = new Set((existing ?? []).map((r: any) => r.id));
        const fresh = (items as any[]).filter((x) => !have.has(x.id));

        // Resolve author/category/tag/media maps for inserts
        const { data: existingAuthors } = await supabaseAdmin.from("authors").select("id");
        const authorIds = new Set((existingAuthors ?? []).map((r: any) => r.id as number));
        const { data: existingMedia } = await supabaseAdmin.from("media").select("id");
        const mediaIds = new Set((existingMedia ?? []).map((r: any) => r.id as number));

        let added = 0;
        const pcRows: { post_id: number; category_id: number }[] = [];
        const ptRows: { post_id: number; tag_id: number }[] = [];
        for (const p of fresh) {
          const html = p.content?.rendered ?? "";
          const title = decodeEntities(p.title?.rendered ?? "");
          let slug = (p.slug ?? "").toString().trim();
          if (!slug) slug = `wp-${p.id}`;
          const author_id = authorIds.has(p.author) ? p.author : null;
          const featured_media_id = p.featured_media && mediaIds.has(p.featured_media) ? p.featured_media : null;
          const status = ["publish", "draft", "pending", "private", "future", "trash"].includes(p.status) ? p.status : "publish";
          const { error } = await supabaseAdmin.from("posts").upsert({
            id: p.id,
            type: postType,
            status,
            slug,
            title,
            excerpt: decodeEntities(p.excerpt?.rendered ?? "") || null,
            content_html: html,
            content_text: stripHtml(html),
            author_id,
            featured_media_id,
            parent_id: p.parent && p.parent !== 0 ? p.parent : null,
            menu_order: p.menu_order ?? 0,
            published_at: p.date_gmt ? new Date(p.date_gmt + "Z").toISOString() : null,
            modified_at: p.modified_gmt ? new Date(p.modified_gmt + "Z").toISOString() : null,
          }, { onConflict: "id" });
          if (error) { errors.push({ phase, message: `${endpoint} ${p.id}: ${error.message}` }); continue; }
          added++;
          for (const cid of (p.categories ?? []) as number[]) pcRows.push({ post_id: p.id, category_id: cid });
          for (const tid of (p.tags ?? []) as number[]) ptRows.push({ post_id: p.id, tag_id: tid });
        }
        if (pcRows.length) {
          // Ensure category ids exist; filter to known
          const cids = [...new Set(pcRows.map((r) => r.category_id))];
          const { data: ec } = await supabaseAdmin.from("categories").select("id").in("id", cids);
          const known = new Set((ec ?? []).map((r: any) => r.id));
          const valid = pcRows.filter((r) => known.has(r.category_id));
          if (valid.length) await supabaseAdmin.from("post_categories").upsert(valid, { onConflict: "post_id,category_id" });
        }
        if (ptRows.length) {
          const tids = [...new Set(ptRows.map((r) => r.tag_id))];
          const { data: et } = await supabaseAdmin.from("tags").select("id").in("id", tids);
          const known = new Set((et ?? []).map((r: any) => r.id));
          const valid = ptRows.filter((r) => known.has(r.tag_id));
          if (valid.length) await supabaseAdmin.from("post_tags").upsert(valid, { onConflict: "post_id,tag_id" });
        }
        bumpInserted(phase, added);
        bumpSkipped(phase, (items as any[]).length - fresh.length);
        message = `${endpoint} page ${page}/${totalPages || 1}: +${added} new`;
        if (page >= (totalPages || 1) || (items as any[]).length === 0) {
          if (phase === "posts") { phase = "pages"; page = 1; }
          else { phase = "done"; done = true; }
        } else page++;
      }
    } catch (e: any) {
      errors.push({ phase, message: e.message ?? String(e) });
      await supabaseAdmin.from("import_jobs").update({
        status: "failed", last_message: e.message ?? String(e),
        errors, inserted, skipped, totals, completed_at: new Date().toISOString(),
      }).eq("id", job.id);
      return { ok: false as const, error: e.message ?? String(e) };
    }

    const update: any = {
      status: done ? "completed" : "running",
      phase, page,
      last_message: message,
      inserted, skipped, totals, errors,
    };
    if (done) update.completed_at = new Date().toISOString();
    const { data: updated } = await supabaseAdmin
      .from("import_jobs").update(update).eq("id", job.id).select("*").single();
    return { ok: true as const, job: updated };
  });
