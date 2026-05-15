import { createClient } from "@supabase/supabase-js";
import { writeFileSync, mkdirSync } from "fs";
import { dirname } from "path";

const supabase = createClient(process.env.EPR_SUPABASE_URL, process.env.EPR_SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });

const { data, error } = await supabase
  .from("posts")
  .select("id, slug, title, pillar_slug, pillar_index, article_type, featured_media_id")
  .eq("status", "draft").eq("type", "post").gt("featured_media_id", 0)
  .order("pillar_slug", { ascending: true, nullsFirst: false })
  .order("pillar_index", { ascending: true, nullsFirst: false })
  .order("id", { ascending: true });
if (error) { console.error(error); process.exit(1); }

const mediaIds = [...new Set(data.map(d => d.featured_media_id))];
const mediaUrls = {};
for (let i = 0; i < mediaIds.length; i += 200) {
  const { data: m } = await supabase.from("media").select("id,url").in("id", mediaIds.slice(i, i+200));
  m?.forEach(r => { mediaUrls[r.id] = r.url; });
}

const groups = {};
for (const r of data) {
  const k = r.pillar_slug || "(unaffiliated)";
  (groups[k] ??= []).push({ ...r, hero_url: mediaUrls[r.featured_media_id] });
}

const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
const ts = new Date().toISOString();
const total = data.length;

let html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Phase 3 Hero Review — ${ts}</title>
<style>
body{font:14px/1.4 -apple-system,sans-serif;margin:24px;color:#222;background:#fafafa}
h1{margin:0 0 4px}h2{margin:32px 0 8px;padding:8px 12px;background:#222;color:#fff;border-radius:4px;font-size:16px}
.meta{color:#666;margin-bottom:24px}
table{border-collapse:collapse;width:100%;background:#fff;margin-bottom:8px;box-shadow:0 1px 3px rgba(0,0,0,.05)}
td{padding:8px;border-bottom:1px solid #eee;vertical-align:top}
td.img{width:240px}
img{display:block;width:240px;height:auto;border-radius:4px;background:#eee}
.slug{font-family:ui-monospace,monospace;color:#0a6;font-size:12px;margin-bottom:4px}
.title{font-weight:600;margin-bottom:4px}
.tag{display:inline-block;font-size:11px;padding:2px 6px;border-radius:3px;background:#e5e7eb;color:#374151;margin-right:4px}
.warn{background:#fef3c7;color:#92400e}
.idx{font-size:11px;color:#888}
</style></head><body>
<h1>Phase 3 Hero Review</h1>
<div class="meta">Generated ${ts} · ${total} drafts pending publish flip · grouped by pillar_slug</div>`;

for (const [pillar, rows] of Object.entries(groups).sort()) {
  html += `\n<h2>${esc(pillar)} <span style="font-weight:400;opacity:.6">— ${rows.length} articles</span></h2>\n<table>\n`;
  for (const r of rows) {
    const skeleton = /^draft-\d+$/.test(r.slug);
    html += `<tr>
<td class="img">${r.hero_url ? `<img src="${esc(r.hero_url)}" loading="lazy" alt="">` : "<em>no hero</em>"}</td>
<td>
<div class="title">${esc(r.title)}</div>
<div class="slug">/${esc(r.slug)}/</div>
<span class="tag">id ${r.id}</span>
<span class="tag">${esc(r.article_type || "—")}</span>
${r.pillar_index != null ? `<span class="idx">pillar_index=${r.pillar_index}</span>` : ""}
${skeleton ? `<span class="tag warn">SKELETON SLUG — review before publish</span>` : ""}
</td></tr>\n`;
  }
  html += `</table>\n`;
}
html += `</body></html>`;

const out = "_lovable-migration/phase3-hero-review.html";
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, html);
const skeletons = data.filter(d => /^draft-\d+$/.test(d.slug));
console.log(`wrote ${out} :: ${(html.length/1024)|0}KB :: ${total} rows :: ${Object.keys(groups).length} groups :: ${skeletons.length} skeleton slugs`);
if (skeletons.length) console.log("skeleton ids:", skeletons.map(s => `${s.id}:${s.slug}`).join(", "));
