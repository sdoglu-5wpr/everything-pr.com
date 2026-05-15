// One-off: backfill posts.title for rows where seeders left a `Pillar N`
// placeholder. Re-parses the source markdown with smarter title detection:
//
//   1. Education pillar landings  → `**H1:** <title>` line (after the
//      `# Pillar N — slug: ...` block header)
//   2. Education cluster pillars  → `## CLUSTER X.Y — <title>` line
//   3. Real-estate pillar landings → first bold line `**<title>**`
//   4. Fallback                    → first `# <title>` H1 (existing behaviour)
//
// Idempotent. Safe to re-run.

import { readFileSync } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const ROOT = process.cwd();
const sb = createClient(
  process.env.EPR_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.EPR_SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

// Returns [{ slug, title }, ...] for every `# Pillar N — slug: ...` block in
// the file, using the smart title-detection rules above.
function extractPillarTitles(md) {
  const headers = [
    ...md.matchAll(/^#\s+Pillar\s+(\d+)\s+[—-]\s+slug:\s*([a-z0-9-]+)\s*$/gim),
  ];
  const out = [];
  for (let i = 0; i < headers.length; i++) {
    const slug = headers[i][2];
    const idx = Number(headers[i][1]);
    const start = headers[i].index + headers[i][0].length;
    const end = i + 1 < headers.length ? headers[i + 1].index : md.length;
    const body = md.slice(start, end).trim();

    let title = null;

    // Rule 1: **H1:** <title>
    const h1Line = body.match(/^\*\*H1:\*\*\s*(.+?)\s*$/m);
    if (h1Line) title = h1Line[1].trim();

    // Rule 2: ## CLUSTER X.Y — <title>
    if (!title) {
      const cluster = body.match(/^##\s+CLUSTER\s+\d+\.\d+\s+[—-]\s+(.+?)\s*$/m);
      if (cluster) title = cluster[1].trim();
    }

    // Rule 4 (fallback): # <title>  (single #) — but skip lines that look
    // like "# PILLAR N — ..." which are placeholder section markers, not real
    // titles. Real titles after a `# PILLAR N — UPPERCASE LABEL` block live
    // on a later **H1:** line which Rule 1 already caught.
    if (!title) {
      const lines = body.split("\n");
      for (const line of lines) {
        const m = line.match(/^#\s+(.+?)\s*$/);
        if (!m) continue;
        const candidate = m[1].trim();
        if (/^PILLAR\s+\d+\s+[—-]/i.test(candidate)) continue;
        title = candidate;
        break;
      }
    }

    // Rule 3 (real-estate landings): first bold line `**<title>**` that isn't
    // the URL or H1 marker.
    if (!title) {
      const bold = body.match(/^\*\*([^*\n][^*\n]*[^*\s])\*\*\s*$/m);
      if (bold) title = bold[1].trim();
    }

    if (!title) {
      console.warn(`[skip] no title found for slug=${slug} (Pillar ${idx})`);
      continue;
    }
    out.push({ slug, title, idx });
  }
  return out;
}

const SOURCES = [
  "data/verticals/education-source.md",
  "data/verticals/real-estate-source.md",
];

const allTitles = new Map(); // slug -> title
for (const rel of SOURCES) {
  const md = readFileSync(path.join(ROOT, rel), "utf8");
  const titles = extractPillarTitles(md);
  console.log(`[parse] ${rel}: extracted ${titles.length} titles`);
  for (const t of titles) {
    if (allTitles.has(t.slug) && allTitles.get(t.slug) !== t.title) {
      console.warn(`[dup] ${t.slug}: keeping first '${allTitles.get(t.slug)}' (ignoring '${t.title}')`);
      continue;
    }
    allTitles.set(t.slug, t.title);
  }
}

// Fetch all rows currently showing placeholder titles.
const { data: bad, error } = await sb
  .from("posts")
  .select("id, slug, title, pillar_slug")
  .like("title", "Pillar %");
if (error) { console.error(error); process.exit(1); }

const placeholderRe = /^Pillar \d+$/;
const targets = bad.filter((r) => placeholderRe.test(r.title));
console.log(`[fetch] ${targets.length} rows with placeholder title`);

let updated = 0, missing = 0;
for (const row of targets) {
  const newTitle = allTitles.get(row.slug);
  if (!newTitle) {
    console.warn(`[miss] no source title for slug=${row.slug} (id=${row.id}, pillar=${row.pillar_slug})`);
    missing++;
    continue;
  }
  const { error: e } = await sb
    .from("posts")
    .update({ title: newTitle, modified_at: new Date().toISOString() })
    .eq("id", row.id);
  if (e) { console.error(`[update id=${row.id}]`, e); continue; }
  console.log(`[ok] id=${row.id} ${row.slug} → "${newTitle}"`);
  updated++;
}

console.log(`\n[done] updated=${updated} missing=${missing} total=${targets.length}`);
