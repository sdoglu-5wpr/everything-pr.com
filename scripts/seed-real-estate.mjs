// Phase 2d — Seed/upsert the 9 long-form B2B Tech & SaaS pillar articles from
// data/verticals/b2b-source.md. Idempotent on slug.
//
// Cloned from scripts/seed-defense.mjs with these b2b-specific changes:
//   - REMOVED: **Tags:** line parsing (b2b source has no tags line).
//   - REMOVED: defense Organization entity lookup (no analogous b2b list).
//   - FIXED: FAQ heading regex now /^(faq|frequently asked)/i so Ronn's
//     `## Frequently Asked Questions` heading triggers FAQPage schema +
//     JSONB. (Same fix should be retro-applied to defense on next re-run.)
//   - ADDED: Pillars 7–9 carry a pre-drafted Article schema block under an
//     `**Article Schema**` heading. The parser extracts headline +
//     description verbatim and uses them as canonical seo title/description.
//     The raw JSON block is stripped from rendered HTML to avoid
//     double-emission. Pillars 1–6 fall back to auto-generation
//     (title + first paragraph excerpt) as in defense.
//   - articleSection: "B2B Tech & SaaS", isPartOf → /b2b/.
//   - DOES NOT flip status to publish — leaves rows as draft.
//
// Usage:
//   bun run scripts/seed-b2b.mjs           # full run, drafts stay drafts
//   bun run scripts/seed-b2b.mjs --dry     # parse only, no writes
//   bun run scripts/seed-b2b.mjs --no-purge

import { readFileSync } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const ROOT = process.cwd();
const SOURCE = path.join(ROOT, "data/verticals/real-estate-source.md");
const PILLAR_SLUG = "real-estate";
const PILLAR_LABEL = "Real Estate & PropTech";
const ARTICLE_SECTION = "Real Estate & PropTech";
const CATEGORY_ID = 27958;
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

// Try to extract a fenced or inline JSON object from a block. Returns the
// parsed object or null. Tolerates ```json fences and stray prose.
function tryExtractJson(block) {
  const fence = block.match(/```(?:json)?\s*([\s\S]+?)```/i);
  const candidate = fence ? fence[1] : block;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(candidate.slice(start, end + 1));
  } catch {
    return null;
  }
}

function blocksToHtml(blocks) {
  const out = [];
  const faqPairs = [];
  const h2Anchors = [];
  let inSourcesSection = false;
  let inFaqSection = false;
  let inArticleSchemaSection = false;
  let firstParaText = null;
  let articleSchemaOverride = null; // { headline, description } from pillars 7–9

  for (const blockRaw of blocks) {
    const block = blockRaw.replace(/\r/g, "").trimEnd();
    if (!block.trim()) continue;
    const lines = block.split("\n");

    const hMatch = lines[0].match(/^(#{2,4})\s+(.+)$/);
    if (hMatch && lines.length === 1) {
      const level = hMatch[1].length;
      const text = hMatch[2].trim();
      const id = slugifyHeading(text);
      if (level === 2 && /^(faq|frequently asked)/i.test(text)) {
        inFaqSection = true; inSourcesSection = false; inArticleSchemaSection = false;
        out.push(`<h2 id="${id}">${renderInline(text)}</h2>`);
        h2Anchors.push({ id, text }); continue;
      }
      if (level === 2 && /^sources\b/i.test(text)) {
        inSourcesSection = true; inFaqSection = false; inArticleSchemaSection = false;
        out.push(`<h2 id="${id}">${renderInline(text)}</h2>`);
        h2Anchors.push({ id, text }); continue;
      }
      inFaqSection = false; inSourcesSection = false; inArticleSchemaSection = false;
      const tag = `h${level}`;
      out.push(`<${tag} id="${id}">${renderInline(text)}</${tag}>`);
      if (level === 2) h2Anchors.push({ id, text });
      continue;
    }

    // **Article Schema** marker. Two formats supported:
    //   (a) Pre-cleaned markdown bullet list (Pillars 7–9 in b2b Part 2):
    //       **Article Schema** (extract ...):
    //       - headline: `Title`
    //       - description: `Desc`
    //       — marker + bullets live in the SAME block (no blank line).
    //   (b) Legacy raw JSON object under a bare **Article Schema** heading
    //       — marker is its own block; JSON block follows.
    if (/^\*\*Article Schema\*\*/i.test(lines[0])) {
      const headlineLine = lines.find((l) => /^[-*]\s*headline\s*:/i.test(l));
      const descLine = lines.find((l) => /^[-*]\s*description\s*:/i.test(l));
      if (headlineLine || descLine) {
        const pick = (l) => l.replace(/^[-*]\s*\w+\s*:\s*/i, "").trim().replace(/^`|`$/g, "").trim();
        articleSchemaOverride = {
          headline: headlineLine ? pick(headlineLine) : null,
          description: descLine ? pick(descLine) : null,
        };
        continue;
      }
      // No inline bullets — fall through to JSON-block mode.
      inArticleSchemaSection = true;
      continue;
    }
    if (inArticleSchemaSection) {
      const parsed = tryExtractJson(block);
      if (parsed) {
        const headline = parsed.headline || parsed.name;
        const description = parsed.description;
        if (headline || description) {
          articleSchemaOverride = {
            headline: headline ? String(headline).trim() : null,
            description: description ? String(description).trim() : null,
          };
        }
        inArticleSchemaSection = false;
        continue;
      }
      inArticleSchemaSection = false;
    }

    // Skip stray Meta Tags / Title / Description editorial blocks at the
    // top of pillars 7–9. These are author-facing notes, not body copy.
    if (/^\*\*(Meta Tags?|Title|Description|Meta Title|Meta Description|URL|Vertical|Author)\*\*/i.test(block)) {
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

    const paraText = lines.join(" ");
    if (!firstParaText) firstParaText = paraText;
    out.push(`<p>${renderInline(paraText)}</p>`);
  }

  return { html: out.join("\n"), faqPairs, h2Anchors, firstParaText, articleSchemaOverride };
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

// Pre-clean docx/pandoc artifacts on the raw source before parsing:
//   - [[https://x]{.underline}](https://x)  →  https://x   (drop wrapper +
//     {.underline} decoration; keep the URL as plain text — renderInline
//     will not auto-link bare URLs, but that matches the body intent here
//     because Ronn's real-estate source uses plain prose URLs).
//   - file:///some/path                     →  /some/path  (strip file://)
//   - \@ \# \$ \"                           →  @ # $ "
function preCleanSource(md) {
  let out = md;
  // Pandoc-style hyperlink wrappers: [[URL]{.underline}](URL) → URL
  out = out.replace(
    /\[\[(https?:\/\/[^\]\s]+)\]\{\.underline\}\]\((?:https?:\/\/[^)\s]+)\)/g,
    "$1",
  );
  // Stray {.underline} decoration on plain links: [text]{.underline} → text
  out = out.replace(/\[([^\]]+)\]\{\.underline\}/g, "$1");
  // file:/// references in markdown link targets → strip protocol + host
  out = out.replace(/\(file:\/\/+(\/[^)\s]*)\)/g, "($1)");
  // Escaped punctuation introduced by docx → unescape
  out = out.replace(/\\([@#"$])/g, "$1");
  return out;
}

async function main() {
  const md = preCleanSource(readFileSync(SOURCE, "utf8"));
  const articles = parseSource(md);
  if (articles.length !== 6) {
    console.warn(`[parse] expected 6 articles, got ${articles.length}`);
  }

  const glossary = await fetchGlossary();
  console.log(`[glossary] loaded ${glossary.length} terms`);

  const writtenPaths = [`/${PILLAR_SLUG}`, `/${PILLAR_SLUG}/`];
  let inserted = 0;
  let updated = 0;

  for (const a of articles) {
    if (!a.slug) { console.warn(`[skip] PILLAR ${a.index} missing slug`); continue; }
    const parsed = blocksToHtml(a.blocks);
    // Slug rewrite: /real-estate/[slug]/ → /[slug]/. Preserve /real-estate/
    // (the vertical index page URL).
    parsed.html = parsed.html.replace(
      /\/real-estate\/([a-z0-9-]+)\/?(?=["')\s])/gi,
      (m, s) => (s ? `/${s}/` : m),
    );

    const linked = autoLinkGlossary(parsed.html, glossary, a.slug);

    // Excerpt / description: prefer Ronn's pre-drafted Article schema
    // description for pillars 7–9; fall back to first-paragraph extract.
    const autoExcerpt = (parsed.firstParaText || "")
      .replace(/[*_`>]/g, "").replace(/\s+/g, " ").trim().slice(0, 280);
    const excerpt = parsed.articleSchemaOverride?.description
      ? parsed.articleSchemaOverride.description.slice(0, 280)
      : autoExcerpt;
    const headline = parsed.articleSchemaOverride?.headline || a.title;

    const schema = buildSchemaJsonLd({
      slug: a.slug, title: headline, excerpt,
      faqPairs: parsed.faqPairs,
    });
    const finalHtml = `${linked.html}\n${schema}`;

    console.log(
      `[${a.slug}] blocks=${a.blocks.length} chars=${finalHtml.length} ` +
        `glossary=${linked.glossaryLinked.length} faq=${parsed.faqPairs.length} ` +
        `h2=${parsed.h2Anchors.length} schemaOverride=${parsed.articleSchemaOverride ? "yes" : "no"}`,
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
    await purgePaths([`/${PILLAR_SLUG}`, `/${PILLAR_SLUG}/`]);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
