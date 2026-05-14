// Phase 2c — Seed/upsert the 7 long-form Defense pillar articles from
// data/verticals/defense-source.md. Idempotent on slug.
//
// Cloned from scripts/seed-legal.mjs with these defense-specific additions:
//   - Parses a leading `**Tags:** tag1 · tag2 · tag3` line into raw tags
//     stored at the top of content_html as a hidden <meta> comment for now
//     (no taxonomy table yet — flagged for Phase 2c-tags follow-up).
//   - Auto-detects mentions of named defense companies in the body and
//     emits Organization entities in the JSON-LD @graph (sameAs → wiki).
//   - Adds SpeakableSpecification pointing at the H1 + first paragraph for
//     AI-readable summaries.
//   - Article schema: articleSection="Defense & Defense-Tech",
//     isPartOf → /defense/. Breadcrumbs Home › Defense › Title.
//   - DOES NOT flip status to publish — leaves rows as draft until image
//     batch lands. content_html, excerpt, modified_at are updated.
//
// Usage:
//   bun run scripts/seed-defense.mjs           # full run, drafts stay drafts
//   bun run scripts/seed-defense.mjs --dry     # parse only, no writes
//   bun run scripts/seed-defense.mjs --no-purge

import { readFileSync } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const ROOT = process.cwd();
const SOURCE = path.join(ROOT, "data/verticals/defense-source.md");
const PILLAR_SLUG = "defense";
const PILLAR_LABEL = "Defense";
const ARTICLE_SECTION = "Defense & Defense-Tech";
const CATEGORY_ID = 27956;
const SITE_ORIGIN = "https://everything-pr.com";
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

// Defense entity → Organization JSON-LD lookup. Match is case-insensitive on
// the canonical name; first-mention auto-injects the entity into the @graph.
const DEFENSE_ORGS = [
  { name: "Anduril Industries", aliases: ["Anduril"], sameAs: ["https://en.wikipedia.org/wiki/Anduril_Industries"] },
  { name: "Palantir Technologies", aliases: ["Palantir"], sameAs: ["https://en.wikipedia.org/wiki/Palantir_Technologies"] },
  { name: "Shield AI", aliases: [], sameAs: ["https://en.wikipedia.org/wiki/Shield_AI"] },
  { name: "Helsing", aliases: [], sameAs: ["https://en.wikipedia.org/wiki/Helsing_(company)"] },
  { name: "Skydio", aliases: [], sameAs: ["https://en.wikipedia.org/wiki/Skydio"] },
  { name: "Saronic", aliases: [], sameAs: [] },
  { name: "Hadrian", aliases: [], sameAs: [] },
  { name: "SpaceX", aliases: [], sameAs: ["https://en.wikipedia.org/wiki/SpaceX"] },
  { name: "Lockheed Martin", aliases: [], sameAs: ["https://en.wikipedia.org/wiki/Lockheed_Martin"] },
  { name: "RTX", aliases: ["Raytheon Technologies", "Raytheon"], sameAs: ["https://en.wikipedia.org/wiki/RTX_Corporation"] },
  { name: "Northrop Grumman", aliases: [], sameAs: ["https://en.wikipedia.org/wiki/Northrop_Grumman"] },
  { name: "General Dynamics", aliases: [], sameAs: ["https://en.wikipedia.org/wiki/General_Dynamics"] },
  { name: "Boeing Defense", aliases: ["Boeing Defense, Space & Security"], sameAs: ["https://en.wikipedia.org/wiki/Boeing_Defense,_Space_%26_Security"] },
  { name: "BAE Systems", aliases: [], sameAs: ["https://en.wikipedia.org/wiki/BAE_Systems"] },
  { name: "L3Harris", aliases: ["L3Harris Technologies"], sameAs: ["https://en.wikipedia.org/wiki/L3Harris_Technologies"] },
  { name: "Booz Allen Hamilton", aliases: ["Booz Allen"], sameAs: ["https://en.wikipedia.org/wiki/Booz_Allen_Hamilton"] },
  { name: "Leidos", aliases: [], sameAs: ["https://en.wikipedia.org/wiki/Leidos"] },
  { name: "Rebellion Defense", aliases: [], sameAs: [] },
  { name: "Vannevar Labs", aliases: [], sameAs: [] },
  { name: "Mach Industries", aliases: [], sameAs: [] },
];

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

function blocksToHtml(blocks) {
  const out = [];
  const faqPairs = [];
  const h2Anchors = [];
  let inSourcesSection = false;
  let inFaqSection = false;
  let tagsRaw = null;
  let pendingFaqQuestion = null;
  let firstParaText = null;

  for (const blockRaw of blocks) {
    const block = blockRaw.replace(/\r/g, "").trimEnd();
    if (!block.trim()) continue;
    const lines = block.split("\n");

    // Tags line: **Tags:** tag1 · tag2 · tag3 (single line, near top)
    if (!tagsRaw) {
      const tagMatch = block.match(/^\*\*Tags:\*\*\s*(.+)$/);
      if (tagMatch && lines.length === 1) {
        tagsRaw = tagMatch[1].trim();
        out.push(`<!-- tags-raw: ${escapeHtml(tagsRaw)} -->`);
        out.push(
          `<p class="article-tags"><span class="tags-label">Tags:</span> ${renderInline(tagsRaw)}</p>`,
        );
        continue;
      }
    }

    const hMatch = lines[0].match(/^(#{2,4})\s+(.+)$/);
    if (hMatch && lines.length === 1) {
      const level = hMatch[1].length;
      const text = hMatch[2].trim();
      const id = slugifyHeading(text);
      if (level === 2 && /^(faq|frequently asked|common questions)/i.test(text)) {
        inFaqSection = true; inSourcesSection = false;
        pendingFaqQuestion = null;
        out.push(`<h2 id="${id}">${renderInline(text)}</h2>`);
        h2Anchors.push({ id, text }); continue;
      }
      if (level === 2 && /^sources\b/i.test(text)) {
        inSourcesSection = true; inFaqSection = false;
        pendingFaqQuestion = null;
        out.push(`<h2 id="${id}">${renderInline(text)}</h2>`);
        h2Anchors.push({ id, text }); continue;
      }
      if (inFaqSection && level === 3) {
        pendingFaqQuestion = text;
        out.push(`<h3 id="${id}">${renderInline(text)}</h3>`);
        continue;
      }
      if (level === 2) { inFaqSection = false; pendingFaqQuestion = null; }
      inSourcesSection = false;
      const tag = `h${level}`;
      out.push(`<${tag} id="${id}">${renderInline(text)}</${tag}>`);
      if (level === 2) h2Anchors.push({ id, text });
      continue;
    }

    if (lines.every((l) => /^\s*\|/.test(l))) {
      const tbl = renderMarkdownTable(lines);
      if (tbl) { out.push(tbl); continue; }
    }

    const defMatch = block.match(/^>\s*\*\*Definition\s*[—-]\s*([^:*]+?):\*\*\s*([\s\S]+)$/);
    if (defMatch) {
      const term = defMatch[1].trim();
      const body = defMatch[2].replace(/\n>\s?/g, "\n").trim();
      out.push(
        `<div class="definition-box">` +
          `<span class="definition-label">Definition</span>` +
          `<span class="definition-term">${renderInline(term)}</span>` +
          `<p class="definition-body">${renderInline(body)}</p>` +
          `</div>`,
      );
      continue;
    }

    const pqMatch = block.match(/^>\s*\*\*([\s\S]+?)\*\*\s*$/);
    if (pqMatch) {
      out.push(`<blockquote class="pull-quote">${renderInline(pqMatch[1])}</blockquote>`);
      continue;
    }

    if (lines.every((l) => /^>/.test(l))) {
      const inner = lines.map((l) => l.replace(/^>\s?/, "")).join(" ");
      out.push(`<blockquote>${renderInline(inner)}</blockquote>`);
      continue;
    }

    if (lines.every((l) => /^\s*[-•]\s+/.test(l))) {
      if (inSourcesSection) {
        const items = lines
          .map((l) => {
            const item = l.replace(/^\s*[-•]\s+/, "");
            const linkM = item.match(/^\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)(.*)$/);
            if (linkM) {
              return `<li><a href="${linkM[2]}" target="_blank" rel="noopener nofollow">${renderInline(linkM[1])}</a>${renderInline(linkM[3])}</li>`;
            }
            return `<li>${renderInline(item)}</li>`;
          }).join("");
        out.push(`<ul class="sources-list">${items}</ul>`);
        continue;
      }
      const items = lines.map((l) => `<li>${renderInline(l.replace(/^\s*[-•]\s+/, ""))}</li>`).join("");
      out.push(`<ul>${items}</ul>`);
      continue;
    }

    if (lines.every((l) => /^\s*\d+\.\s+/.test(l))) {
      const items = lines.map((l) => `<li>${renderInline(l.replace(/^\s*\d+\.\s+/, ""))}</li>`).join("");
      out.push(`<ol>${items}</ol>`);
      continue;
    }

    if (inFaqSection) {
      const qm = lines[0].match(/^\*\*([\s\S]+?\?)\*\*\s*$/);
      if (qm) {
        const q = qm[1].trim();
        const aText = lines.slice(1).join(" ").trim();
        faqPairs.push({ q, a: aText });
        out.push(`<p><strong>${renderInline(q)}</strong></p>`);
        if (aText) out.push(`<p>${renderInline(aText)}</p>`);
        continue;
      }
    }

    // Default paragraph — capture first one for SpeakableSpecification + excerpt.
    const paraText = lines.join(" ");
    if (!firstParaText) firstParaText = paraText;
    if (pendingFaqQuestion) {
      faqPairs.push({ q: pendingFaqQuestion, a: paraText });
      pendingFaqQuestion = null;
    }
    out.push(`<p>${renderInline(paraText)}</p>`);
  }

  return { html: out.join("\n"), faqPairs, h2Anchors, tagsRaw, firstParaText };
}

function detectOrgs(html) {
  const found = [];
  const seen = new Set();
  const lower = html.toLowerCase();
  for (const org of DEFENSE_ORGS) {
    const candidates = [org.name, ...org.aliases];
    for (const c of candidates) {
      if (lower.includes(c.toLowerCase())) {
        if (!seen.has(org.name)) {
          seen.add(org.name);
          const node = { "@type": "Organization", name: org.name };
          if (org.sameAs.length) node.sameAs = org.sameAs;
          found.push(node);
        }
        break;
      }
    }
  }
  return found;
}

function buildSchemaJsonLd({ slug, title, excerpt, faqPairs, orgs }) {
  const url = `${SITE_ORIGIN}/${slug}/`;
  const graph = [
    {
      "@type": "Article",
      "@id": `${url}#article`,
      headline: title,
      description: excerpt,
      articleSection: ARTICLE_SECTION,
      mainEntityOfPage: { "@type": "WebPage", "@id": url },
      isPartOf: { "@type": "WebPage", "@id": `${SITE_ORIGIN}/${PILLAR_SLUG}/` },
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
        { "@type": "ListItem", position: 2, name: PILLAR_LABEL, item: `${SITE_ORIGIN}/${PILLAR_SLUG}/` },
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
  if (orgs.length) graph.push(...orgs);
  const block = { "@context": "https://schema.org", "@graph": graph };
  return `<script type="application/ld+json">${JSON.stringify(block)}</script>`;
}

function parseSource(md) {
  const headers = [
    ...md.matchAll(/^#\s+Pillar\s+(\d+)\s+[—-]\s+slug:\s*([a-z0-9-]+)\s*$/gim),
  ];
  const out = [];
  for (let i = 0; i < headers.length; i++) {
    const idx = Number(headers[i][1]);
    const slug = headers[i][2];
    const start = headers[i].index + headers[i][0].length;
    const end = i + 1 < headers.length ? headers[i + 1].index : md.length;
    let body = md.slice(start, end).trim();
    const titleMatch = body.match(/^#\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1].trim() : `Pillar ${idx}`;
    if (titleMatch) body = body.replace(titleMatch[0], "").trim();
    body = body.replace(/\n-{3,}\s*$/, "").trim();
    const blocks = body.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
    out.push({ index: idx, title, slug, blocks });
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

async function main() {
  const md = readFileSync(SOURCE, "utf8");
  const articles = parseSource(md);
  if (articles.length !== 7) {
    console.warn(`[parse] expected 7 articles, got ${articles.length}`);
  }

  const glossary = await fetchGlossary();
  console.log(`[glossary] loaded ${glossary.length} terms`);

  const writtenPaths = [`/${PILLAR_SLUG}`, `/${PILLAR_SLUG}/`];
  let inserted = 0;
  let updated = 0;

  for (const a of articles) {
    if (!a.slug) { console.warn(`[skip] PILLAR ${a.index} missing slug`); continue; }
    const parsed = blocksToHtml(a.blocks);
    // Slug rewrite: /defense/pillars/[slug]/ → /[slug]/ (flat URL convention).
    // Preserve /defense/ as the vertical index URL.
    parsed.html = parsed.html.replace(/\/defense\/pillars\/([a-z0-9-]+)\/?/gi, "/$1/");
    const linked = autoLinkGlossary(parsed.html, glossary, a.slug);
    const excerpt = (parsed.firstParaText || "")
      .replace(/[*_`>]/g, "").replace(/\s+/g, " ").trim().slice(0, 280);
    const orgs = detectOrgs(linked.html);
    const schema = buildSchemaJsonLd({
      slug: a.slug, title: a.title, excerpt,
      faqPairs: parsed.faqPairs, orgs,
    });
    const finalHtml = `${linked.html}\n${schema}`;

    console.log(
      `[${a.slug}] blocks=${a.blocks.length} chars=${finalHtml.length} ` +
        `glossary=${linked.glossaryLinked.length} faq=${parsed.faqPairs.length} ` +
        `h2=${parsed.h2Anchors.length} orgs=${orgs.length} tags=${parsed.tagsRaw ? "yes" : "no"}`,
    );

    if (DRY) continue;

    const { data: existing } = await sb
      .from("posts").select("id, status").eq("slug", a.slug).maybeSingle();

    // CRITICAL: drafts stay drafts. Image batch (Phase 3) flips to publish.
    const row = {
      slug: a.slug,
      title: a.title,
      excerpt,
      content_html: finalHtml,
      type: "post",
      article_type: "pillar",
      pillar_slug: PILLAR_SLUG,
      pillar_index: a.index,
      author_id: 1052,
      modified_at: new Date().toISOString(),
    };

    if (existing) {
      const { error } = await sb.from("posts").update(row).eq("id", existing.id);
      if (error) { console.error(`[update ${a.slug}]`, error); continue; }
      await sb.from("post_categories").upsert(
        { post_id: existing.id, category_id: CATEGORY_ID },
        { onConflict: "post_id,category_id" },
      );
      updated++;
    } else {
      const { data: maxRow } = await sb
        .from("posts").select("id").order("id", { ascending: false }).limit(1).maybeSingle();
      const newId = (maxRow?.id ?? 0) + 1;
      const { error } = await sb.from("posts").insert({
        ...row, id: newId, status: "draft",
      });
      if (error) { console.error(`[insert ${a.slug}]`, error); continue; }
      await sb.from("post_categories").insert({ post_id: newId, category_id: CATEGORY_ID });
      inserted++;
    }
    writtenPaths.push(`/${a.slug}`);
  }

  console.log(`\n[done] inserted=${inserted} updated=${updated} (status unchanged — drafts stay drafts until image batch)`);

  if (!DRY && writtenPaths.length > 2) {
    // Purge pillar landing only — article paths 404 publicly while in draft.
    await purgePaths([`/${PILLAR_SLUG}`, `/${PILLAR_SLUG}/`]);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
