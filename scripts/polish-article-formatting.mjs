// Deterministic + AI formatter for posts.
// Usage: node polish.mjs [--live] [--limit=N] [--ids=1,2,3]
import { createClient } from "@supabase/supabase-js";

const SUPA_URL = process.env.EPR_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPA_KEY = process.env.EPR_SUPABASE_SERVICE_KEY;
const LOVABLE_KEY = process.env.LOVABLE_API_KEY;
if (!SUPA_URL || !SUPA_KEY) throw new Error("missing supabase env");

const supa = createClient(SUPA_URL, SUPA_KEY, { auth: { persistSession: false } });

const args = process.argv.slice(2);
const LIVE = args.includes("--live");
const LIMIT = Number((args.find(a => a.startsWith("--limit=")) || "").split("=")[1]) || 0;
const IDS = ((args.find(a => a.startsWith("--ids=")) || "").split("=")[1] || "")
  .split(",").map(s => s.trim()).filter(Boolean).map(Number);

const KNOWN_HEADINGS = [
  "Methodology","Key Findings","Conclusion","Background","Introduction",
  "Recommendations","Summary","Key Takeaways","Takeaways","Overview",
  "The Headline Number","What This Means","Why It Matters","What's Next",
  "What This Means For PR","What This Means For Comms","What This Means For Brands",
  "90-Day Execution Plan","30-Day Execution Plan","60-Day Execution Plan",
  "Execution Plan","The Bottom Line","Bottom Line","The Stakes","The Opportunity",
  "Citations","Sources","About","About 5W","About EPR","About 5W Public Relations",
  "Definitions","FAQ","Frequently Asked Questions",
];
const KNOWN_RX = new RegExp(
  "^(?:" + KNOWN_HEADINGS.map(h => h.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|") + ")[:.]?$",
  "i"
);

function htmlText(s) {
  return s.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/\s+/g, " ").trim();
}

function deterministicPass(html) {
  let changes = 0;
  let out = html;

  // 1) <p>N. Heading</p> where the entire content is "N. Title" (<= 140 chars), promote to <h2>
  out = out.replace(/<p>\s*((?:\d{1,2})\.\s+[^<\n]{2,140})\s*<\/p>/g, (m, body) => {
    const text = body.trim();
    // require it to look like a heading: doesn't end in period+space+lowercase, no comma+long tail
    if (text.length > 140) return m;
    if (/[.!?]\s+\S/.test(text.replace(/^\d{1,2}\.\s+/, ""))) return m; // multi-sentence => paragraph
    changes++;
    const clean = text.replace(/^(\d{1,2})\.\s+/, "$1. ");
    return `<h2>${clean}</h2>`;
  });

  // 2) <p><strong>Heading</strong></p> alone -> <h2>
  out = out.replace(/<p>\s*<strong>([^<]{2,140})<\/strong>\s*<\/p>/g, (m, body) => {
    const text = body.trim();
    if (/[.!?]\s+\S/.test(text)) return m;
    changes++;
    return `<h2>${text}</h2>`;
  });

  // 3) <p>Known Heading</p> alone -> <h2>
  out = out.replace(/<p>\s*([^<\n]{2,80})\s*<\/p>/g, (m, body) => {
    const text = body.trim();
    if (!KNOWN_RX.test(text)) return m;
    changes++;
    return `<h2>${text.replace(/[:.]$/, "")}</h2>`;
  });

  return { html: out, changes };
}

function countTags(html, tag) {
  const rx = new RegExp(`<${tag}\\b`, "gi");
  return (html.match(rx) || []).length;
}

async function aiPass(html, title) {
  if (!LOVABLE_KEY) return null;
  const prompt = `You are an HTML formatter. The article below has poor structure (mostly <p> tags, no headings). Insert <h2> and where appropriate <h3> headings to break it into clear sections.

STRICT RULES:
- DO NOT change, rewrite, paraphrase, add, or remove any words.
- DO NOT add or remove paragraphs, links, images, lists, or figures.
- ONLY change tag names: a <p> that is clearly a section label becomes <h2> (or <h3> for sub-sections). You may also remove <strong>/<em> wrapping when you promote a paragraph to a heading.
- Output ONLY the modified HTML, no commentary, no markdown fences.
- If the article truly has no natural section breaks, return the original HTML unchanged.

Article title: ${title}

HTML:
${html}`;

  const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${LOVABLE_KEY}` },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!r.ok) {
    console.error("AI fail", r.status, await r.text());
    return null;
  }
  const j = await r.json();
  let txt = j.choices?.[0]?.message?.content?.trim() || "";
  txt = txt.replace(/^```(?:html)?\s*/i, "").replace(/```\s*$/, "").trim();
  return txt || null;
}

function validate(orig, next) {
  if (!next || next.length < 50) return "empty";
  const a = htmlText(orig), b = htmlText(next);
  const ratio = b.length / Math.max(a.length, 1);
  if (ratio < 0.95 || ratio > 1.10) return `text-len ${ratio.toFixed(3)}`;
  if (countTags(orig, "a") !== countTags(next, "a")) return "anchor count";
  if (countTags(orig, "img") !== countTags(next, "img")) return "img count";
  return null;
}

async function main() {
  let q = supa.from("posts")
    .select("id, slug, title, content_html, published_at")
    .eq("status", "publish").eq("type", "post")
    .gte("published_at", new Date(Date.now() - 90 * 86400000).toISOString())
    .order("published_at", { ascending: false });
  if (IDS.length) q = supa.from("posts").select("id, slug, title, content_html, published_at").in("id", IDS);
  const { data, error } = await q;
  if (error) throw error;

  const report = [];
  let processed = 0;
  for (const p of data) {
    if (LIMIT && processed >= LIMIT) break;
    const html = p.content_html || "";
    const h2Before = countTags(html, "h2") + countTags(html, "h3");

    let { html: stage1, changes } = deterministicPass(html);
    let used = changes ? "deterministic" : null;
    let finalHtml = stage1;

    if (!changes && h2Before === 0 && html.length > 800) {
      const ai = await aiPass(html, p.title);
      if (ai && ai !== html) {
        const err = validate(html, ai);
        if (err) {
          report.push({ id: p.id, slug: p.slug, action: "skipped-ai", reason: err });
          continue;
        }
        // count headings introduced
        const h2After = countTags(ai, "h2") + countTags(ai, "h3");
        if (h2After > h2Before) {
          finalHtml = ai;
          used = "ai";
        }
      }
    }

    if (!used) {
      report.push({ id: p.id, slug: p.slug, action: "skip-no-change" });
      continue;
    }

    const h2After = countTags(finalHtml, "h2") + countTags(finalHtml, "h3");
    report.push({ id: p.id, slug: p.slug, action: used, h_before: h2Before, h_after: h2After });
    processed++;

    if (LIVE) {
      // snapshot
      await supa.from("post_revisions").insert({
        post_id: p.id, kind: "autosave",
        title: p.title, content_html: html,
      });
      const { error: uErr } = await supa.from("posts").update({
        content_html: finalHtml, modified_at: new Date().toISOString(),
      }).eq("id", p.id);
      if (uErr) {
        report[report.length - 1].action = "update-error";
        report[report.length - 1].error = uErr.message;
      }
      await new Promise(r => setTimeout(r, 200));
    } else {
      // write diff sample
    }
  }

  console.log(JSON.stringify({
    mode: LIVE ? "LIVE" : "DRY",
    scanned: data.length,
    changed: report.filter(r => r.action === "deterministic" || r.action === "ai").length,
    by: {
      deterministic: report.filter(r => r.action === "deterministic").length,
      ai: report.filter(r => r.action === "ai").length,
      skip_no_change: report.filter(r => r.action === "skip-no-change").length,
      skipped_ai: report.filter(r => r.action === "skipped-ai").length,
      errors: report.filter(r => r.action === "update-error").length,
    },
    sample: report.filter(r => r.action === "deterministic" || r.action === "ai").slice(0, 30),
    skipped_ai: report.filter(r => r.action === "skipped-ai").slice(0, 10),
  }, null, 2));
}

main().catch(e => { console.error(e); process.exit(1); });
