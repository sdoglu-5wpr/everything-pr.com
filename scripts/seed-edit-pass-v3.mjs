// Phase 1e — Seed/upsert pillars from data/edit-pass-v3-source.md.
// Idempotent: matches on slug.
//
// Usage: bun run scripts/seed-edit-pass-v3.mjs [--dry]

import { readFileSync } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const ROOT = process.cwd();
const SOURCE = path.join(ROOT, "data/edit-pass-v3-source.md");
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

// Map "Related"/"Most active in" labels to internal canonical paths.
// Unknown labels render as plain text.
const LABEL_TO_PATH = {
  "GEO": "/geo",
  "AEO": "/glossary/aeo",
  "SEO": "/glossary/seo",
  "Earned Media": "/earned-media",
  "Reputation Management": "/reputation-management",
  "Executive Branding": "/executive-founder-branding",
  "Executive & Founder Branding": "/executive-founder-branding",
  "Crisis Communications": "/crisis-pr",
  "Crisis": "/crisis-pr",
  "Cybersecurity": "/cybersecurity",
  "B2B Tech & SaaS": "/b2b",
  "Public Affairs": "/public-affairs",
  "Investor Relations": "/glossary/investor-relations",
  "Litigation PR": "/glossary/litigation-pr",
  "Beauty": "/beauty",
  "CPG, Food & Beverage": "/cpg",
  "CPG": "/cpg",
  "Luxury": "/luxury",
  "Influencer & Creator": "/glossary/creator-economy",
  "Social Media": "/social-media",
  "Financial Services & Fintech": "/financial-services",
  "Financial Services": "/financial-services",
  "Healthcare & Health Tech": "/health-tech",
  "Healthcare": "/healthcare",
  "Health Tech": "/health-tech",
  "Legal & Litigation": "/legal",
  "Legal": "/legal",
  "Defense & Defense-Tech": "/defense",
  "Defense": "/defense",
  "Web3 / Crypto": "/web3",
  "Web3": "/web3",
  "AdTech & MarTech": "/adtech",
  "AdTech": "/adtech",
  "Sports & Gaming": "/sports",
  "Sports": "/sports",
  "AI Communications": "/ai-communications",
  "Digital & Paid Media": null, // text only
};

function esc(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function renderRelatedLine(line) {
  // line e.g. "Cybersecurity · B2B Tech & SaaS · Investor Relations"
  const parts = line.split("·").map((s) => s.trim()).filter(Boolean);
  return parts
    .map((label) => {
      const href = LABEL_TO_PATH[label];
      if (href === null || href === undefined) return esc(label);
      return `<a href="${href}">${esc(label)}</a>`;
    })
    .join(" · ");
}

function renderTopicsLine(line) {
  return line.split("·").map((s) => esc(s.trim())).filter(Boolean).join(" · ");
}

function parseSection(block) {
  // Header line: "## N. /slug — Title"
  const headerMatch = block.match(/^##\s+\d+\.\s+\/([a-z0-9-]+)\s+—\s+(.+)$/m);
  if (!headerMatch) return null;
  const slug = headerMatch[1];

  const lines = block.split("\n");

  // Page Title
  const pageTitle = (lines.find((l) => /^\*\*Page Title:\*\*/.test(l)) || "")
    .replace(/^\*\*Page Title:\*\*\s*/, "").trim();
  const meta = (lines.find((l) => /^\*\*Meta:\*\*/.test(l)) || "")
    .replace(/^\*\*Meta:\*\*\s*/, "").trim();

  // H3 = pillar title
  const h3Idx = lines.findIndex((l) => /^###\s+/.test(l));
  if (h3Idx < 0) return null;
  const title = lines[h3Idx].replace(/^###\s+/, "").trim();

  // Subtitle = first non-empty line after H3
  let i = h3Idx + 1;
  while (i < lines.length && lines[i].trim() === "") i++;
  const subtitle = (lines[i] || "").trim();
  i++;
  while (i < lines.length && lines[i].trim() === "") i++;

  // Intro paragraph(s) until first H4
  const introParas = [];
  let buf = [];
  while (i < lines.length && !/^####\s+/.test(lines[i]) && !/^\*\*(Topics|Related|Most active in):/.test(lines[i])) {
    if (lines[i].trim() === "") {
      if (buf.length) { introParas.push(buf.join(" ").trim()); buf = []; }
    } else {
      buf.push(lines[i].trim());
    }
    i++;
  }
  if (buf.length) introParas.push(buf.join(" ").trim());

  // H4 sections (questions / Flagship Research)
  const sections = []; // { heading, isFlagship, paras: string[], bullets: string[] }
  let topics = "";
  let mostActive = "";
  let related = "";

  let cur = null;
  for (; i < lines.length; i++) {
    const l = lines[i];
    if (/^####\s+/.test(l)) {
      if (cur) sections.push(cur);
      const heading = l.replace(/^####\s+/, "").trim();
      cur = { heading, isFlagship: /flagship research/i.test(heading), paras: [], bullets: [], buf: [] };
      continue;
    }
    if (/^\*\*Topics:\*\*/.test(l)) {
      if (cur) { if (cur.buf.length) cur.paras.push(cur.buf.join(" ").trim()); sections.push(cur); cur = null; }
      topics = l.replace(/^\*\*Topics:\*\*\s*/, "").trim();
      continue;
    }
    if (/^\*\*Most active in:\*\*/.test(l)) {
      if (cur) { if (cur.buf.length) cur.paras.push(cur.buf.join(" ").trim()); sections.push(cur); cur = null; }
      mostActive = l.replace(/^\*\*Most active in:\*\*\s*/, "").trim();
      continue;
    }
    if (/^\*\*Related( disciplines)?:\*\*/.test(l)) {
      if (cur) { if (cur.buf.length) cur.paras.push(cur.buf.join(" ").trim()); sections.push(cur); cur = null; }
      related = l.replace(/^\*\*Related( disciplines)?:\*\*\s*/, "").trim();
      continue;
    }
    if (cur) {
      if (/^-\s+/.test(l)) {
        if (cur.buf.length) { cur.paras.push(cur.buf.join(" ").trim()); cur.buf = []; }
        cur.bullets.push(l.replace(/^-\s+/, "").trim());
      } else if (l.trim() === "") {
        if (cur.buf.length) { cur.paras.push(cur.buf.join(" ").trim()); cur.buf = []; }
      } else {
        cur.buf.push(l.trim());
      }
    }
  }
  if (cur) { if (cur.buf.length) cur.paras.push(cur.buf.join(" ").trim()); sections.push(cur); }

  // Build body_html
  const bodyParts = [];
  for (const p of introParas) bodyParts.push(`<p>${p}</p>`);
  for (const s of sections) {
    bodyParts.push(`<h2>${esc(s.heading)}</h2>`);
    for (const p of s.paras) bodyParts.push(`<p>${p}</p>`);
    if (s.bullets.length) {
      bodyParts.push(`<ul>${s.bullets.map((b) => `<li>${b}</li>`).join("")}</ul>`);
    }
  }
  if (topics) bodyParts.push(`<p><strong>Topics:</strong> ${renderTopicsLine(topics)}</p>`);
  if (mostActive) bodyParts.push(`<p><strong>Most active in:</strong> ${renderRelatedLine(mostActive)}</p>`);
  if (related) bodyParts.push(`<p><strong>Related:</strong> ${renderRelatedLine(related)}</p>`);
  const body_html = bodyParts.join("\n");

  // FAQ = sections that are questions (heading ends with "?" OR contains "?"; exclude Flagship Research)
  const faq = sections
    .filter((s) => !s.isFlagship && /\?/.test(s.heading))
    .map((s) => ({ q: s.heading, a: s.paras.map((p) => `<p>${p}</p>`).join("") }));

  return { slug, pageTitle, meta, title, subtitle, body_html, faq };
}

const md = readFileSync(SOURCE, "utf8");
const blocks = md.split(/\n(?=##\s+\d+\.\s+\/)/);

// Slug remap: source uses /geo for the discipline, but it could remap if needed.
const SLUG_REMAP = {}; // source-slug -> db-slug (none required; source already uses db slugs)

const DISCIPLINE_SLUGS = new Set(["geo", "reputation-management", "executive-founder-branding", "earned-media"]);
const DISCIPLINE_HERO = {
  "geo": "/pillars/generative-engine-optimization.webp",
  "reputation-management": "/pillars/marketing.png", // PLACEHOLDER
  "executive-founder-branding": "/pillars/marketing.png", // PLACEHOLDER
  "earned-media": "/pillars/marketing.png", // PLACEHOLDER
};

const entries = [];
for (const block of blocks) {
  if (!/^##\s+\d+\.\s+\//m.test(block)) continue;
  const parsed = parseSection(block);
  if (!parsed) { console.warn("Skipped block (parse failed)"); continue; }
  const dbSlug = SLUG_REMAP[parsed.slug] || parsed.slug;
  entries.push({ ...parsed, dbSlug });
}

console.log(`Parsed ${entries.length} pillar sections.`);

if (DRY) {
  for (const e of entries) {
    console.log(`- ${e.dbSlug}: title="${e.title}" subtitle="${e.subtitle.slice(0,60)}..." body_len=${e.body_html.length} faq=${e.faq.length}`);
  }
  process.exit(0);
}

// First, handle the GEO slug rename: existing row has slug 'generative-engine-optimization'; rename to 'geo'.
{
  const { data: existing } = await sb.from("pillars").select("id, slug").eq("slug", "generative-engine-optimization").maybeSingle();
  if (existing) {
    const { data: geoRow } = await sb.from("pillars").select("id").eq("slug", "geo").maybeSingle();
    if (!geoRow) {
      const { error } = await sb.from("pillars").update({ slug: "geo" }).eq("id", existing.id);
      if (error) console.error("Rename to geo failed:", error);
      else console.log("Renamed pillar slug 'generative-engine-optimization' -> 'geo'");
    } else {
      console.log("Both 'geo' and 'generative-engine-optimization' exist; skipping rename.");
    }
  }
}

let updated = 0, inserted = 0;
for (const e of entries) {
  // Look up existing row
  const { data: row } = await sb.from("pillars").select("id, hero_image_url").eq("slug", e.dbSlug).maybeSingle();
  const patch = {
    slug: e.dbSlug,
    title: e.title,
    subtitle: e.subtitle,
    body_html: e.body_html,
    faq: e.faq,
    published: true,
    robots: null,
    updated_at: new Date().toISOString(),
  };
  if (row) {
    // Preserve hero_image_url for verticals; only set if missing
    if (!row.hero_image_url && DISCIPLINE_HERO[e.dbSlug]) patch.hero_image_url = DISCIPLINE_HERO[e.dbSlug];
    const { error } = await sb.from("pillars").update(patch).eq("id", row.id);
    if (error) { console.error(`Update ${e.dbSlug} failed:`, error); continue; }
    updated++;
    console.log(`UPDATED ${e.dbSlug}`);
  } else {
    patch.hero_image_url = DISCIPLINE_HERO[e.dbSlug] || "/pillars/marketing.png";
    const { data: maxRow } = await sb.from("pillars").select("id").order("id", { ascending: false }).limit(1).maybeSingle();
    patch.id = (maxRow?.id ?? 0) + 1;
    const { error } = await sb.from("pillars").insert(patch);
    if (error) { console.error(`Insert ${e.dbSlug} failed:`, error); continue; }
    inserted++;
    console.log(`INSERTED ${e.dbSlug}`);
  }
}

console.log(`\nDone. Updated: ${updated}, Inserted: ${inserted}.`);
