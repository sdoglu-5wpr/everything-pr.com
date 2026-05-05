/**
 * Everything-PR import script — reads `data/*.jsonl|json` and bulk-loads
 * into Supabase. Run locally with the service role key:
 *
 *   SUPABASE_URL=...                                    \
 *   SUPABASE_SERVICE_ROLE_KEY=...                       \
 *   bun run scripts/import-content.ts                   \
 *      [--data ./data] [--only authors,posts] [--truncate]
 *
 * Field mapping follows § 6.1 of LOVABLE-MIGRATION-PROMPT.md.
 * Streams JSONL line-by-line; batches inserts in chunks of 500.
 */
import { createReadStream, existsSync, readFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

// ---------- CLI ----------
const args = new Map<string, string>();
for (let i = 2; i < process.argv.length; i++) {
  const a = process.argv[i];
  if (a.startsWith("--")) {
    const k = a.slice(2);
    const v = process.argv[i + 1] && !process.argv[i + 1].startsWith("--") ? process.argv[++i] : "true";
    args.set(k, v);
  }
}
const DATA_DIR = resolve(args.get("data") ?? "./data");
const ONLY = (args.get("only") ?? "").split(",").map(s => s.trim()).filter(Boolean);
const TRUNCATE = args.get("truncate") === "true";
const BATCH = Number(args.get("batch") ?? 500);

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("✖ Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY env vars");
  process.exit(1);
}
const sb = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ---------- helpers ----------
const should = (name: string) => ONLY.length === 0 || ONLY.includes(name);
const log = (msg: string) => console.log(`  ${msg}`);
const head = (msg: string) => { badDatePhase = msg; console.log(`\n▶ ${msg}`); };

// ---------- referential-integrity tracking ----------
// The migration source is a months-old WordPress snapshot, so dangling FK refs
// (featured images, authors, parents) are expected. Rather than fail the import
// we collect the set of valid ids per-table during the media/authors/posts
// passes and null out any post FK that points at a missing target, logging
// the orphans for the record.
//
// Note on transactions: PostgREST (the layer Supabase JS talks to) executes
// each .upsert() as its own transaction — there is no way to wrap the whole
// import in a single BEGIN; SET CONSTRAINTS ALL DEFERRED; COMMIT;. Truncate
// is a separate phase from upserts already, so re-running with --truncate
// after a partial failure cleans up correctly.
const validMediaIds = new Set<number>();
const validAuthorIds = new Set<number>();
const validPostIds = new Set<number>();
const orphanFeaturedMedia = new Set<number>();
const orphanAuthors = new Set<number>();
const orphanParents = new Set<number>();

async function upsert<T extends Record<string, unknown>>(
  table: string,
  rows: T[],
  onConflict?: string,
) {
  if (rows.length === 0) return;
  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH);
    const q = sb.from(table).upsert(chunk as never, onConflict ? { onConflict } : undefined);
    const { error } = await q;
    if (error) {
      console.error(`✖ upsert ${table} [${i}..${i + chunk.length}]:`, error.message);
      throw error;
    }
  }
}

async function truncate(tables: string[]) {
  // Chunked delete avoids the default Postgres statement_timeout when a table
  // has hundreds of thousands of rows (e.g. ~181K orphan media). PostgREST
  // doesn't expose `SET LOCAL statement_timeout = 0`, so we page through ids.
  const CHUNK = 5000;
  for (const t of tables) {
    let total = 0;
    if (t === "post_categories" || t === "post_tags") {
      const { error } = await sb.from(t).delete().not("post_id", "is", null);
      if (error && !/does not exist/i.test(error.message))
        console.warn(`  truncate ${t}: ${error.message}`);
      continue;
    }
    while (true) {
      const { data, error: selErr } = await sb.from(t).select("id").limit(CHUNK);
      if (selErr) {
        if (!/does not exist/i.test(selErr.message))
          console.warn(`  truncate ${t} (select): ${selErr.message}`);
        break;
      }
      if (!data || data.length === 0) break;
      const ids = (data as { id: number | string }[]).map(r => r.id);
      const { error: delErr } = await sb.from(t).delete().in("id", ids);
      if (delErr) { console.warn(`  truncate ${t} (delete): ${delErr.message}`); break; }
      total += ids.length;
      if (ids.length < CHUNK) break;
    }
    if (total) console.log(`  truncated ${t}: ${total} rows`);
  }
}

async function* streamJsonl(path: string): AsyncGenerator<unknown> {
  if (!existsSync(path)) {
    console.warn(`  (skip) missing file: ${path}`);
    return;
  }
  const rl = createInterface({ input: createReadStream(path, "utf8"), crlfDelay: Infinity });
  for await (const line of rl) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try { yield JSON.parse(trimmed); } catch (e) {
      console.warn(`  parse error in ${path}:`, (e as Error).message);
    }
  }
}

function readJson<T>(path: string): T | null {
  if (!existsSync(path)) { console.warn(`  (skip) missing file: ${path}`); return null; }
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

const stripHtml = (html: string) =>
  html.replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();

const toBool = (v: unknown): boolean | null =>
  v === null || v === undefined ? null : v === 1 || v === "1" || v === true;

// Per-phase counter of bad date values coerced to NULL. Set the phase label
// at the top of each importer; coerceDate() / toIso() bumps it on bad input.
let badDatePhase = "global";
const badDateCounts = new Map<string, number>();
function bumpBadDate() {
  badDateCounts.set(badDatePhase, (badDateCounts.get(badDatePhase) ?? 0) + 1);
}

/** Coerce any incoming date value to an ISO string, or NULL.
 *  Handles WP placeholders like "0000-00-00 00:00:00", empty strings,
 *  the literal "null", non-strings, and unparseable values. */
function coerceDate(v: unknown): string | null {
  if (v == null) return null;
  if (typeof v !== "string") return null;
  const trimmed = v.trim();
  if (trimmed === "" || trimmed.toLowerCase() === "null" || trimmed.startsWith("0000")) {
    bumpBadDate();
    return null;
  }
  // Normalize "2009-01-07 13:41:24" → "2009-01-07T13:41:24Z" before parsing
  const m = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/);
  const candidate = m ? `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}Z` : trimmed;
  const d = new Date(candidate);
  if (isNaN(d.getTime())) { bumpBadDate(); return null; }
  return d.toISOString();
}
// Back-compat alias — every existing call site funnels through coerceDate now.
const toIso = coerceDate;

/** Dedupe an array of rows by a derived key. `pick(prev, next)` decides which
 *  row wins on collision; defaults to keeping the later row. Logs the number
 *  of dropped duplicates under `label` (always logs, even when zero, so each
 *  phase has an audit trail). */
function dedupeBy<T>(
  label: string,
  rows: T[],
  keyOf: (r: T) => string | number | null | undefined,
  pick: (prev: T, next: T) => T = (_p, n) => n,
): T[] {
  const seen = new Map<string | number, T>();
  let dropped = 0;
  for (const r of rows) {
    const k = keyOf(r);
    if (k == null) continue;
    const prev = seen.get(k);
    if (prev === undefined) { seen.set(k, r); continue; }
    seen.set(k, pick(prev, r));
    dropped++;
  }
  console.log(`  [${label}] ${dropped} duplicate ${dropped === 1 ? "row" : "rows"} dropped (kept best variant)`);
  return [...seen.values()];
}

// ---------- importers ----------
type AuthorJson = {
  id: number; username: string; slug: string; display_name: string;
  bio?: string; url?: string; twitter?: string | null; linkedin?: string | null;
  facebook?: string | null; instagram?: string | null; post_count: number;
};
async function importAuthors() {
  if (!should("authors")) return;
  head("authors");
  const j = readJson<{ data?: AuthorJson[] } | AuthorJson[]>(`${DATA_DIR}/authors.json`);
  const list = (Array.isArray(j) ? j : j?.data) ?? [];
  if (!list.length) return;
  const rows = list.map(a => ({
    id: a.id,
    slug: a.slug,
    display_name: a.display_name || a.username || a.slug,
    bio: a.bio || null,
    website: a.url || null,
    social: {
      twitter: a.twitter, linkedin: a.linkedin, facebook: a.facebook, instagram: a.instagram,
    },
    post_count: a.post_count ?? 0,
  }));
  const byId = dedupeBy("authors:id", rows, r => r.id);
  const bySlug = dedupeBy("authors:slug", byId, r => r.slug);
  await upsert("authors", bySlug, "id");
  for (const r of bySlug) validAuthorIds.add(r.id);
  log(`upserted ${bySlug.length}`);
}

type TaxJson = {
  data: { post_tag?: TaxTerm[]; category?: TaxTerm[] };
};
type TaxTerm = { term_id: number; name: string; slug: string; parent: number; count: number; description?: string };
async function importTaxonomies() {
  if (!should("taxonomies")) return;
  head("categories + tags");
  const j = readJson<TaxJson | { post_tag?: TaxTerm[]; category?: TaxTerm[] }>(`${DATA_DIR}/taxonomies.json`);
  const data = (j as TaxJson)?.data ?? (j as Record<string, TaxTerm[]>);
  const cats = data?.category ?? [];
  const tags = data?.post_tag ?? [];
  // Insert categories twice: first pass (no parents), second pass (with parents) so FK resolves
  const catRowsRaw = cats.map(c => ({
    id: c.term_id, slug: c.slug, name: c.name,
    description: c.description || null, post_count: c.count ?? 0, parent_id: null as number | null,
  }));
  const catById = dedupeBy("categories:id", catRowsRaw, r => r.id);
  const catRows = dedupeBy("categories:slug", catById, r => r.slug);
  await upsert("categories", catRows, "id");
  const withParents = cats
    .filter(c => c.parent && c.parent !== 0)
    .map(c => ({ id: c.term_id, slug: c.slug, name: c.name, parent_id: c.parent }));
  const withParentsDeduped = dedupeBy("categories(parents):id", withParents, r => r.id);
  if (withParentsDeduped.length) await upsert("categories", withParentsDeduped, "id");
  log(`upserted ${catRows.length} categories`);

  const tagRowsRaw = tags.map(t => ({
    id: t.term_id, slug: t.slug, name: t.name,
    description: t.description || null, post_count: t.count ?? 0,
  }));
  const tagById = dedupeBy("tags:id", tagRowsRaw, r => r.id);
  const tagRows = dedupeBy("tags:slug", tagById, r => r.slug);
  await upsert("tags", tagRows, "id");
  log(`upserted ${tagRows.length} tags`);
}

type AttachmentJson = {
  id: number; slug: string; title: string; excerpt?: string;
  guid?: string; date_published?: string;
  featured_image?: { url?: string; alt?: string } | null;
};
async function importAttachments() {
  if (!should("attachments")) return;
  head("media (attachments.jsonl)");
  let buf: Record<string, unknown>[] = [];
  let total = 0;
  for await (const r of streamJsonl(`${DATA_DIR}/attachments.jsonl`)) {
    const a = r as AttachmentJson;
    buf.push({
      id: a.id,
      url: a.guid ?? "",
      filename: a.slug,
      title: a.title || null,
      caption: a.excerpt || null,
      alt_text: null,
      uploaded_at: toIso(a.date_published),
    });
    validMediaIds.add(a.id);
    if (buf.length >= BATCH) { await upsert("media", buf, "id"); total += buf.length; buf = []; }
  }
  if (buf.length) { await upsert("media", buf, "id"); total += buf.length; }
  log(`upserted ${total}`);
}

async function importMediaManifest() {
  if (!should("media-manifest")) return;
  head("media (media-manifest.jsonl, orphans only)");
  // Only insert rows whose attachment_id is present and not seen by attachments.jsonl pass
  // Simpler: upsert by url with a synthesized id when attachment_id is null.
  let buf: Record<string, unknown>[] = [];
  let total = 0;
  let synth = -1;
  for await (const r of streamJsonl(`${DATA_DIR}/media-manifest.jsonl`)) {
    const m = r as { attachment_id: number | null; url: string; mime_type: string | null; size_bytes: number | null; alt: string | null; title: string | null; caption: string | null; uploaded: string | null };
    if (m.attachment_id) continue; // already inserted by attachments pass
    buf.push({
      id: synth--, // negative synthetic id for orphan files
      url: m.url, mime_type: m.mime_type, filesize: m.size_bytes,
      alt_text: m.alt, title: m.title, caption: m.caption, uploaded_at: toIso(m.uploaded),
    });
    if (buf.length >= BATCH) { await upsert("media", buf, "id"); total += buf.length; buf = []; }
  }
  if (buf.length) { await upsert("media", buf, "id"); total += buf.length; }
  log(`upserted ${total} orphan media rows`);
}

type PostJson = {
  id: number;
  type: "post" | "page" | "attachment";
  status: "publish" | "draft" | "pending" | "private" | "future" | "trash" | "inherit";
  slug: string;
  permalink: string;
  guid?: string;
  title: string;
  excerpt?: string;
  content: string;
  date_published: string;
  date_modified: string;
  author?: { id: number };
  parent?: number;
  menu_order?: number;
  comment_count?: number;
  categories?: { name: string; slug: string }[];
  tags?: { name: string; slug: string }[];
  primary_terms?: { taxonomy: string; term_id: number }[];
  featured_image?: { id?: number; url?: string; alt?: string } | null;
  seo?: {
    title?: string | null; description?: string | null; canonical?: string | null;
    focus_keyword?: string | null;
    robots_noindex?: number | null; robots_nofollow?: number | null;
    robots_noarchive?: number | null; robots_noimageindex?: number | null; robots_nosnippet?: number | null;
    open_graph?: { title?: string | null; description?: string | null; image?: string | null; image_id?: number | null } | null;
    twitter?: { title?: string | null; description?: string | null; image?: string | null; image_id?: number | null } | null;
    schema?: { page_type?: string | null; article_type?: string | null } | null;
    breadcrumb_title?: string | null;
    is_cornerstone?: number | null;
    estimated_reading_time_minutes?: number | null;
    incoming_link_count?: number | null;
    outgoing_link_count?: number | null;
  };
};

const VALID_STATUS = new Set(["publish", "draft", "pending", "private", "future", "trash"]);

/** Pre-scan all post-like jsonl files to collect ids — needed so parent_id
 *  references resolve across files (a post in posts.jsonl can have a parent
 *  defined in pages.jsonl, etc.). */
async function prescanPostIds(files: string[]) {
  head("pre-scan post ids");
  for (const file of files) {
    if (!existsSync(`${DATA_DIR}/${file}`)) continue;
    for await (const r of streamJsonl(`${DATA_DIR}/${file}`)) {
      const p = r as PostJson;
      if (p.type === "attachment") continue;
      if (typeof p.id === "number") validPostIds.add(p.id);
    }
  }
  log(`collected ${validPostIds.size} post ids`);
}

async function importPostsFile(file: string, defaultType: "post" | "page" = "post") {
  head(`posts (${file})`);
  const postsBuf: Record<string, unknown>[] = [];
  const seoBuf: Record<string, unknown>[] = [];
  const pcBuf: Record<string, unknown>[] = [];
  const ptBuf: Record<string, unknown>[] = [];
  // We need category/tag slug → id maps
  const { data: cats } = await sb.from("categories").select("id,slug");
  const { data: tags } = await sb.from("tags").select("id,slug");
  const catBySlug = new Map((cats ?? []).map(c => [c.slug as string, c.id as number]));
  const tagBySlug = new Map((tags ?? []).map(t => [t.slug as string, t.id as number]));

  let total = 0;
  let emptySlugCount = 0;
  const flush = async () => {
    if (postsBuf.length) {
      // Dedupe within batch by (type, slug), keep most recent modified_at, then highest id
      const byKey = new Map<string, Record<string, unknown>>();
      for (const row of postsBuf) {
        const key = `${row.type}::${row.slug}`;
        const prev = byKey.get(key);
        if (!prev) { byKey.set(key, row); continue; }
        const pm = (prev.modified_at as string | null) ?? "";
        const rm = (row.modified_at as string | null) ?? "";
        if (rm > pm || (rm === pm && (row.id as number) > (prev.id as number))) {
          byKey.set(key, row);
        }
      }
      await upsert("posts", [...byKey.values()], "type,slug");
      total += byKey.size;
    }
    if (seoBuf.length) await upsert("seo_meta", seoBuf, "url_path");
    if (pcBuf.length) await upsert("post_categories", pcBuf, "post_id,category_id");
    if (ptBuf.length) await upsert("post_tags", ptBuf, "post_id,tag_id");
    postsBuf.length = 0; seoBuf.length = 0; pcBuf.length = 0; ptBuf.length = 0;
  };

  for await (const r of streamJsonl(`${DATA_DIR}/${file}`)) {
    const p = r as PostJson;
    if (p.type === "attachment") continue;
    const status = VALID_STATUS.has(p.status) ? p.status : "publish";

    // Null-out-and-log every FK against a missing target. The source is a
    // months-old WP snapshot, so dangling refs (deleted media/authors/parents)
    // are expected.
    let featured_media_id: number | null = p.featured_image?.id ?? null;
    if (featured_media_id != null && !validMediaIds.has(featured_media_id)) {
      orphanFeaturedMedia.add(featured_media_id);
      featured_media_id = null;
    }
    let author_id: number | null = p.author?.id ?? null;
    if (author_id != null && !validAuthorIds.has(author_id)) {
      orphanAuthors.add(author_id);
      author_id = null;
    }
    let parent_id: number | null = p.parent && p.parent !== 0 ? p.parent : null;
    if (parent_id != null && !validPostIds.has(parent_id)) {
      orphanParents.add(parent_id);
      parent_id = null;
    }

    // WordPress drafts often have empty post_name. Synthesize a stable
    // slug from the id so the (type, slug) unique constraint holds.
    let slug = (typeof p.slug === "string" ? p.slug.trim() : "");
    if (!slug) {
      slug = `draft-${p.id}`;
      emptySlugCount++;
    }

    postsBuf.push({
      id: p.id,
      type: p.type === "page" ? "page" : defaultType,
      status,
      slug,
      title: p.title,
      excerpt: p.excerpt || null,
      content_html: p.content || "",
      content_text: stripHtml(p.content || ""),
      author_id,
      featured_media_id,
      parent_id,
      menu_order: p.menu_order ?? 0,
      published_at: toIso(p.date_published),
      modified_at: toIso(p.date_modified),
    });

    // SEO row keyed by url path "/<slug>/"
    const urlPath = `/${slug}/`;
    const seo = p.seo ?? {};
    seoBuf.push({
      object_type: p.type,
      object_id: p.id,
      url_path: urlPath,
      title: seo.title || null,
      description: seo.description || null,
      canonical_url: seo.canonical || null,
      robots: [
        toBool(seo.robots_noindex) ? "noindex" : "index",
        toBool(seo.robots_nofollow) ? "nofollow" : "follow",
      ].join(","),
      og_title: seo.open_graph?.title || null,
      og_description: seo.open_graph?.description || null,
      og_image: seo.open_graph?.image || null,
      og_type: p.type === "post" ? "article" : "website",
      twitter_card: "summary_large_image",
      twitter_title: seo.twitter?.title || null,
      twitter_description: seo.twitter?.description || null,
      twitter_image: seo.twitter?.image || null,
      schema_jsonld: null,
      breadcrumbs: null,
      raw: seo as unknown as Record<string, unknown>,
    });

    for (const c of p.categories ?? []) {
      const cid = catBySlug.get(c.slug);
      if (cid) pcBuf.push({ post_id: p.id, category_id: cid });
    }
    for (const t of p.tags ?? []) {
      const tid = tagBySlug.get(t.slug);
      if (tid) ptBuf.push({ post_id: p.id, tag_id: tid });
    }

    if (postsBuf.length >= BATCH) await flush();
  }
  await flush();
  if (emptySlugCount > 0) {
    log(`[${file}] ${emptySlugCount} rows had empty slugs, replaced with draft-{id}`);
  }
  log(`upserted ${total} ${defaultType}s`);
}

type RedirectJson = { source: string; target: string; code: number; regex: boolean; hits?: number; title?: string | null };
async function importRedirects() {
  if (!should("redirects")) return;
  head("redirects");
  const j = readJson<{ data?: RedirectJson[] } | RedirectJson[]>(`${DATA_DIR}/redirects.json`);
  const list = (Array.isArray(j) ? j : j?.data) ?? [];
  const rowsRaw = list.map(r => ({
    source_path: r.source,
    target_path: r.target,
    status_code: r.code ?? 301,
    is_regex: !!r.regex,
    enabled: true,
    hits: r.hits ?? 0,
    notes: r.title || null,
  }));
  // Prefer enabled=true on collision; else the row that came later (often
  // the higher Redirection-plugin id).
  const rows = dedupeBy(
    "redirects:source_path",
    rowsRaw,
    r => r.source_path,
    (prev, next) => (prev.enabled && !next.enabled ? prev : next),
  );
  await upsert("redirects", rows, "source_path");
  log(`upserted ${rows.length}`);
}

type MenuJson = { name: string; slug: string; tt_id: number; items: MenuItemJson[] };
type MenuItemJson = { id: number; title: string; url: string; menu_order: number; parent_item: number; type: string; object: string; object_id: string; target: string };
async function importMenus() {
  if (!should("menus")) return;
  head("menus + menu_items");
  const j = readJson<{ data?: MenuJson[] } | MenuJson[]>(`${DATA_DIR}/menus.json`);
  const list = (Array.isArray(j) ? j : j?.data) ?? [];
  const menusRaw = list.map(m => ({ id: m.tt_id, slug: m.slug, name: m.name, location: null }));
  const menusById = dedupeBy("menus:id", menusRaw, r => r.id);
  const menus = dedupeBy("menus:slug", menusById, r => r.slug);
  await upsert("menus", menus, "id");
  const itemsRaw: Record<string, unknown>[] = [];
  for (const m of list) {
    for (const it of m.items ?? []) {
      itemsRaw.push({
        id: it.id, menu_id: m.tt_id,
        parent_id: it.parent_item && it.parent_item !== 0 ? it.parent_item : null,
        position: it.menu_order ?? 0,
        label: it.title, url: it.url, target: it.target || null,
        object_type: it.object || it.type || null,
        object_id: it.object_id ? Number(it.object_id) || null : null,
      });
    }
  }
  const items = dedupeBy("menu_items:id", itemsRaw, r => r.id as number);
  await upsert("menu_items", items, "id");
  log(`upserted ${menus.length} menus, ${items.length} items`);
}

async function importInternalLinks() {
  if (!should("internal-links")) return;
  head("internal_links");
  let buf: Record<string, unknown>[] = [];
  let total = 0;
  let skippedSource = 0;
  let nulledTarget = 0;
  for await (const r of streamJsonl(`${DATA_DIR}/internal-links.jsonl`)) {
    const l = r as { source_post_id?: number; from_post_id?: number; target_url: string; target_post_id?: number; anchor?: string };
    const src = l.source_post_id ?? l.from_post_id;
    if (!src) continue;
    if (!validPostIds.has(src)) { skippedSource++; continue; }
    let target_post_id: number | null = l.target_post_id ?? null;
    if (target_post_id != null && !validPostIds.has(target_post_id)) {
      target_post_id = null; nulledTarget++;
    }
    buf.push({
      source_post_id: src,
      target_url: l.target_url,
      target_post_id,
      anchor_text: l.anchor ?? null,
    });
    if (buf.length >= BATCH) {
      const { error } = await sb.from("internal_links").insert(buf);
      if (error) throw error;
      total += buf.length; buf = [];
    }
  }
  if (buf.length) { const { error } = await sb.from("internal_links").insert(buf); if (error) throw error; total += buf.length; }
  log(`inserted ${total} (skipped ${skippedSource} w/ missing source, nulled ${nulledTarget} dangling targets)`);
}

// ---------- verify ----------
async function verifyCounts() {
  head("verify counts");
  const expected = readJson<{ data?: Record<string, number | Record<string, unknown>> }>(`${DATA_DIR}/counts.json`)?.data;
  if (!expected) { log("no counts.json — skipping verify"); return; }
  const checks: [string, () => Promise<number>, number][] = [
    ["posts (publish)", async () => count("posts", q => q.eq("status", "publish").eq("type", "post")), expected.posts_published as number],
    ["pages",           async () => count("posts", q => q.eq("type", "page")), expected.pages_published as number],
    ["authors",         async () => count("authors"), expected.authors_with_posts as number],
    ["categories",      async () => count("categories"), expected.categories as number],
    ["tags",            async () => count("tags"), expected.tags as number],
    ["redirects",       async () => count("redirects"), expected.redirects_active as number],
    ["menus",           async () => count("menus"), expected.menus as number],
    ["menu_items",      async () => count("menu_items"), expected.menu_items as number],
  ];
  for (const [label, fn, exp] of checks) {
    const got = await fn();
    const ok = got === exp;
    console.log(`  ${ok ? "✓" : "✗"} ${label}: got ${got}, expected ${exp}`);
  }
}
async function count(table: string, modify?: (q: ReturnType<typeof sb.from> extends { select: infer S } ? never : never) => unknown) {
  // Simple count via head: true
  const q = sb.from(table).select("*", { head: true, count: "exact" });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const built = modify ? (modify as any)(q) : q;
  const { count: c, error } = await built;
  if (error) { console.warn(`  count ${table}:`, error.message); return -1; }
  return c ?? 0;
}

// ---------- main ----------
(async () => {
  console.log(`Everything-PR import → ${SUPABASE_URL}`);
  console.log(`Data dir: ${DATA_DIR}`);
  if (TRUNCATE) {
    head("truncate");
    await truncate(["internal_links", "post_categories", "post_tags", "seo_meta", "posts", "media", "tags", "categories", "authors", "menu_items", "menus", "redirects"]);
  }
  await importAuthors();
  await importTaxonomies();
  await importAttachments();
  await importMediaManifest();
  await prescanPostIds(["posts.jsonl", "pages.jsonl", "posts-nonpublished.jsonl"]);
  if (should("posts"))           await importPostsFile("posts.jsonl", "post");
  if (should("pages"))           await importPostsFile("pages.jsonl", "page");
  if (should("posts-nonpub"))    await importPostsFile("posts-nonpublished.jsonl", "post");
  await importRedirects();
  await importMenus();
  await importInternalLinks();

  // Orphan-FK summary
  head("orphan FK summary");
  const fmt = (s: Set<number>) => [...s].sort((a, b) => a - b).join(", ") || "(none)";
  log(`featured_media_id nulled (${orphanFeaturedMedia.size} distinct): ${fmt(orphanFeaturedMedia)}`);
  log(`author_id nulled         (${orphanAuthors.size} distinct): ${fmt(orphanAuthors)}`);
  log(`parent_id nulled         (${orphanParents.size} distinct): ${fmt(orphanParents)}`);

  head("bad-date summary");
  if (badDateCounts.size === 0) {
    log("(no bad dates coerced)");
  } else {
    for (const [phase, n] of badDateCounts) log(`[${phase}] ${n} rows had bad dates coerced to NULL`);
  }

  await verifyCounts();
  console.log("\n✓ Import complete.");
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
