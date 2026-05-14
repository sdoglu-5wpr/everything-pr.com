// Phase 2a second-pass — Inject cross-pillar sibling links into the 6
// /public-affairs/ long-form articles. Idempotent: skips a target if a link
// to that slug already exists in the article.
//
// Usage:
//   bun run scripts/link-public-affairs-siblings.mjs           # write
//   bun run scripts/link-public-affairs-siblings.mjs --dry     # report only

import { createClient } from "@supabase/supabase-js";

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

// Anchor map: each row groups synonymous phrases that all point to one slug.
// One link per row per article (first match only).
const ROWS = [
  {
    target: "/fara-disclosure-reputation-collapse/",
    phrases: [
      "FARA-triggering",
      "FARA-adjacent",
      "FARA registration",
      "FARA filings",
    ],
  },
  {
    target: "/federal-lobbying-communications/",
    phrases: [
      "Lobbying Disclosure Act",
      "federal lobbying",
    ],
    // case-sensitive constraint for "Lobbying Disclosure Act" handled below
  },
  {
    target: "/state-public-affairs/",
    phrases: [
      "state AG investigations",
      "state attorneys general",
      "state-level engagement",
      "state public affairs",
      "state AGs",
    ],
  },
  {
    target: "/coalition-strategy/",
    phrases: [
      "coalition-funded polling",
      "coalition campaigns",
      "coalition strategy",
    ],
  },
  {
    target: "/foreign-principal-communications/",
    phrases: [
      "representing foreign principals",
      "foreign principals",
      "foreign principal",
    ],
  },
  {
    target: "/regulatory-engagement/",
    phrases: [
      "regulatory communications",
      "regulatory engagement",
    ],
  },
];

const SLUGS = ROWS.map((r) => r.target.replace(/\//g, ""));

// Skip phrase inside these tags (case-insensitive open tags)
const SKIP_TAGS = ["a", "code", "pre", "kbd", "h1", "h2", "h3", "h4", "h5", "h6"];

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Build a list of [start,end) ranges in html where matches must be skipped.
function buildSkipRanges(html) {
  const ranges = [];
  for (const tag of SKIP_TAGS) {
    const re = new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?</${tag}>`, "gi");
    let m;
    while ((m = re.exec(html)) !== null) {
      ranges.push([m.index, m.index + m[0].length]);
    }
  }
  return ranges;
}

function inSkip(idx, ranges) {
  for (const [a, b] of ranges) {
    if (idx >= a && idx < b) return true;
  }
  return false;
}

function findFirstMatch(html, phrase, skipRanges, caseSensitive = false) {
  const flags = caseSensitive ? "g" : "gi";
  // Word-ish boundary: require non-letter/digit/hyphen before & after, but
  // only when phrase boundary char is letter/digit. Use lookarounds.
  const re = new RegExp(
    `(?<![A-Za-z0-9-])${escapeRegex(phrase)}(?![A-Za-z0-9-])`,
    flags,
  );
  let m;
  while ((m = re.exec(html)) !== null) {
    if (!inSkip(m.index, skipRanges)) {
      return { index: m.index, length: m[0].length, text: m[0] };
    }
  }
  return null;
}

function processArticle(html, selfTarget) {
  const added = [];
  let cur = html;
  for (const row of ROWS) {
    if (row.target === selfTarget) continue;
    // Idempotency: skip if a link to this target already exists
    if (cur.includes(`href="${row.target}"`)) continue;

    let best = null; // {phrase, index, length, text}
    for (const phrase of row.phrases) {
      const caseSensitive = phrase === "Lobbying Disclosure Act";
      const skipRanges = buildSkipRanges(cur);
      const hit = findFirstMatch(cur, phrase, skipRanges, caseSensitive);
      if (hit && (!best || hit.index < best.index || hit.length > best.length)) {
        // longest match wins among phrases that match; we already iterate
        // longest-first in ROWS.phrases, so first hit is fine.
        best = { phrase, ...hit };
        break;
      }
    }
    if (!best) continue;
    const before = cur.slice(0, best.index);
    const after = cur.slice(best.index + best.length);
    const anchor = `<a href="${row.target}">${best.text}</a>`;
    cur = before + anchor + after;
    added.push({ text: best.text, target: row.target });
  }
  return { html: cur, added };
}

async function run() {
  const { data: rows, error } = await sb
    .from("posts")
    .select("id, slug, content_html")
    .eq("pillar_slug", "public-affairs")
    .eq("article_type", "pillar")
    .order("pillar_index", { ascending: true });
  if (error) throw error;
  if (!rows?.length) {
    console.error("No public-affairs pillar articles found.");
    process.exit(1);
  }

  console.log(`Found ${rows.length} articles.\n`);

  for (const row of rows) {
    const selfTarget = `/${row.slug}/`;
    const { html, added } = processArticle(row.content_html, selfTarget);

    // Count total sibling links (any of the 6 slugs) after pass
    let total = 0;
    for (const s of SLUGS) {
      const re = new RegExp(`href="/${s}/"`, "g");
      total += (html.match(re) || []).length;
    }

    console.log(`── /${row.slug}/`);
    if (added.length === 0) {
      console.log("   (no new sibling links)");
    } else {
      for (const a of added) {
        console.log(`   + "${a.text}" → ${a.target}`);
      }
    }
    console.log(`   total sibling links now: ${total}`);

    if (!DRY && added.length > 0) {
      const { error: upErr } = await sb
        .from("posts")
        .update({ content_html: html, updated_at: new Date().toISOString() })
        .eq("id", row.id);
      if (upErr) {
        console.error(`   ! update failed: ${upErr.message}`);
      } else {
        console.log("   ✓ saved");
      }
    } else if (DRY) {
      console.log("   (dry run — not saved)");
    }
    console.log();
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
