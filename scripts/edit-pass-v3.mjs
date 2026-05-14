// Edit Pass v3 — Ronn's three universal rules
// Rule 1: add ™ after first mention of flagship reports (body prose only, idempotent, skip <a>)
// Rule 3: "AI engines" → "answer engines" with surrounding-context preservation heuristic
// Skipped slugs (10 new pillars): b2b defense luxury real-estate web3 sports travel public-affairs legal education
//
// Usage: node scripts/edit-pass-v3.mjs            # dry run
//        node scripts/edit-pass-v3.mjs --live     # write
import { createClient } from "@supabase/supabase-js";

const URL = process.env.EPR_SUPABASE_URL || process.env.SUPABASE_URL;
const KEY = process.env.EPR_SUPABASE_SERVICE_KEY;
if (!URL || !KEY) throw new Error("missing supabase env");
const supa = createClient(URL, KEY, { auth: { persistSession: false } });

const LIVE = process.argv.includes("--live");

const SKIP_PILLAR_SLUGS = new Set([
  "b2b","defense","luxury","real-estate","web3","sports","travel",
  "public-affairs","legal","education",
]);

const REPORT_NAMES = [
  "The Foreign Influence PR Study",
  "The China Lobbying Industry Map",
  "The Federal Agency PR & Communications Spend Transparency Study",
  "The Wealth Migration Report",
  "The Luxury AI Authority Index",
  "The University GEO Gap Study",
  "The Higher Ed PR Spend Transparency Study",
  "The Health Tech Trust Report",
  "The Hospitality Direct Report",
  "The Cannabis Communications Reality Report",
  "The FinServ Trust Report",
  "The Bank AI Disclosure Audit",
  "The Wealth Management AI Disclosure Audit",
  "The First GEO Benchmark",
  "The AI Visibility Index Series",
  "The Restricted Category AI Visibility Index",
  "The Crisis Velocity Report",
  "The SEC 8-K Era",
  "The Cyber Communications Audit",
  "The Beauty Authority Report",
  "The Gaming & Betting Brand Report",
  "The AdTech Reset Report",
  "The CPG Brand Power Index",
  "The 50 Websites That Decide Whether a Brand Exists Inside ChatGPT, Claude, and Perplexity",
  "The PR Pitch Response Rate Study",
];

// Build masked regions for a string: arrays of [start,end) inside <a>, <code>, <pre>, <kbd>
function maskedRanges(html) {
  const ranges = [];
  const rx = /<(a|code|pre|kbd)\b[^>]*>[\s\S]*?<\/\1>/gi;
  let m;
  while ((m = rx.exec(html)) !== null) {
    ranges.push([m.index, m.index + m[0].length]);
  }
  return ranges;
}
function inMasked(idx, ranges) {
  for (const [s, e] of ranges) if (idx >= s && idx < e) return true;
  return false;
}

// Rule 1: insert ™ after first qualifying occurrence of each report name
function addTrademarks(html) {
  if (!html) return { out: html, added: [] };
  let out = html;
  const added = [];
  for (const name of REPORT_NAMES) {
    const ranges = maskedRanges(out);
    let from = 0;
    while (true) {
      const idx = out.indexOf(name, from);
      if (idx === -1) break;
      if (inMasked(idx, ranges)) { from = idx + name.length; continue; }
      const after = out.slice(idx + name.length, idx + name.length + 2);
      if (after.startsWith("™")) { from = idx + name.length; break; } // already done; stop (first mention has it)
      // insert ™
      out = out.slice(0, idx + name.length) + "™" + out.slice(idx + name.length);
      added.push(name);
      break; // first mention only
    }
  }
  return { out, added };
}

// Rule 3: AI engines → answer engines, with preserve heuristic
// Only true model architectures/families — NOT consumer answer-engine products
// (ChatGPT, Claude, Perplexity, Gemini, Copilot, Bing Chat, Grok, You.com are
// answer engines themselves and should NOT trigger preservation).
const MODEL_NAMES = /\b(GPT-?3(?:\.5)?|GPT-?4o?|GPT-?5|Llama(?:-?[234])?|Mistral|Mixtral|DeepSeek|PaLM|Gemini-(?:Pro|Ultra)|Falcon|Claude-?[345](?:\.\d)?|Phi(?:-?3)?|Command(?:-?R)?|Cohere)\b/i;
const TECH_WORDS = /\b(model|underlying|API|weights|training|fine-?tuning)\b/i;

function replaceAiEngines(html) {
  if (!html) return { out: html, count: 0, preserved: [] };
  const ranges = maskedRanges(html);
  const rx = /\b(A\.?I\.?)\s+(E|e)(ngines?)\b/g;
  let count = 0;
  const preserved = [];
  let out = "";
  let last = 0;
  let m;
  while ((m = rx.exec(html)) !== null) {
    const start = m.index;
    const end = start + m[0].length;
    if (inMasked(start, ranges)) continue;
    const left100 = html.slice(Math.max(0, start - 100), start);
    const right100 = html.slice(end, end + 100);
    const left50 = html.slice(Math.max(0, start - 50), start);
    const right50 = html.slice(end, end + 50);
    const ctx100 = left100 + " " + right100;
    const ctx50 = left50 + " " + right50;
    if (MODEL_NAMES.test(ctx100) || TECH_WORDS.test(ctx50)) {
      // preserve
      const sentenceStart = Math.max(
        html.lastIndexOf(".", start),
        html.lastIndexOf("!", start),
        html.lastIndexOf("?", start),
        html.lastIndexOf(">", start),
      );
      const sentenceEnd = (() => {
        const cands = [".", "!", "?", "<"].map(c => {
          const i = html.indexOf(c, end);
          return i === -1 ? Infinity : i;
        });
        return Math.min(...cands);
      })();
      preserved.push(html.slice(sentenceStart + 1, sentenceEnd + 1).trim().slice(0, 240));
      continue;
    }
    // replace
    const cap = m[2]; // "E" or "e"
    // Check if at sentence start: preceded by start, ., !, ?, or > (block tag close), allowing whitespace
    const before = html.slice(Math.max(0, start - 3), start);
    const sentStart = /(^|[.!?>])\s*$/.test(before);
    const word = (cap === "E" || sentStart) ? "Answer" : "answer";
    const engineWord = (cap === "E") ? "Engine" : "engine";
    const plural = m[3].endsWith("s") ? "s" : "";
    out += html.slice(last, start) + `${word} ${engineWord}${plural}`;
    last = end;
    count++;
  }
  out += html.slice(last);
  return { out, count, preserved };
}

function applyAll(html) {
  const t = addTrademarks(html);
  const a = replaceAiEngines(t.out);
  return { out: a.out, tmAdded: t.added, aiCount: a.count, preserved: a.preserved };
}

function processFaq(faq) {
  if (!Array.isArray(faq)) return { out: faq, tmAdded: [], aiCount: 0, preserved: [] };
  let tmAdded = [], aiCount = 0, preserved = [];
  const out = faq.map(item => {
    const next = { ...item };
    for (const k of ["q","a"]) {
      if (typeof next[k] === "string") {
        const r = applyAll(next[k]);
        next[k] = r.out;
        tmAdded.push(...r.tmAdded);
        aiCount += r.aiCount;
        preserved.push(...r.preserved);
      }
    }
    return next;
  });
  return { out, tmAdded, aiCount, preserved };
}

const allPreserved = [];
const report = { pillars: [], posts: [] };

async function processPillars() {
  const { data, error } = await supa.from("pillars")
    .select("id, slug, body_html, subtitle, faq");
  if (error) throw error;
  for (const p of data) {
    if (SKIP_PILLAR_SLUGS.has(p.slug)) continue;
    const patch = {};
    let tm = [], ai = 0;

    const bh = applyAll(p.body_html || "");
    if (bh.out !== (p.body_html || "")) patch.body_html = bh.out;
    tm.push(...bh.tmAdded); ai += bh.aiCount; allPreserved.push(...bh.preserved.map(s => ({slug:p.slug, field:"body_html", s})));

    const sub = applyAll(p.subtitle || "");
    if (sub.out !== (p.subtitle || "") && p.subtitle) patch.subtitle = sub.out;
    tm.push(...sub.tmAdded); ai += sub.aiCount; allPreserved.push(...sub.preserved.map(s => ({slug:p.slug, field:"subtitle", s})));

    const fq = processFaq(p.faq || []);
    if (JSON.stringify(fq.out) !== JSON.stringify(p.faq || [])) patch.faq = fq.out;
    tm.push(...fq.tmAdded); ai += fq.aiCount; allPreserved.push(...fq.preserved.map(s => ({slug:p.slug, field:"faq", s})));

    if (Object.keys(patch).length === 0) continue;
    report.pillars.push({ id: p.id, slug: p.slug, tm_added: tm, ai_replaced: ai, fields: Object.keys(patch) });
    if (LIVE) {
      patch.updated_at = new Date().toISOString();
      const { error: uErr } = await supa.from("pillars").update(patch).eq("id", p.id);
      if (uErr) console.error("pillar update", p.slug, uErr.message);
    }
  }
}

async function processPosts() {
  // Pull posts that contain any candidate string
  // Paginate (Supabase default cap is 1000 rows)
  const PAGE = 1000;
  let from = 0;
  let data = [];
  while (true) {
    const { data: chunk, error } = await supa.from("posts")
      .select("id, slug, title, content_html, excerpt")
      .eq("status","publish")
      .order("id", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw error;
    if (!chunk || chunk.length === 0) break;
    data = data.concat(chunk);
    if (chunk.length < PAGE) break;
    from += PAGE;
  }
  for (const p of data) {
    const html = p.content_html || "";
    const ex = p.excerpt || "";
    const title = p.title || "";
    // quick skip if nothing relevant
    if (!/A\.?I\.?\s+engine/i.test(html + " " + ex + " " + title) &&
        !REPORT_NAMES.some(n => (html + " " + ex + " " + title).includes(n))) continue;

    const patch = {};
    let tm = [], ai = 0;
    const bh = applyAll(html);
    if (bh.out !== html) patch.content_html = bh.out;
    tm.push(...bh.tmAdded); ai += bh.aiCount; allPreserved.push(...bh.preserved.map(s => ({slug:p.slug, field:"content_html", s})));
    const ex2 = applyAll(ex);
    if (ex2.out !== ex && ex) patch.excerpt = ex2.out;
    tm.push(...ex2.tmAdded); ai += ex2.aiCount; allPreserved.push(...ex2.preserved.map(s => ({slug:p.slug, field:"excerpt", s})));
    const tt = applyAll(title);
    if (tt.out !== title && title) {
      patch.title = tt.out;
      report.titles ||= [];
      report.titles.push({ id: p.id, slug: p.slug, before: title, after: tt.out });
    }
    tm.push(...tt.tmAdded); ai += tt.aiCount; allPreserved.push(...tt.preserved.map(s => ({slug:p.slug, field:"title", s})));

    if (Object.keys(patch).length === 0) continue;
    report.posts.push({ id: p.id, slug: p.slug, tm_added: tm, ai_replaced: ai, fields: Object.keys(patch) });
    if (LIVE) {
      patch.modified_at = new Date().toISOString();
      const { error: uErr } = await supa.from("posts").update(patch).eq("id", p.id);
      if (uErr) console.error("post update", p.slug, uErr.message);
    }
  }
}

await processPillars();
await processPosts();

console.log(JSON.stringify({
  mode: LIVE ? "LIVE" : "DRY",
  pillars_changed: report.pillars.length,
  posts_changed: report.posts.length,
  total_tm_added: [...report.pillars, ...report.posts].reduce((a,r)=>a+r.tm_added.length,0),
  total_ai_replaced: [...report.pillars, ...report.posts].reduce((a,r)=>a+r.ai_replaced,0),
  preserved_count: allPreserved.length,
  pillars_sample: report.pillars.slice(0, 30),
  posts_sample: report.posts.slice(0, 20),
  titles_changed: (report.titles || []).length,
  titles_sample: (report.titles || []).slice(0, 20),
  preserved_samples: allPreserved.slice(0, 10),
}, null, 2));
