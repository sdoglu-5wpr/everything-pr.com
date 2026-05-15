// Phase 2i — Seed/upsert the 30 cluster articles under the Public Affairs
// vertical from data/verticals/public-affairs-clusters-source.md.
// Idempotent on slug. Drafts stay drafts.
//
// Cloned from scripts/seed-entertainment.mjs. Public-affairs-cluster-specific:
//   - Source uses BOLD-MARKER section format, not markdown # headers:
//       Pillar boundary: `**PILLAR N --- TITLE**` on its own line
//       Cluster boundary: `**X.Y Cluster Title**` on its own line
//     Inline `**bold**` inside paragraphs is preserved (renderInline → <strong>).
//   - SLUG_MAP resolves (pillarNum, clusterNum) → {slug, parent_id, pillar_index}.
//   - article_type='cluster' (distinguishes from Phase 2a pillar landings).
//   - parent_id set: 112705 (FARA, P1.1–1.20) / 112706 (Federal Lobbying, P2.1–2.10).
//   - All clusters share pillar_slug='public-affairs' (vertical convention).
//   - No post_categories link (matches pillar-landing convention).
//   - Slug rewrite: /public-affairs/<pillar>/<slug>/ and /public-affairs/<slug>/
//     → /<slug>/.
//   - Breadcrumb: Home › Public Affairs › Title; isPartOf → /public-affairs/.
//
// Usage:
//   bun run scripts/seed-public-affairs-clusters.mjs           # full run
//   bun run scripts/seed-public-affairs-clusters.mjs --dry     # parse only
//   bun run scripts/seed-public-affairs-clusters.mjs --no-purge

import { readFileSync } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const ROOT = process.cwd();
const SOURCE = path.join(ROOT, "data/verticals/public-affairs-clusters-source.md");
const PILLAR_SLUG_VERTICAL = "public-affairs";
const PILLAR_LABEL = "Public Affairs";
const ARTICLE_SECTION = "Public Affairs";
const EXPECTED_COUNT = 30;
const SITE_ORIGIN = "https://everything-pr.com";
const DRY = process.argv.includes("--dry");
const NO_PURGE = process.argv.includes("--no-purge");

// (pillarNum, clusterNum) → {slug, parent_id, pillar_index}.
// Mirrors the Phase 2i pre-stage rows (IDs 112897–112926).
const SLUG_MAP = {
  "1.1":  { slug: "what-fara-requires-2026",                       parent_id: 112705, pillar_index: 1 },
  "1.2":  { slug: "doj-fara-unit-enforcement-posture",             parent_id: 112705, pillar_index: 2 },
  "1.3":  { slug: "fara-filings-ai-assisted-research",             parent_id: 112705, pillar_index: 3 },
  "1.4":  { slug: "ai-research-registered-unregistered-work",      parent_id: 112705, pillar_index: 4 },
  "1.5":  { slug: "fara-filing-reputational-half-life",            parent_id: 112705, pillar_index: 5 },
  "1.6":  { slug: "fara-vs-lda-which-applies",                     parent_id: 112705, pillar_index: 6 },
  "1.7":  { slug: "manafort-precedent-fara",                       parent_id: 112705, pillar_index: 7 },
  "1.8":  { slug: "newsrooms-using-fara-data",                     parent_id: 112705, pillar_index: 8 },
  "1.9":  { slug: "defensive-communications-fara-scrutiny",        parent_id: 112705, pillar_index: 9 },
  "1.10": { slug: "opensecrets-propublica-foreign-lobby-watch",    parent_id: 112705, pillar_index: 10 },
  "1.11": { slug: "voluntary-fara-disclosure-strategy",            parent_id: 112705, pillar_index: 11 },
  "1.12": { slug: "fara-cohort-effect",                            parent_id: 112705, pillar_index: 12 },
  "1.13": { slug: "reading-fara-supplemental-statement",           parent_id: 112705, pillar_index: 13 },
  "1.14": { slug: "fara-inquiry-letter-crisis-comms",              parent_id: 112705, pillar_index: 14 },
  "1.15": { slug: "think-tank-disclosure-question",                parent_id: 112705, pillar_index: 15 },
  "1.16": { slug: "academic-foreign-funding-section-117",          parent_id: 112705, pillar_index: 16 },
  "1.17": { slug: "fara-adjacent-8-usc-951",                       parent_id: 112705, pillar_index: 17 },
  "1.18": { slug: "country-attention-fara-coverage",               parent_id: 112705, pillar_index: 18 },
  "1.19": { slug: "country-profile-foreign-principal-engagement",  parent_id: 112705, pillar_index: 19 },
  "1.20": { slug: "pre-engagement-diligence-checklist-fara",       parent_id: 112705, pillar_index: 20 },
  "2.1":  { slug: "lda-filing-cycle-reporters",                    parent_id: 112706, pillar_index: 1 },
  "2.2":  { slug: "k-street-power-structure-2026",                 parent_id: 112706, pillar_index: 2 },
  "2.3":  { slug: "lobbying-without-communications-underperforms", parent_id: 112706, pillar_index: 3 },
  "2.4":  { slug: "coalition-lobbying-earned-media-triangle",      parent_id: 112706, pillar_index: 4 },
  "2.5":  { slug: "trade-associations-coordinate-lobbying",        parent_id: 112706, pillar_index: 5 },
  "2.6":  { slug: "grassroots-grasstops-astroturf",                parent_id: 112706, pillar_index: 6 },
  "2.7":  { slug: "grasstops-engagement-federal-lobbying",         parent_id: 112706, pillar_index: 7 },
  "2.8":  { slug: "op-ed-placement-active-legislation",            parent_id: 112706, pillar_index: 8 },
  "2.9":  { slug: "congressional-hearing-preparation",             parent_id: 112706, pillar_index: 9 },
  "2.10": { slug: "witness-coaching-sworn-testimony",              parent_id: 112706, pillar_index: 10 },
};

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
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function slugifyHeading(text) {
  return text
    .toLowerCase()
    .replace(/&[a-z]+;/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 80);
}

function renderInline(s) {
  let out = escapeHtml(s);
  out = out.replace(
    /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g,
    (_m, text, url) => `<a href="${url}">${text}</a>`,
  );
  out = out.replace(/\[\*([^*\]]+)\*\]/g, "[<em>$1</em>]");
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, "$1<em>$2</em>");
  out = out.replace(/`([^`]+)`/g, "<code>$1</code>");
  return out;
}

function renderMarkdownTable(lines) {
  const rows = lines
    .filter((l) => /^\s*\|/.test(l))
    .map((l) => l.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim()));
  if (rows.length < 2) return null;
  const isAlignRow = rows[1].every((c) => /^:?-{3,}:?$/.test(c));
  const headerCells = rows[0];
  const bodyRows = isAlignRow ? rows.slice(2) : rows.slice(1);
  const thead = `<thead><tr>${headerCells.map((c) => `<th>${renderInline(c)}</th>`).join("")}</tr></thead>`;
  const tbody = `<tbody>${bodyRows.map((r) => `<tr>${r.map((c) => `<td>${renderInline(c)}</td>`).join("")}</tr>`).join("")}</tbody>`;
  return `<div class="table-wrap"><table>${thead}${tbody}</table></div>`;
}

// Lift legacy `**FAQ.**` blocks containing `*Q:*` / `*A:*` pairs into proper
// FAQ Q&A pairs. Returns { faqPairs, htmlAfter } where htmlAfter contains
// the rendered FAQ section.
function extractLegacyFaq(blocks) {
  const faqPairs = [];
  const cleaned = [];
  let inFaq = false;
  for (const block of blocks) {
    const trimmed = block.trim();
    if (/^\*\*FAQ\.?\*\*\s*$/i.test(trimmed)) {
      inFaq = true;
      continue;
    }
    if (inFaq) {
      // Parse alternating *Q:* ... *A:* ... within this block (or across blocks).
      // Match Q/A pairs in a single block, or accumulate across blocks.
      const qaRe = /\*Q:\*\s*([\s\S]+?)\s*\*A:\*\s*([\s\S]+?)(?=\*Q:\*|$)/g;
      let m;
      let matched = false;
      while ((m = qaRe.exec(trimmed)) !== null) {
        matched = true;
        faqPairs.push({ q: m[1].replace(/\s+/g, " ").trim(), a: m[2].replace(/\s+/g, " ").trim() });
      }
      if (matched) continue;
      // Stop FAQ mode if a non-FAQ paragraph appears (rare — FAQ usually trails).
      inFaq = false;
      cleaned.push(block);
      continue;
    }
    cleaned.push(block);
  }
  return { faqPairs, blocks: cleaned };
}

function blocksToHtml(blocks) {
  const out = [];
  const h2Anchors = [];
  let firstParaText = null;

  for (const blockRaw of blocks) {
    const block = blockRaw.replace(/\r/g, "").trimEnd();
    if (!block.trim()) continue;
    const lines = block.split("\n");

    const hMatch = lines[0].match(/^(#{2,4})\s+(.+)$/);
    if (hMatch && lines.length === 1) {
      const level = hMatch[1].length;
      const text = hMatch[2].trim();
      const id = slugifyHeading(text);
      const tag = `h${level}`;
      out.push(`<${tag} id="${id}">${renderInline(text)}</${tag}>`);
      if (level === 2) h2Anchors.push({ id, text });
      continue;
    }

    if (lines.every((l) => /^\s*\|/.test(l))) {
      const tbl = renderMarkdownTable(lines);
      if (tbl) { out.push(tbl); continue; }
    }

    if (lines.every((l) => /^>/.test(l))) {
      const inner = lines.map((l) => l.replace(/^>\s?/, "")).join(" ");
      out.push(`<blockquote>${renderInline(inner)}</blockquote>`);
      continue;
    }

    if (lines.every((l) => /^\s*[-•]\s+/.test(l))) {
      const items = lines.map((l) => `<li>${renderInline(l.replace(/^\s*[-•]\s+/, ""))}</li>`).join("");
      out.push(`<ul>${items}</ul>`);
      continue;
    }

    if (lines.every((l) => /^\s*\d+\.\s+/.test(l))) {
      const items = lines.map((l) => `<li>${renderInline(l.replace(/^\s*\d+\.\s+/, ""))}</li>`).join("");
      out.push(`<ol>${items}</ol>`);
      continue;
    }

    const paraText = lines.join(" ");
    if (!firstParaText) firstParaText = paraText.replace(/\*\*/g, "");
    out.push(`<p>${renderInline(paraText)}</p>`);
  }

  return { html: out.join("\n"), h2Anchors, firstParaText };
}

function buildSchemaJsonLd({ slug, title, excerpt, faqPairs }) {
  const url = `${SITE_ORIGIN}/${slug}/`;
  const graph = [
    {
      "@type": "Article",
      "@id": `${url}#article`,
      headline: title,
      description: excerpt,
      articleSection: ARTICLE_SECTION,
      mainEntityOfPage: { "@type": "WebPage", "@id": url },
      isPartOf: { "@type": "WebPage", "@id": `${SITE_ORIGIN}/${PILLAR_SLUG_VERTICAL}/` },
      author: { "@type": "Organization", name: "EPR Editorial Team", url: `${SITE_ORIGIN}/author/everything-pr-staff/` },
      publisher: { "@type": "Organization", name: "Everything PR" },
      speakable: {
        "@type": "SpeakableSpecification",
        cssSelector: ["h1", "article p:first-of-type"],
      },
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_ORIGIN}/` },
        { "@type": "ListItem", position: 2, name: PILLAR_LABEL, item: `${SITE_ORIGIN}/${PILLAR_SLUG_VERTICAL}/` },
        { "@type": "ListItem", position: 3, name: title, item: url },
      ],
    },
  ];
  if (faqPairs.length) {
    graph.push({
      "@type": "FAQPage",
      mainEntity: faqPairs.map((p) => ({
        "@type": "Question",
        name: p.q,
        acceptedAnswer: { "@type": "Answer", text: p.a },
      })),
    });
  }
  const block = { "@context": "https://schema.org", "@graph": graph };
  return `<script type="application/ld+json">${JSON.stringify(block)}</script>`;
}

// Bold-marker parser. Splits source on `**PILLAR N ---` lines to identify
// pillars, then within each pillar splits on `**X.Y Title**` cluster markers.
// Returns flat array of {pillarNum, clusterNum, title, slug, parent_id,
// pillar_index, blocks}.
function parseSource(md) {
  // Pillar boundaries (own line, opens with `**PILLAR N ---` or `**PILLAR N —`).
  const pillarRe = /^\*\*PILLAR\s+(\d+)\s+[-—–]+[^\n]*\*\*\s*$/gm;
  const pillarHeaders = [...md.matchAll(pillarRe)];
  if (pillarHeaders.length === 0) {
    console.warn("[parse] no pillar headers matched — check source format");
    return [];
  }

  const out = [];
  for (let pi = 0; pi < pillarHeaders.length; pi++) {
    const ph = pillarHeaders[pi];
    const pillarNum = Number(ph[1]);
    const pillarStart = ph.index + ph[0].length;
    const pillarEnd = pi + 1 < pillarHeaders.length ? pillarHeaders[pi + 1].index : md.length;
    const pillarBody = md.slice(pillarStart, pillarEnd);

    // Cluster boundaries within this pillar: own-line `**X.Y Title**`.
    // Anchored to start of line; must match the pillar number.
    const clusterRe = new RegExp(
      `^\\*\\*(${pillarNum})\\.(\\d+)\\s+([^\\n*][^\\n]*?)\\*\\*\\s*$`,
      "gm",
    );
    const clusterHeaders = [...pillarBody.matchAll(clusterRe)];
    if (clusterHeaders.length === 0) {
      console.warn(`[parse] pillar ${pillarNum}: no cluster headers matched`);
      continue;
    }

    for (let ci = 0; ci < clusterHeaders.length; ci++) {
      const ch = clusterHeaders[ci];
      const clusterNum = Number(ch[2]);
      const title = ch[3].trim();
      const key = `${pillarNum}.${clusterNum}`;
      const map = SLUG_MAP[key];
      if (!map) {
        console.warn(`[parse] no SLUG_MAP entry for ${key} (title=${title}) — skipping`);
        continue;
      }
      const start = ch.index + ch[0].length;
      const end = ci + 1 < clusterHeaders.length ? clusterHeaders[ci + 1].index : pillarBody.length;
      let body = pillarBody.slice(start, end).trim();
      // Strip trailing `---` rule.
      body = body.replace(/\n-{3,}\s*$/, "").trim();
      const blocks = body.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
      out.push({
        pillarNum, clusterNum, key, title,
        slug: map.slug, parent_id: map.parent_id, pillar_index: map.pillar_index,
        blocks,
      });
    }
  }
  return out;
}

async function fetchGlossary() {
  const { data, error } = await sb
    .from("glossary_terms")
    .select("slug, title")
    .eq("published", true);
  if (error) throw error;
  return (data ?? []).sort((a, b) => b.title.length - a.title.length);
}

function autoLinkGlossary(html, glossary, selfSlug) {
  const used = new Set();
  let result = html;
  for (const term of glossary) {
    if (term.slug === selfSlug) continue;
    if (used.has(term.slug)) continue;
    const escaped = term.title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`(?<![\\w-])(${escaped})(?![\\w-])(?![^<]*>)`, "i");
    if (re.test(result)) {
      result = result.replace(re, `<a href="/glossary/${term.slug}/">$1</a>`);
      used.add(term.slug);
    }
  }
  return { html: result, glossaryLinked: [...used] };
}

async function purgePaths(paths) {
  if (NO_PURGE) return;
  const token = process.env.CLOUDFLARE_API_TOKEN;
  const zoneId = process.env.CLOUDFLARE_ZONE_ID;
  if (!token || !zoneId) { console.log("[purge] CF creds not set, skipping."); return; }
  const hosts = [SITE_ORIGIN, "https://www.everything-pr.com", "https://everythingpr.lovable.app"];
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
        { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ files: batch }) },
      );
      if (!res.ok) console.warn("[purge] CF failed", res.status, await res.text());
    } catch (e) { console.warn("[purge] error", e); }
  }
}

function preCleanSource(md) {
  let out = md;
  out = out.replace(
    /\[\[(https?:\/\/[^\]\s]+)\]\{\.underline\}\]\((?:https?:\/\/[^)\s]+)\)/g,
    "$1",
  );
  out = out.replace(/\[([^\]]+)\]\{\.underline\}/g, "$1");
  out = out.replace(/\(file:\/\/+(\/[^)\s]*)\)/g, "($1)");
  out = out.replace(/\\([@#"$'])/g, "$1");
  return out;
}

async function main() {
  const md = preCleanSource(readFileSync(SOURCE, "utf8"));
  const articles = parseSource(md);
  if (articles.length !== EXPECTED_COUNT) {
    console.warn(`[parse] expected ${EXPECTED_COUNT} articles, got ${articles.length}`);
  }

  const glossary = await fetchGlossary();
  console.log(`[glossary] loaded ${glossary.length} terms`);

  const writtenPaths = [`/${PILLAR_SLUG_VERTICAL}`, `/${PILLAR_SLUG_VERTICAL}/`];
  let inserted = 0;
  let updated = 0;

  for (const a of articles) {
    // Lift legacy **FAQ.** Q/A blocks before block-rendering.
    const { faqPairs: legacyFaq, blocks: bodyBlocks } = extractLegacyFaq(a.blocks);
    const parsed = blocksToHtml(bodyBlocks);

    // Defensive slug rewrite: strip nested public-affairs URL prefixes so all
    // internal links resolve to flat `/<slug>/`.
    parsed.html = parsed.html
      .replace(/\/public-affairs\/[a-z0-9-]+\/([a-z0-9-]+)\/?(?=["')\s])/gi, "/$1/")
      .replace(/\/public-affairs\/([a-z0-9-]+)\/?(?=["')\s])/gi, "/$1/");

    const linked = autoLinkGlossary(parsed.html, glossary, a.slug);

    const autoExcerpt = (parsed.firstParaText || "")
      .replace(/[*_`>]/g, "").replace(/\s+/g, " ").trim().slice(0, 280);
    const excerpt = autoExcerpt;

    const faqPairs = legacyFaq;
    let finalHtml = linked.html;
    if (faqPairs.length) {
      const faqHtml = `<h2 id="faq">Frequently Asked Questions</h2>\n` +
        faqPairs.map((p) =>
          `<h3 id="${slugifyHeading(p.q)}">${renderInline(p.q)}</h3>\n<p>${renderInline(p.a)}</p>`
        ).join("\n");
      finalHtml = `${finalHtml}\n${faqHtml}`;
    }

    const schema = buildSchemaJsonLd({
      slug: a.slug, title: a.title, excerpt, faqPairs,
    });
    finalHtml = `${finalHtml}\n${schema}`;

    console.log(
      `[${a.key} ${a.slug}] blocks=${a.blocks.length} chars=${finalHtml.length} ` +
        `glossary=${linked.glossaryLinked.length} faq=${faqPairs.length} ` +
        `h2=${parsed.h2Anchors.length} parent=${a.parent_id} pi=${a.pillar_index}`,
    );

    if (DRY) continue;

    const { data: existing } = await sb
      .from("posts").select("id, status, parent_id, pillar_index").eq("slug", a.slug).maybeSingle();

    const row = {
      slug: a.slug,
      title: a.title,
      excerpt,
      content_html: finalHtml,
      type: "post",
      article_type: "cluster",
      pillar_slug: PILLAR_SLUG_VERTICAL,
      pillar_index: a.pillar_index,
      parent_id: a.parent_id,
      author_id: 1052,
      modified_at: new Date().toISOString(),
    };

    if (existing) {
      const { error } = await sb.from("posts").update(row).eq("id", existing.id);
      if (error) { console.error(`[update ${a.slug}]`, error); continue; }
      updated++;
    } else {
      const { data: maxRow } = await sb
        .from("posts").select("id").order("id", { ascending: false }).limit(1).maybeSingle();
      const newId = (maxRow?.id ?? 0) + 1;
      const { error } = await sb.from("posts").insert({
        ...row, id: newId, status: "draft",
      });
      if (error) { console.error(`[insert ${a.slug}]`, error); continue; }
      inserted++;
    }
    writtenPaths.push(`/${a.slug}`);
  }

  if (articles.length !== EXPECTED_COUNT) {
    console.warn(`[parse] expected ${EXPECTED_COUNT} articles, got ${articles.length}`);
  }
  console.log(`\n[done] inserted=${inserted} updated=${updated} (status unchanged — drafts stay drafts)`);

  if (!DRY && writtenPaths.length > 2) {
    await purgePaths([`/${PILLAR_SLUG_VERTICAL}`, `/${PILLAR_SLUG_VERTICAL}/`]);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
