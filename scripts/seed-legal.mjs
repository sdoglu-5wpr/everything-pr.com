// Phase 2b — Seed/upsert the 6 long-form Legal pillar articles from
// data/verticals/legal-source.md. Idempotent on slug.
//
// Source markdown conventions (Ronn's spec):
//   PILLAR N — Title
//   slug: flat-slug
//
//   ## Section heading
//   ### Subsection
//
//   Regular paragraphs.
//
//   > **Definition — term:** definition body text.
//     -> rendered as <div class="definition-box">…</div>
//
//   > **Bold standalone quote line.**
//     -> rendered as <blockquote class="pull-quote">…</blockquote>
//
//   ## FAQ — Pillar topic
//   **Question one?**
//   Answer paragraph.
//
//   **Question two?**
//   Answer paragraph.
//
//   ## Sources & Further Reading
//   - [Source title](https://...)
//
// Behavior:
//   - UPSERTs into `posts` keyed on slug. Updates `content_html`,
//     `excerpt`, flips status from 'draft' to 'publish'.
//   - Auto-links glossary terms (first occurrence per article).
//   - Embeds JSON-LD (Article + BreadcrumbList + FAQPage) inline in
//     content_html. For pillar 3 also LegalCase, pillar 4 SoftwareApplication.
//   - Pings IndexNow + purges Cloudflare cache for affected paths (unless
//     --no-purge / --dry).
//
// Usage:
//   bun run scripts/seed-legal.mjs           # full run
//   bun run scripts/seed-legal.mjs --dry     # parse only, no writes
//   bun run scripts/seed-legal.mjs --no-purge

import { readFileSync } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const ROOT = process.cwd();
const SOURCE = path.join(ROOT, "data/verticals/legal-source.md");
const PILLAR_SLUG = "legal";
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

// Per-pillar extra schema generators (slug → fn(payload) → JSON-LD object[])
const EXTRA_SCHEMA_BY_SLUG = {
  "public-facing-litigation": () => [
    // Lightweight LegalCase / Legislation declarations. Placeholder list —
    // refine later when the active-case-status dashboard ships.
    {
      "@context": "https://schema.org",
      "@type": "Article",
      about: [
        { "@type": "Legislation", name: "Anti-SLAPP statutes (state-level)" },
        { "@type": "Legislation", name: "Federal Rule of Civil Procedure 11" },
      ],
    },
  ],
  "legaltech-marketing": () => [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      mentions: [
        { "@type": "SoftwareApplication", name: "Harvey", applicationCategory: "LegalTech" },
        { "@type": "SoftwareApplication", name: "Relativity", applicationCategory: "LegalTech" },
        { "@type": "SoftwareApplication", name: "Clio", applicationCategory: "LegalTech" },
        { "@type": "SoftwareApplication", name: "iManage", applicationCategory: "LegalTech" },
      ],
    },
  ],
};

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

// Inline markdown: **bold**, *italic*, [text](url), `code`, and brackets-italic-pub `[*Pub*]`
function renderInline(s) {
  let out = escapeHtml(s);
  // Links [text](url)
  out = out.replace(
    /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g,
    (_m, text, url) => `<a href="${url}">${text}</a>`,
  );
  // Inline italic publications: [*Pub Name*]
  out = out.replace(/\[\*([^*\]]+)\*\]/g, "[<em>$1</em>]");
  // Bold **x**
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  // Italic *x* (avoid eating bold)
  out = out.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, "$1<em>$2</em>");
  // Inline code `x`
  out = out.replace(/`([^`]+)`/g, "<code>$1</code>");
  return out;
}

// Convert a markdown table block into a wrapped HTML <table>.
function renderMarkdownTable(lines) {
  const rows = lines
    .filter((l) => /^\s*\|/.test(l))
    .map((l) =>
      l
        .trim()
        .replace(/^\||\|$/g, "")
        .split("|")
        .map((c) => c.trim()),
    );
  if (rows.length < 2) return null;
  // rows[1] is the alignment row like |---|---|
  const isAlignRow = rows[1].every((c) => /^:?-{3,}:?$/.test(c));
  const headerCells = rows[0];
  const bodyRows = isAlignRow ? rows.slice(2) : rows.slice(1);
  const thead = `<thead><tr>${headerCells
    .map((c) => `<th>${renderInline(c)}</th>`)
    .join("")}</tr></thead>`;
  const tbody = `<tbody>${bodyRows
    .map(
      (r) =>
        `<tr>${r.map((c) => `<td>${renderInline(c)}</td>`).join("")}</tr>`,
    )
    .join("")}</tbody>`;
  return `<div class="table-wrap"><table>${thead}${tbody}</table></div>`;
}

// Block-level parser. Walks paragraph blocks (separated by blank lines) and
// converts each into HTML. Returns { html, faqPairs, h2Anchors }.
function blocksToHtml(blocks, opts = {}) {
  const out = [];
  const faqPairs = [];
  const h2Anchors = [];
  let inSourcesSection = false;
  let inFaqSection = false;

  for (const blockRaw of blocks) {
    const block = blockRaw.replace(/\r/g, "").trimEnd();
    if (!block.trim()) continue;
    const lines = block.split("\n");

    // Heading
    const hMatch = lines[0].match(/^(#{2,4})\s+(.+)$/);
    if (hMatch && lines.length === 1) {
      const level = hMatch[1].length;
      const text = hMatch[2].trim();
      const id = slugifyHeading(text);
      // FAQ section sentinel
      if (level === 2 && /^faq\b/i.test(text)) {
        inFaqSection = true;
        inSourcesSection = false;
        out.push(`<h2 id="${id}">${renderInline(text)}</h2>`);
        h2Anchors.push({ id, text });
        continue;
      }
      // Sources section sentinel
      if (level === 2 && /^sources\b/i.test(text)) {
        inSourcesSection = true;
        inFaqSection = false;
        out.push(`<h2 id="${id}">${renderInline(text)}</h2>`);
        h2Anchors.push({ id, text });
        continue;
      }
      inFaqSection = false;
      inSourcesSection = false;
      const tag = `h${level}`;
      out.push(`<${tag} id="${id}">${renderInline(text)}</${tag}>`);
      if (level === 2) h2Anchors.push({ id, text });
      continue;
    }

    // Markdown table
    if (lines.every((l) => /^\s*\|/.test(l))) {
      const tbl = renderMarkdownTable(lines);
      if (tbl) {
        out.push(tbl);
        continue;
      }
    }

    // Definition box: > **Definition — term:** body…
    const defMatch = block.match(
      /^>\s*\*\*Definition\s*[—-]\s*([^:*]+?):\*\*\s*([\s\S]+)$/,
    );
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

    // Pull quote: > **bold standalone quote**
    const pqMatch = block.match(/^>\s*\*\*([\s\S]+?)\*\*\s*$/);
    if (pqMatch) {
      out.push(
        `<blockquote class="pull-quote">${renderInline(pqMatch[1])}</blockquote>`,
      );
      continue;
    }

    // Standard blockquote
    if (lines.every((l) => /^>/.test(l))) {
      const inner = lines.map((l) => l.replace(/^>\s?/, "")).join(" ");
      out.push(`<blockquote>${renderInline(inner)}</blockquote>`);
      continue;
    }

    // Bullet list
    if (lines.every((l) => /^\s*[-•]\s+/.test(l))) {
      if (inSourcesSection) {
        const items = lines
          .map((l) => {
            const item = l.replace(/^\s*[-•]\s+/, "");
            // Source items are typically [Title](https://…)
            const linkM = item.match(/^\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)(.*)$/);
            if (linkM) {
              return `<li><a href="${linkM[2]}" target="_blank" rel="noopener nofollow">${renderInline(
                linkM[1],
              )}</a>${renderInline(linkM[3])}</li>`;
            }
            return `<li>${renderInline(item)}</li>`;
          })
          .join("");
        out.push(`<ul class="sources-list">${items}</ul>`);
        continue;
      }
      const items = lines
        .map((l) => `<li>${renderInline(l.replace(/^\s*[-•]\s+/, ""))}</li>`)
        .join("");
      out.push(`<ul>${items}</ul>`);
      continue;
    }

    // Numbered list
    if (lines.every((l) => /^\s*\d+\.\s+/.test(l))) {
      const items = lines
        .map((l) => `<li>${renderInline(l.replace(/^\s*\d+\.\s+/, ""))}</li>`)
        .join("");
      out.push(`<ol>${items}</ol>`);
      continue;
    }

    // FAQ Q/A pair: starts with **Question?** then answer paragraph(s)
    if (inFaqSection) {
      const qm = lines[0].match(/^\*\*([\s\S]+?\?)\*\*\s*$/);
      if (qm) {
        const q = qm[1].trim();
        const aText = lines.slice(1).join(" ").trim();
        faqPairs.push({ q, a: aText });
        // Render visible Q/A in Pattern B form so extractFaqPairs picks them up.
        out.push(`<p><strong>${renderInline(q)}</strong></p>`);
        if (aText) out.push(`<p>${renderInline(aText)}</p>`);
        continue;
      }
    }

    // Default: paragraph (preserve inline formatting; collapse newlines to spaces)
    out.push(`<p>${renderInline(lines.join(" "))}</p>`);
  }

  return { html: out.join("\n"), faqPairs, h2Anchors };
}

function buildSchemaJsonLd({ slug, title, excerpt, faqPairs, extraSchema }) {
  const url = `${SITE_ORIGIN}/${slug}/`;
  const blocks = [];
  blocks.push({
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description: excerpt,
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    author: { "@type": "Organization", name: "EPR Editorial Team", url: `${SITE_ORIGIN}/author/everything-pr-staff/` },
    publisher: { "@type": "Organization", name: "Everything PR" },
  });
  blocks.push({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_ORIGIN}/` },
      { "@type": "ListItem", position: 2, name: "Legal", item: `${SITE_ORIGIN}/legal/` },
      { "@type": "ListItem", position: 3, name: title, item: url },
    ],
  });
  if (faqPairs.length) {
    blocks.push({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqPairs.map((p) => ({
        "@type": "Question",
        name: p.q,
        acceptedAnswer: { "@type": "Answer", text: p.a },
      })),
    });
  }
  if (extraSchema?.length) blocks.push(...extraSchema);
  return blocks
    .map(
      (b) =>
        `<script type="application/ld+json">${JSON.stringify(b)}</script>`,
    )
    .join("\n");
}

function parseSource(md) {
  // Ronn's format: "# Pillar N — slug: xxx" then "# Title" on next non-blank line.
  // Also tolerate legacy "PILLAR N — Title\nslug: xxx".
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
    // First "# Title" line is the article title
    const titleMatch = body.match(/^#\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1].trim() : `Pillar ${idx}`;
    if (titleMatch) body = body.replace(titleMatch[0], "").trim();
    // Strip trailing horizontal rule "---"
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

function autoLinkGlossary(html, glossary) {
  const used = new Set();
  let result = html;
  for (const term of glossary) {
    if (used.has(term.slug)) continue;
    const escaped = term.title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    // First match, not inside any tag, not inside <a>/<code>/<h*>
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
  if (!token || !zoneId) {
    console.log("[purge] CF creds not set, skipping CDN purge.");
    return;
  }
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
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ files: batch }),
        },
      );
      if (!res.ok) console.warn("[purge] CF failed", res.status, await res.text());
    } catch (e) { console.warn("[purge] error", e); }
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
        urlList: urls.map((u) => `${SITE_ORIGIN}${u}`),
      }),
    });
    console.log("[indexnow]", res.status);
  } catch (e) { console.warn("[indexnow] error", e); }
}

async function main() {
  const md = readFileSync(SOURCE, "utf8");
  const articles = parseSource(md);
  if (articles.length !== 6) {
    console.warn(`[parse] expected 6 articles, got ${articles.length}`);
  }

  const glossary = await fetchGlossary();
  console.log(`[glossary] loaded ${glossary.length} terms`);

  const writtenPaths = ["/legal", "/legal/"];
  const writtenUrls = ["/legal/"];
  let inserted = 0;
  let updated = 0;

  for (const a of articles) {
    if (!a.slug) {
      console.warn(`[skip] PILLAR ${a.index} ${a.title} missing slug`);
      continue;
    }
    const { html: bodyHtml, faqPairs, h2Anchors } = blocksToHtml(a.blocks);
    const linked = autoLinkGlossary(bodyHtml, glossary);
    const excerpt =
      (a.blocks.find((b) => !/^#/.test(b) && !/^>/.test(b)) || "")
        .replace(/[*_`>]/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 280);

    const extraSchema = EXTRA_SCHEMA_BY_SLUG[a.slug]?.() || [];
    const schema = buildSchemaJsonLd({
      slug: a.slug,
      title: a.title,
      excerpt,
      faqPairs,
      extraSchema,
    });
    const finalHtml = `${linked.html}\n${schema}`;

    console.log(
      `[${a.slug}] blocks=${a.blocks.length} chars=${finalHtml.length} ` +
        `glossary=${linked.glossaryLinked.length} faq=${faqPairs.length} ` +
        `h2=${h2Anchors.length}`,
    );

    if (DRY) continue;

    const { data: existing } = await sb
      .from("posts")
      .select("id, status")
      .eq("slug", a.slug)
      .maybeSingle();

    const row = {
      slug: a.slug,
      title: a.title,
      excerpt,
      content_html: finalHtml,
      status: "publish",
      type: "post",
      article_type: "pillar",
      pillar_slug: PILLAR_SLUG,
      pillar_index: a.index,
      author_id: 1052,
      published_at:
        existing && existing.status === "publish"
          ? undefined
          : new Date().toISOString(),
      modified_at: new Date().toISOString(),
    };

    if (existing) {
      const { error } = await sb.from("posts").update(row).eq("id", existing.id);
      if (error) { console.error(`[update ${a.slug}]`, error); continue; }
      // Ensure category mapping
      await sb.from("post_categories").upsert(
        { post_id: existing.id, category_id: 27962 },
        { onConflict: "post_id,category_id" },
      );
      updated++;
    } else {
      const { data: maxRow } = await sb
        .from("posts")
        .select("id")
        .order("id", { ascending: false })
        .limit(1)
        .maybeSingle();
      const newId = (maxRow?.id ?? 0) + 1;
      const { error } = await sb.from("posts").insert({ ...row, id: newId });
      if (error) { console.error(`[insert ${a.slug}]`, error); continue; }
      await sb.from("post_categories").insert({ post_id: newId, category_id: 27962 });
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
