// Generate long-form pillar content (body_html + faq) for placeholder pillars
// using Lovable AI Gateway (Gemini), modeled on the /cannabis pillar.
//
// Usage:
//   bun scripts/gen-pillar-content.mjs <slug> [slug ...]
//   bun scripts/gen-pillar-content.mjs --all
//   add --dry to preview without writing
import { createClient } from "@supabase/supabase-js";

const TARGETS = [
  ["paid-media", "Paid Media", "PR & communications pillar covering paid media's role in earned-media amplification, integrated campaigns, performance vs brand spend, retail media, programmatic, and how comms teams collaborate with media buyers."],
  ["digital-marketing", "Digital Marketing", "PR & communications pillar covering digital marketing as it intersects with comms: SEO, GEO/AI-citation visibility, content marketing, performance marketing, attribution, creator economy, retail media, and CMO/CCO alignment."],
  ["corporate-communications", "Corporate Communications", "PR & communications pillar covering corporate reputation, executive visibility, CEO authority, the reputation citation layer, investor and stakeholder narrative, crisis response, and stale-reputation drift in AI answer engines."],
  ["technology", "Technology Communications", "PR & communications pillar covering tech-sector comms: AI, cybersecurity, enterprise SaaS, developer relations, founder narrative, product launches, analyst relations, regulatory scrutiny."],
  ["internal-communications", "Internal Communications", "PR & communications pillar covering employee comms, change management, CEO-to-employee channels, RTO comms, layoff comms, internal-to-external leak risk, manager enablement, and culture narrative."],
  ["b2b-marketing", "B2B Marketing", "PR & communications pillar covering B2B brand and demand: category creation, analyst relations, ABM, thought leadership, sales enablement content, founder-led GTM, and pipeline attribution."],
  ["retail-ecommerce", "Retail & eCommerce Communications", "PR & communications pillar for retailers and DTC brands: brand reputation, holiday/seasonal moments, retail media, in-store experience, marketplace dynamics (Amazon, TikTok Shop), founder/CEO visibility, supply-chain crisis."],
  ["startups-venture", "Startups & Venture Communications", "PR & communications pillar for startups, scaleups, and VCs: funding announcements, founder positioning, category creation, narrative-led fundraising, exit comms, portfolio brand-building."],
  ["investor-relations", "Investor Relations", "PR & communications pillar covering IR for public and pre-IPO companies: earnings narrative, sell-side relationships, retail investor comms, activist defense, ESG disclosures, IPO roadshow comms, Reg FD."],
  ["influencer-marketing", "Influencer Marketing", "PR & communications pillar covering creator and influencer programs: talent partnerships, FTC disclosure, brand-safety, creator-as-media, UGC at scale, measurement, and integration with earned PR."],
  ["event-experiential", "Event & Experiential Marketing", "PR & communications pillar covering trade shows, brand activations, sponsorships, conference strategy, press-day mechanics, founder keynotes, and earned amplification of live moments."],
  ["government-relations-lobbying", "Government Relations & Lobbying", "PR & communications pillar covering federal and state lobbying, policy comms, coalition-building, regulator engagement, grassroots/grasstops, and the public-affairs / GR overlap."],
  ["nonprofit", "Nonprofit Communications", "PR & communications pillar covering nonprofit and foundation comms: donor narrative, mission storytelling, impact reporting, advocacy campaigns, executive-director visibility, crisis and donor-trust events."],
];

const args = process.argv.slice(2);
const DRY = args.includes("--dry");
const ALL = args.includes("--all");
const slugs = ALL ? TARGETS.map(t => t[0]) : args.filter(a => !a.startsWith("--"));
if (!slugs.length) { console.error("usage: gen-pillar-content.mjs --all | <slug> [slug ...]"); process.exit(1); }

const SB_URL = process.env.EPR_SUPABASE_URL;
const SB_KEY = process.env.EPR_SUPABASE_SERVICE_KEY;
const AI_KEY = process.env.LOVABLE_API_KEY;
if (!SB_URL || !SB_KEY) { console.error("missing supabase env"); process.exit(1); }
if (!AI_KEY) { console.error("missing LOVABLE_API_KEY"); process.exit(1); }
const sb = createClient(SB_URL, SB_KEY, { auth: { persistSession: false } });

const SYSTEM = `You are an editorial writer for Everything-PR, a trade publication covering public relations, communications, and marketing.

You write pillar pages — definitive, evergreen explainers for one discipline or sector. Your benchmark is the /cannabis pillar: ~3,500-4,500 words of HTML, structured with <h2> section headings and <p> paragraphs (use <h3> sparingly, <ul><li> for lists, <strong> for emphasis). No <h1>. No markdown. No links. No code fences. No preamble.

Voice: confident, specific, analyst-grade. Name real companies, agencies, platforms, regulations, and frameworks where genuinely relevant. Avoid vendor puffery and generic "in today's digital landscape" filler. Reference 2025-2026 trends (AI answer engines / GEO, citation share, attribution challenges, platform shifts). Treat the reader as a senior comms or marketing operator.

Structure every pillar with these H2 sections, adapted to the topic:
1. Opening 2-3 paragraphs framing why the discipline matters right now (no H2 header on the opener).
2. "What [Discipline] Means in 2026" — definition + scope.
3. "The [Discipline] Landscape" — players, agencies, in-house teams, key categories.
4. 4-7 additional H2 sections covering the core sub-disciplines, frameworks, tactics, measurement, regulatory/structural constraints, and the AI/GEO citation layer where applicable.
5. "What Comes Next" or equivalent closing section.

Return STRICT JSON only, matching this shape exactly:
{
  "subtitle": "one-line tagline, under 120 chars, no period",
  "body_html": "<p>...</p><h2>...</h2><p>...</p> ... full HTML body, 3500-4500 words",
  "faq": [
    { "q": "Question 1?", "a": "Plain-text answer, 1-3 sentences." },
    ... exactly 8 items
  ]
}`;

async function callGemini(userPrompt) {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": AI_KEY,
      "X-Lovable-AIG-SDK": "vercel-ai-sdk",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-pro",
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      max_tokens: 16000,
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`AI ${res.status}: ${t.slice(0, 500)}`);
  }
  const j = await res.json();
  const content = j.choices?.[0]?.message?.content;
  if (!content) throw new Error("empty AI response");
  // strip code fences if any slipped through
  const cleaned = content.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  try { return JSON.parse(cleaned); }
  catch (e) {
    console.error(`  raw response tail: ...${cleaned.slice(-300)}`);
    console.error(`  finish_reason: ${j.choices?.[0]?.finish_reason}`);
    throw e;
  }
}

let ok = 0, fail = 0;
for (const slug of slugs) {
  const target = TARGETS.find(t => t[0] === slug);
  if (!target) { console.error(`SKIP unknown slug: ${slug}`); fail++; continue; }
  const [_, title, brief] = target;
  console.log(`\n=== ${slug} — generating ===`);
  try {
    const prompt = `Write the Everything-PR pillar page for: ${title} (route: /${slug}).

Scope brief: ${brief}

Match the depth, structure, and tone of the /cannabis pillar. Aim for 3500-4500 words of body_html. Include 8 FAQ items genuinely useful to a senior comms/marketing reader (cover scope, agencies, budgets, measurement, AI/GEO, common mistakes, hiring, what's changing). Return JSON only.`;
    const out = await callGemini(prompt);
    if (!out.subtitle || !out.body_html || !Array.isArray(out.faq)) throw new Error("bad shape");
    if (out.faq.length < 6) throw new Error(`faq too short: ${out.faq.length}`);
    const bodyLen = out.body_html.length;
    console.log(`  subtitle="${out.subtitle.slice(0,80)}"`);
    console.log(`  body=${bodyLen}ch  faq=${out.faq.length}`);
    if (bodyLen < 6000) console.warn(`  WARN: body short (${bodyLen}ch)`);

    if (DRY) { ok++; continue; }
    const { error } = await sb.from("pillars").update({
      subtitle: out.subtitle,
      body_html: out.body_html,
      faq: out.faq,
      published: true,
      updated_at: new Date().toISOString(),
    }).eq("slug", slug);
    if (error) throw new Error(error.message);
    console.log(`  OK upserted & published`);
    ok++;
  } catch (e) {
    console.error(`  FAIL ${slug}: ${e.message}`);
    fail++;
  }
}
console.log(`\nDone. ok=${ok} fail=${fail}`);
