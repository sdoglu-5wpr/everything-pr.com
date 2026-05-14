// Seed/upsert the glossary_terms table from data/glossary-source.md.
// Idempotent: matches on slug, updates title/definition/extended/where/related.
//
// Usage: bun run scripts/seed-glossary.mjs [--dry]

import { readFileSync } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const ROOT = process.cwd();
const SOURCE = path.join(ROOT, "data/glossary-source.md");
const DRY = process.argv.includes("--dry");

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

// Map term slug -> category key (from Ronn's "Browse by Category" list).
const CATEGORY_BY_SLUG = {
  // AI & Discovery
  geo: "ai-discovery", aeo: "ai-discovery", seo: "ai-discovery",
  "citation-share": "ai-discovery", "retrieval-anchor": "ai-discovery",
  "share-of-model": "ai-discovery", "ai-overview": "ai-discovery",
  "zero-click-search": "ai-discovery", schema: "ai-discovery", llm: "ai-discovery",
  rag: "ai-discovery", "entity-authority": "ai-discovery",
  "knowledge-graph": "ai-discovery", "featured-snippet": "ai-discovery",
  hallucination: "ai-discovery", "prompt-engineering": "ai-discovery",
  "training-data": "ai-discovery", "source-of-truth": "ai-discovery",
  // Earned Media & PR
  boilerplate: "earned-media-pr", embargo: "earned-media-pr",
  exclusive: "earned-media-pr", "press-release": "earned-media-pr",
  "wire-service": "earned-media-pr", pitch: "earned-media-pr",
  "off-the-record": "earned-media-pr", "on-background": "earned-media-pr",
  "trade-press": "earned-media-pr", "tier-1-publication": "earned-media-pr",
  "media-kit": "earned-media-pr",
  // Crisis & Risk
  "disclosure-quality": "crisis-risk", "24-hour-rule": "crisis-risk",
  "holding-statement": "crisis-risk", "dark-site": "crisis-risk",
  "sec-8k": "crisis-risk", "breach-response": "crisis-risk",
  "crisis-velocity": "crisis-risk", "activist-short-seller": "crisis-risk",
  // Financial & Fintech
  "embedded-finance": "financial-fintech", stablecoin: "financial-fintech",
  neobank: "financial-fintech", "ai-disclosure": "financial-fintech",
  "ai-underwriting": "financial-fintech", tokenization: "financial-fintech",
  kyc: "financial-fintech", "safe-banking": "financial-fintech",
  // Healthcare
  "glp-1": "healthcare", "ai-scribe": "healthcare",
  "payor-provider": "healthcare", "fda-regulated-promo": "healthcare",
  "clinical-trial-communications": "healthcare",
  // Legal & Policy
  fara: "legal-policy", "lobbying-disclosure": "legal-policy",
  "lateral-partner": "legal-policy", "mass-tort": "legal-policy",
  "amlaw-100": "legal-policy", itar: "legal-policy",
  "foreign-principal": "legal-policy", "coalition-strategy": "legal-policy",
  "litigation-pr": "legal-policy", "dual-use-technology": "legal-policy",
  // Marketing & Media
  "earned-media": "marketing-media", "owned-media": "marketing-media",
  "paid-media": "marketing-media", "walled-gardens": "marketing-media",
  "signal-loss": "marketing-media", "clean-room": "marketing-media",
  "retail-media": "marketing-media", ctv: "marketing-media",
  cdp: "marketing-media", programmatic: "marketing-media",
  dsp: "marketing-media", "measurement-fragmentation": "marketing-media",
  // B2B Tech
  "analyst-relations": "b2b-tech", "category-creation": "b2b-tech",
  procurement: "b2b-tech", rfp: "b2b-tech", aor: "b2b-tech",
  "founder-branding": "b2b-tech", "comparison-query": "b2b-tech",
  // Consumer & Creator
  dtc: "consumer-creator", "social-commerce": "consumer-creator",
  "creator-economy": "consumer-creator", "tiktok-shop": "consumer-creator",
  // Sports & Gaming
  nil: "sports-gaming", "sportsbook-handle": "sports-gaming",
  igaming: "sports-gaming", dfs: "sports-gaming",
  // Cannabis
  mso: "cannabis",
  // Real Estate
  ibuyer: "real-estate", proptech: "real-estate",
  "listing-portal": "real-estate",
  // Web3
  defi: "web3", "post-hack-disclosure": "web3", custody: "web3",
  // Reputation
  disinformation: "reputation", "reputation-recovery": "reputation",
  "executive-reputation": "reputation",
  "internal-communications": "reputation",
  // Luxury
  "wealth-migration": "luxury",
};

const LINK_REWRITES = [
  [/^\/finserv(\/|$)/, "/financial-services$1"],
  [/^\/cyber(\/|$)/, "/cybersecurity$1"],
  [/^\/crisis-communications(\/|$)/, "/crisis-pr$1"],
];

function rewriteUrl(u) {
  let out = u;
  for (const [re, rep] of LINK_REWRITES) out = out.replace(re, rep);
  return out;
}

function parseLinks(line, isRelated) {
  // Match [Label](url) pairs
  const re = /\[([^\]]+)\]\(([^)]+)\)/g;
  const out = [];
  let m;
  while ((m = re.exec(line))) {
    const label = m[1].trim();
    const url = rewriteUrl(m[2].trim());
    if (isRelated && url.startsWith("/glossary/")) {
      out.push({ label, slug: url.replace(/^\/glossary\//, "").replace(/\/$/, "") });
    } else {
      out.push({ label, url });
    }
  }
  return out;
}

function paragraphsToHtml(paragraphs) {
  return paragraphs
    .map((p) => `<p>${p.trim()}</p>`)
    .join("\n");
}

function parseSource(md) {
  const blocks = md.split(/\n---\s*\n/);
  const entries = [];
  for (const block of blocks) {
    const slugMatch = block.match(/###\s+`\/glossary\/([a-z0-9-]+)`/);
    if (!slugMatch) continue;
    const slug = slugMatch[1];
    // Title: first **bold** line after the slug header
    const titleMatch = block.match(/\*\*([^*\n]+)\*\*/);
    if (!titleMatch) {
      console.warn(`[skip ${slug}] no title`);
      continue;
    }
    const title = titleMatch[1].trim();

    const lines = block.split("\n");
    const startIdx = lines.findIndex((l) => /\*\*[^*]+\*\*/.test(l));
    const bodyLines = lines.slice(startIdx + 1);

    // Collect paragraphs and pull off **Where it's used:** / **Related terms:**
    const paragraphs = [];
    let where = [];
    let related = [];
    let buf = [];
    const flush = () => {
      const txt = buf.join(" ").trim();
      if (txt) paragraphs.push(txt);
      buf = [];
    };
    for (const raw of bodyLines) {
      const l = raw.trimEnd();
      if (/^\*\*Where it'?s used:\*\*/i.test(l)) {
        flush();
        where = parseLinks(l.replace(/^\*\*Where it'?s used:\*\*/i, ""), false);
        continue;
      }
      if (/^\*\*Related terms:\*\*/i.test(l)) {
        flush();
        related = parseLinks(l.replace(/^\*\*Related terms:\*\*/i, ""), true);
        continue;
      }
      if (l.trim() === "") {
        flush();
      } else {
        buf.push(l);
      }
    }
    flush();

    if (paragraphs.length === 0) {
      console.warn(`[skip ${slug}] no body paragraphs`);
      continue;
    }
    const short_definition = paragraphs[0];
    const extended_html = paragraphs.length > 1 ? paragraphsToHtml(paragraphs.slice(1)) : null;

    entries.push({
      slug,
      title,
      short_definition,
      extended_html,
      category: CATEGORY_BY_SLUG[slug] ?? null,
      where_used: where,
      related_terms: related,
      published: true,
    });
  }
  return entries;
}

const md = readFileSync(SOURCE, "utf8");
const entries = parseSource(md);
console.log(`Parsed ${entries.length} glossary entries.`);

if (entries.length === 0) {
  console.log("Nothing to upsert. Paste Ronn's verbatim term blocks into data/glossary-source.md and rerun.");
  process.exit(0);
}

if (DRY) {
  console.log(JSON.stringify(entries.slice(0, 3), null, 2));
  console.log("[dry] not writing.");
  process.exit(0);
}

const { error } = await sb.from("glossary_terms").upsert(entries, { onConflict: "slug" });
if (error) {
  console.error("Upsert failed:", error);
  process.exit(1);
}
console.log(`Upserted ${entries.length} glossary terms.`);
