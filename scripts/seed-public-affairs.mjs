// Phase 2a — Seed/upsert the 6 long-form Public Affairs pillar articles from
// data/public-affairs-source.md. Idempotent on slug.
//
// Behavior:
//   - Parses `PILLAR N — Title` blocks, blank-line-separated paragraphs.
//   - UPSERTs into `posts` with status='publish', type='post',
//     article_type='pillar', pillar_slug='public-affairs', pillar_index=N.
//   - Auto-links glossary terms (first occurrence per article only) and
//     cross-links sibling pillar articles.
//   - Pings IndexNow + purges Cloudflare cache for affected paths.
//
// Usage:
//   bun run scripts/seed-public-affairs.mjs           # full run
//   bun run scripts/seed-public-affairs.mjs --dry     # parse only, no writes
//   bun run scripts/seed-public-affairs.mjs --no-purge

import { readFileSync } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const ROOT = process.cwd();
const SOURCE = path.join(ROOT, "data/verticals/public-affairs-source.md");
const PILLAR_SLUG = "public-affairs";
const DRY = process.argv.includes("--dry");
const NO_PURGE = process.argv.includes("--no-purge");

const SUPABASE_URL =
  process.env.EPR_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  process.env.VITE_EPR_SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL;
const SERVICE_KEY =
  process.env.EPR_SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing SUPABASE_URL or service-role key in env.");
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function escapeHtml(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function paragraphsToHtml(paras) {
  return paras
    .map((p) => {
      const t = p.trim();
      if (!t) return "";
      // simple bullet list detection
      if (/^[-•]\s+/m.test(t) && t.split("\n").every((l) => /^[-•]\s+/.test(l.trim()) || !l.trim())) {
        const items = t
          .split("\n")
          .map((l) => l.replace(/^[-•]\s+/, "").trim())
          .filter(Boolean)
          .map((l) => `<li>${escapeHtml(l)}</li>`)
          .join("");
        return `<ul>${items}</ul>`;
      }
      return `<p>${escapeHtml(t).replace(/\n/g, "<br>")}</p>`;
    })
    .filter(Boolean)
    .join("\n");
}

function parseSource(md) {
  // Split on `PILLAR N — Title` headers
  const blocks = md.split(/^PILLAR\s+\d+\s+[—-]\s+/m).slice(1);
  const headerRe = /^(PILLAR\s+\d+\s+[—-]\s+)/m;
  // Re-find the headers to grab titles
  const headers = [...md.matchAll(/^PILLAR\s+(\d+)\s+[—-]\s+(.+)$/gm)];
  const out = [];
  for (let i = 0; i < headers.length; i++) {
    const idx = Number(headers[i][1]);
    const title = headers[i][2].trim();
    const start = headers[i].index + headers[i][0].length;
    const end = i + 1 < headers.length ? headers[i + 1].index : md.length;
    let body = md.slice(start, end).trim();
    // Extract `slug: ...` line
    const slugMatch = body.match(/^slug:\s*([a-z0-9-]+)\s*$/m);
    const slug = slugMatch ? slugMatch[1] : null;
    if (slugMatch) body = body.replace(slugMatch[0], "").trim();
    const paragraphs = body.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
    out.push({ index: idx, title, slug, paragraphs });
  }
  return out;
}

async function fetchGlossary() {
  const { data, error } = await sb
    .from("glossary_terms")
    .select("slug, title")
    .eq("published", true);
  if (error) throw error;
  // Sort longest-first so multi-word terms win over single-word substrings
  return (data ?? []).sort((a, b) => b.title.length - a.title.length);
}

function autoLinkGlossary(html, glossary, siblingSlugMap, selfSlug) {
  const usedGlossary = new Set();
  const usedSibling = new Set();
  let result = html;
  // Glossary: first occurrence per article only
  for (const term of glossary) {
    if (usedGlossary.has(term.slug)) continue;
    const escaped = term.title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`(?<![\\w-])(${escaped})(?![\\w-])(?![^<]*>)`, "i");
    if (re.test(result)) {
      result = result.replace(
        re,
        `<a href="/glossary/${term.slug}">$1</a>`,
      );
      usedGlossary.add(term.slug);
    }
  }
  // Siblings: first occurrence per sibling
  for (const [siblingTitle, siblingSlug] of Object.entries(siblingSlugMap)) {
    if (siblingSlug === selfSlug || usedSibling.has(siblingSlug)) continue;
    const escaped = siblingTitle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`(?<![\\w-])(${escaped})(?![\\w-])(?![^<]*>)`, "i");
    if (re.test(result)) {
      result = result.replace(re, `<a href="/${siblingSlug}">$1</a>`);
      usedSibling.add(siblingSlug);
    }
  }
  return { html: result, glossaryLinked: [...usedGlossary], siblingsLinked: [...usedSibling] };
}

async function purgePaths(paths) {
  if (NO_PURGE) return;
  const token = process.env.CLOUDFLARE_API_TOKEN;
  const zoneId = process.env.CLOUDFLARE_ZONE_ID;
  if (!token || !zoneId) {
    console.log("[purge] CF creds not set, skipping CDN purge.");
    return;
  }
  const hosts = [
    "https://everything-pr.com",
    "https://www.everything-pr.com",
    "https://everythingpr.lovable.app",
  ];
  const files = [];
  for (const h of hosts) for (const p of paths) {
    files.push(`${h}${p}`);
    if (!p.endsWith("/")) files.push(`${h}${p}/`);
  }
  for (let i = 0; i < files.length; i += 30) {
    const batch = files.slice(i, i + 30);
    try {
      const res = await fetch(
        `https://api.cloudflare.com/client/v4/zones/${zoneId}/purge_cache`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ files: batch }),
        },
      );
      if (!res.ok) console.warn("[purge] CF failed", res.status, await res.text());
    } catch (e) {
      console.warn("[purge] error", e);
    }
  }
}

async function pingIndexNow(urls) {
  if (NO_PURGE) return;
  const key = process.env.INDEXNOW_KEY;
  if (!key) {
    console.log("[indexnow] no INDEXNOW_KEY, skipping.");
    return;
  }
  try {
    const res = await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        host: "everything-pr.com",
        key,
        urlList: urls.map((u) => `https://everything-pr.com${u}`),
      }),
    });
    console.log("[indexnow]", res.status);
  } catch (e) {
    console.warn("[indexnow] error", e);
  }
}

async function main() {
  const md = readFileSync(SOURCE, "utf8");
  const articles = parseSource(md);
  if (articles.length !== 6) {
    console.warn(`[parse] expected 6 articles, got ${articles.length}`);
  }

  const siblingSlugMap = Object.fromEntries(
    articles.filter((a) => a.slug).map((a) => [a.title, a.slug]),
  );

  const glossary = await fetchGlossary();
  console.log(`[glossary] loaded ${glossary.length} terms`);

  const writtenPaths = ["/public-affairs", "/public-affairs/"];
  const writtenUrls = ["/public-affairs/"];
  let inserted = 0;
  let updated = 0;

  for (const a of articles) {
    if (!a.slug) {
      console.warn(`[skip] PILLAR ${a.index} ${a.title} missing slug`);
      continue;
    }
    const bodyHtml = paragraphsToHtml(a.paragraphs);
    const linked = autoLinkGlossary(bodyHtml, glossary, siblingSlugMap, a.slug);
    const excerpt = (a.paragraphs[0] || "").slice(0, 280);

    console.log(
      `[${a.slug}] paras=${a.paragraphs.length} chars=${linked.html.length} ` +
        `glossary=${linked.glossaryLinked.length} siblings=${linked.siblingsLinked.length}`,
    );

    if (DRY) continue;

    const { data: existing } = await sb
      .from("posts")
      .select("id")
      .eq("slug", a.slug)
      .maybeSingle();

    const row = {
      slug: a.slug,
      title: a.title,
      excerpt,
      content_html: linked.html,
      status: "publish",
      type: "post",
      article_type: "pillar",
      pillar_slug: PILLAR_SLUG,
      pillar_index: a.index,
      published_at: existing ? undefined : new Date().toISOString(),
      modified_at: new Date().toISOString(),
    };

    if (existing) {
      const { error } = await sb.from("posts").update(row).eq("id", existing.id);
      if (error) { console.error(`[update ${a.slug}]`, error); continue; }
      updated++;
    } else {
      const { error } = await sb.from("posts").insert(row);
      if (error) { console.error(`[insert ${a.slug}]`, error); continue; }
      inserted++;
    }
    writtenPaths.push(`/${a.slug}`);
    writtenUrls.push(`/${a.slug}/`);
  }

  console.log(`\n[done] inserted=${inserted} updated=${updated}`);

  if (!DRY && writtenPaths.length > 2) {
    await purgePaths(writtenPaths);
    await pingIndexNow(writtenUrls);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
