// Phase 2j — Seed/upsert the 6 cluster articles under the Real Estate
// /residential-brokerage-commission-reset pillar.
// Cloned from scripts/seed-public-affairs-clusters.mjs with an RE-specific
// parser and rendering tweaks (KEY TAKEAWAYS / FAQ / single-bold-line H2
// promotion + Related footer).

import { readFileSync } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const ROOT = process.cwd();
const SOURCE = path.join(ROOT, "data/verticals/real-estate-pillar1-clusters-source.md");
const PILLAR_SLUG_VERTICAL = "real-estate";
const PILLAR_LABEL = "Real Estate";
const ARTICLE_SECTION = "Real Estate";
const EXPECTED_COUNT = 6;
const SITE_ORIGIN = "https://everything-pr.com";
const DRY = process.argv.includes("--dry");
const NO_PURGE = process.argv.includes("--no-purge");

// "1.N" → { slug, parent_id, pillar_index }. parent_id = 112751 (RE pillar landing).
const SLUG_MAP = {
  "1.1": { slug: "sitzer-burnett-timeline",                               parent_id: 112751, pillar_index: 1 },
  "1.2": { slug: "buyer-representation-agreements-consumer-conversation", parent_id: 112751, pillar_index: 2 },
  "1.3": { slug: "compass-exp-anywhere-brand-strategy-new-era",           parent_id: 112751, pillar_index: 3 },
  "1.4": { slug: "independent-vs-franchise-brokerages-2026",              parent_id: 112751, pillar_index: 4 },
  "1.5": { slug: "brokerage-recruiting-war-2026",                         parent_id: 112751, pillar_index: 5 },
  "1.6": { slug: "commission-transparency-consumer-trust",                parent_id: 112751, pillar_index: 6 },
};

const SUPABASE_URL =
  process.env.EPR_SUPABASE_URL || process.env.SUPABASE_URL ||
  process.env.VITE_EPR_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
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
    /\[([^\]]+)\]\((https?:\/\/[^)\s]+|\/[^)\s]+)\)/g,
    (_m, text, url) => `<a href="${url}">${text}</a>`,
  );
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, "$1<em>$2</em>");
  out = out.replace(/`([^`]+)`/g, "<code>$1</code>");
  return out;
}

// Extract FAQ Q/A pairs from a `**FAQ**` paragraph.
// Format: `**FAQ** *Question?* Answer. *Question?* Answer.`
function parseFaqBlock(block) {
  // Strip the **FAQ** prefix
  const text = block.replace(/^\*\*FAQ\.?\*\*\s*/i, "");
  const pairs = [];
  // Split on `*...?*` markers, keeping the question
  const re = /\*([^*]+?\?)\*\s*([\s\S]+?)(?=\*[^*]+?\?|$)/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const q = m[1].replace(/\s+/g, " ").trim();
    const a = m[2].replace(/\s+/g, " ").trim().replace(/\.$/, ".");
    if (q && a) pairs.push({ q, a });
  }
  return pairs;
}

// True if the block is a single paragraph consisting only of one `**bold**` span
// (no other content). Used to promote section headers to <h2>.
function isBoldOnlyHeader(block) {
  const trimmed = block.trim();
  const m = trimmed.match(/^\*\*([^*][\s\S]*?)\*\*$/);
  if (!m) return null;
  const inner = m[1].trim();
  // No nested `**`, reasonable length, no period at the end (those are sentences)
  if (inner.includes("**")) return null;
  if (inner.length > 120) return null;
  return inner;
}

function blocksToHtml(blocks) {
  const out = [];
  const h2Anchors = [];
  const faqPairs = [];
  let firstParaText = null;
  let relatedHtml = null;

  for (const blockRaw of blocks) {
    const block = blockRaw.replace(/\r/g, "").trimEnd();
    if (!block.trim()) continue;
    const lines = block.split("\n");

    // KEY TAKEAWAYS marker → h2
    if (/^\*\*KEY\s+TAKEAWAYS\*\*\s*$/i.test(block.trim())) {
      out.push(`<h2 id="key-takeaways">Key Takeaways</h2>`);
      h2Anchors.push({ id: "key-takeaways", text: "Key Takeaways" });
      continue;
    }

    // FAQ block: lift Q/A pairs and emit <h2>+rendered list
    if (/^\*\*FAQ\.?\*\*/i.test(block.trim())) {
      const pairs = parseFaqBlock(block);
      if (pairs.length) {
        faqPairs.push(...pairs);
        out.push(`<h2 id="faq">Frequently Asked Questions</h2>`);
        h2Anchors.push({ id: "faq", text: "Frequently Asked Questions" });
        for (const p of pairs) {
          out.push(
            `<h3 id="${slugifyHeading(p.q)}">${renderInline(p.q)}</h3>\n<p>${renderInline(p.a)}</p>`,
          );
        }
        continue;
      }
    }

    // Related: footer
    if (/^Related:\s*/i.test(block.trim())) {
      const tail = block.trim().replace(/^Related:\s*/i, "");
      const items = tail.split(/\s*·\s*/).map((s) => s.trim()).filter(Boolean);
      const lis = items
        .map((it) => {
          const m = it.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
          if (m) return `<li><a href="${m[2]}">${renderInline(m[1])}</a></li>`;
          return `<li>${renderInline(it)}</li>`;
        })
        .join("");
      relatedHtml = `<aside class="related-links"><h2 id="related">Related</h2><ul>${lis}</ul></aside>`;
      continue;
    }

    // Single-line bold-only paragraph → h2 promotion
    if (lines.length === 1) {
      const inner = isBoldOnlyHeader(lines[0]);
      if (inner) {
        const id = slugifyHeading(inner);
        out.push(`<h2 id="${id}">${renderInline(inner)}</h2>`);
        h2Anchors.push({ id, text: inner });
        continue;
      }
    }

    // Bullet list
    if (lines.every((l) => /^\s*[-•]\s+/.test(l))) {
      const items = lines
        .map((l) => `<li>${renderInline(l.replace(/^\s*[-•]\s+/, ""))}</li>`)
        .join("");
      out.push(`<ul>${items}</ul>`);
      continue;
    }

    // Multi-line bullet list (continuation lines indented)
    if (/^\s*[-•]\s+/.test(lines[0])) {
      // Reflow: every line that doesn't start with `-` is a continuation
      const items = [];
      let cur = null;
      for (const l of lines) {
        if (/^\s*[-•]\s+/.test(l)) {
          if (cur) items.push(cur);
          cur = l.replace(/^\s*[-•]\s+/, "");
        } else if (cur) {
          cur += " " + l.trim();
        }
      }
      if (cur) items.push(cur);
      const lis = items.map((it) => `<li>${renderInline(it)}</li>`).join("");
      out.push(`<ul>${lis}</ul>`);
      continue;
    }

    if (lines.every((l) => /^\s*\d+\.\s+/.test(l))) {
      const items = lines
        .map((l) => `<li>${renderInline(l.replace(/^\s*\d+\.\s+/, ""))}</li>`)
        .join("");
      out.push(`<ol>${items}</ol>`);
      continue;
    }

    const paraText = lines.join(" ");
    if (!firstParaText) firstParaText = paraText.replace(/\*\*/g, "");
    out.push(`<p>${renderInline(paraText)}</p>`);
  }

  if (relatedHtml) out.push(relatedHtml);
  return { html: out.join("\n"), h2Anchors, firstParaText, faqPairs };
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
  return `<script type="application/ld+json">${JSON.stringify({ "@context": "https://schema.org", "@graph": graph })}</script>`;
}

// Parser — splits source on `**PILLAR 1 CLUSTERS ---` then each `**CLUSTER 1.N**`.
// Title-block lines (and the URL line beginning `/real-estate/`) are discarded.
function parseSource(md) {
  const pillarRe = /^\*\*PILLAR\s+\d+\s+CLUSTERS\s+[-—–]+[^\n]*\*\*\s*$/m;
  const pm = md.match(pillarRe);
  if (!pm) {
    console.warn("[parse] no PILLAR header matched");
    return [];
  }
  const pillarBody = md.slice(pm.index + pm[0].length);

  const clusterRe = /^\*\*CLUSTER\s+1\.(\d+)\*\*\s*$/gm;
  const clusterHeaders = [...pillarBody.matchAll(clusterRe)];
  if (!clusterHeaders.length) {
    console.warn("[parse] no CLUSTER markers matched");
    return [];
  }

  const out = [];
  for (let ci = 0; ci < clusterHeaders.length; ci++) {
    const ch = clusterHeaders[ci];
    const clusterNum = Number(ch[1]);
    const key = `1.${clusterNum}`;
    const map = SLUG_MAP[key];
    if (!map) {
      console.warn(`[parse] no SLUG_MAP entry for ${key} — skipping`);
      continue;
    }
    const start = ch.index + ch[0].length;
    const end = ci + 1 < clusterHeaders.length ? clusterHeaders[ci + 1].index : pillarBody.length;
    const slice = pillarBody.slice(start, end);

    // Skip title-block + URL line. Body starts after first line that begins with /real-estate/
    const allLines = slice.split("\n");
    let urlIdx = -1;
    for (let i = 0; i < allLines.length; i++) {
      if (/^\s*\/real-estate\//.test(allLines[i])) {
        urlIdx = i;
        break;
      }
    }
    if (urlIdx < 0) {
      console.warn(`[parse] cluster ${key}: no /real-estate/ URL line found`);
      continue;
    }
    let body = allLines.slice(urlIdx + 1).join("\n").trim();
    body = body.replace(/\n-{3,}\s*$/, "").trim();
    const blocks = body.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
    out.push({
      pillarNum: 1, clusterNum, key, title: map.slug, // title overridden below
      slug: map.slug, parent_id: map.parent_id, pillar_index: map.pillar_index,
      blocks,
    });
  }
  return out;
}

// Title map — taken from the spec rather than parsed (the source title spans
// multiple lines and is awkward to recover cleanly).
const TITLE_MAP = {
  "1.1": "The Sitzer-Burnett Timeline: How the Industry Explained the Settlement",
  "1.2": "Buyer Representation Agreements: How Top Agents Talk to Consumers Now",
  "1.3": "Compass, eXp, Anywhere: Brand Strategy in the New Commission Era",
  "1.4": "Independent Brokerages vs. Franchise Models in 2026",
  "1.5": "The Recruiting War: How Brokerages Communicate With Agents",
  "1.6": "Commission Transparency and Consumer Trust",
};

async function fetchGlossary() {
  const { data, error } = await sb
    .from("glossary_terms").select("slug, title").eq("published", true);
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
    const re = new RegExp(`(?<![\w-])(${escaped})(?![\w-])(?![^<]*>)`, "i");
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
  // claude.ai stale preview links → bare anchor text
  out = out.replace(
    /\[\[([^\]]+)\]\{\.underline\}\]\((https?:\/\/claude\.ai\/[^)]+)\)/g,
    "$1",
  );
  // Other underline-wrapped external links → markdown link
  out = out.replace(
    /\[\[([^\]]+)\]\{\.underline\}\]\((https?:\/\/[^)]+)\)/g,
    "[$1]($2)",
  );
  // Bare underline span without link
  out = out.replace(/\[([^\]]+)\]\{\.underline\}/g, "$1");
  // claude.ai/real-estate/<pillar>/<slug> → /<slug>/
  out = out.replace(
    /https?:\/\/claude\.ai\/real-estate\/[a-z0-9-]+\/([a-z0-9-]+)/gi,
    "/$1/",
  );
  // Pandoc-style nested bracket link wrapper for non-underline cases
  out = out.replace(
    /\[\[(https?:\/\/[^\]\s]+)\]\]\((?:https?:\/\/[^)\s]+)\)/g,
    "$1",
  );
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
    a.title = TITLE_MAP[a.key] || a.title;
    const parsed = blocksToHtml(a.blocks);

    // Defensive: rewrite any remaining /real-estate/<...>/<slug>/ → /<slug>/
    parsed.html = parsed.html
      .replace(/\/real-estate\/[a-z0-9-]+\/([a-z0-9-]+)\/?(?=["')\s])/gi, "/$1/")
      .replace(/\/real-estate\/([a-z0-9-]+)\/?(?=["')\s])/gi, (m, s) =>
        s === "residential-brokerage-commission-reset" ? m : `/${s}/`,
      );

    const linked = autoLinkGlossary(parsed.html, glossary, a.slug);

    const excerpt = (parsed.firstParaText || "")
      .replace(/[*_`>]/g, "").replace(/\s+/g, " ").trim().slice(0, 280);

    const schema = buildSchemaJsonLd({
      slug: a.slug, title: a.title, excerpt, faqPairs: parsed.faqPairs,
    });
    const finalHtml = `${linked.html}\n${schema}`;

    console.log(
      `[${a.key} ${a.slug}] blocks=${a.blocks.length} chars=${finalHtml.length} ` +
        `glossary=${linked.glossaryLinked.length} faq=${parsed.faqPairs.length} ` +
        `h2=${parsed.h2Anchors.length} parent=${a.parent_id} pi=${a.pillar_index}`,
    );

    if (DRY) continue;

    const { data: existing } = await sb
      .from("posts").select("id, status").eq("slug", a.slug).maybeSingle();

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

  console.log(`\n[done] inserted=${inserted} updated=${updated} (status unchanged — drafts stay drafts)`);

  if (!DRY && writtenPaths.length > 2) {
    await purgePaths([`/${PILLAR_SLUG_VERTICAL}`, `/${PILLAR_SLUG_VERTICAL}/`]);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
