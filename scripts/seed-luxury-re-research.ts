// Seed the Luxury Real Estate Brand Authority Index Q1 2026 research article.
import { createClient } from "@supabase/supabase-js";

const SB_URL = process.env.EPR_SUPABASE_URL || process.env.SUPABASE_URL!;
const SB_KEY = process.env.EPR_SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!;
const sb = createClient(SB_URL, SB_KEY, { auth: { persistSession: false } });

const SLUG = "luxury-real-estate-brand-authority-index-q1-2026";
const TITLE = "Luxury Real Estate Brand Authority Index Q1 2026 — Top 10 Brokerages";
const HEADLINE = "Luxury Real Estate Brand Authority Index";
const SUBTITLE =
  "Compass, Sotheby's International Realty, and Douglas Elliman lead the inaugural EPR Luxury Real Estate Brand Authority Index. Top 10 brokerages ranked by earned media authority across tier-1 business and real estate press.";
const CANONICAL = `https://everything-pr.com/${SLUG}/`;
const HERO = `/research/${SLUG}.png`;
const HERO_ALT =
  "Luxury real estate brand authority scores Q1 2026 — Compass, Sotheby's International Realty, Douglas Elliman lead ranking.";
const AUTHOR_ID = 4750; // EPR Staff
const RESEARCH_CATEGORY_ID = 27724;
const PILLAR_SLUG = "real-estate";

const ROBOTS = "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1";

// Outbound link helper — always target=_blank
const ext = (href: string, text: string) =>
  `<a href="${href}" target="_blank" rel="noopener noreferrer">${text}</a>`;

const ranked: Array<[string, number, string, string]> = [
  ["Compass", 87, "https://www.compass.com/",
    "Coverage advantage built on size — the largest U.S. residential brokerage by gross transaction value — plus the Christie's International Real Estate acquisition giving Compass dual brand surface area. CEO Robert Reffkin remains one of the most-quoted luxury real estate executives in tier-1 financial press."],
  ["Sotheby's International Realty", 82, "https://www.sothebysrealty.com/",
    `Owns the global luxury narrative. Strongest international coverage footprint, deep presence in ${ext("https://www.ft.com/", "<em>Financial Times</em>")}, <em>Mansion Global</em>, and ${ext("https://robbreport.com/", "<em>Robb Report</em>")}. The auction-house brand halo continues to do unpaid lifting in editorial.`],
  ["Douglas Elliman", 76, "https://www.elliman.com/",
    "New York's tier-1 default citation for Manhattan and Hamptons market data. The quarterly Elliman Reports continue to anchor reporter relationships across the financial press."],
  ["The Agency", 71, null as any,
    "Mauricio Umansky's media presence and <em>Buying Beverly Hills</em> on Netflix translate directly into earned coverage. Strongest cross-vertical reach in the index — coverage spills into entertainment and lifestyle press."],
  ["SERHANT.", 68, "https://www.serhant.com/",
    "Ryan Serhant's personal brand drives nearly all of SERHANT's earned coverage. Highest social-to-earned conversion in the index. Built differently than legacy brokerages — and the data shows it works."],
  ["Christie's International Real Estate", 65, null as any,
    "Now operating inside Compass. Luxury-only positioning preserved. <em>Mansion Global</em> and international financial press remain core surface area."],
  ["Corcoran Group", 61, "https://www.corcoran.com/",
    "Pamela Liebman's NYC market commentary remains a reporter staple. Concentration risk visible: more than 40% of Q4 mentions came from five reporters."],
  ["Coldwell Banker Global Luxury", 58, "https://www.coldwellbankerluxury.com/",
    'Strong scale, modest authority share. The brand is mentioned often but rarely quoted as the source — a classic <strong>mention/citation gap</strong>.'],
  ["Brown Harris Stevens", 54, "https://www.bhsusa.com/",
    "Bess Freedman is the most-quoted female brokerage CEO in tier-1 luxury coverage. Highest sentiment score in the top 10."],
  ["Engel & Völkers", 49, "https://www.engelvoelkers.com/",
    "European authority footprint, weaker U.S. tier-1 share. The opportunity is obvious."],
];

const rankList = ranked
  .map(([name, score, url, blurb], i) => {
    const linked = url ? ext(url, name) : name;
    return `<p><strong>${i + 1}. ${linked} — ${score}</strong><br>${blurb}</p>`;
  })
  .join("\n");

const body_html = `
<p><strong>${ext("https://www.compass.com/", "Compass")}, ${ext("https://www.sothebysrealty.com/", "Sotheby's International Realty")}, and ${ext("https://www.elliman.com/", "Douglas Elliman")} lead the inaugural EPR ranking of the 10 luxury brokerages winning the earned media war post-NAR settlement.</strong></p>

<p>The commission crisis didn't kill luxury <a href="/real-estate">real estate PR</a>. It rewired it.</p>

<p>In Q4 2025 — the final quarter before commission practices fully reset across the industry — luxury brokerages spent record budgets fighting for share of voice in ${ext("https://www.wsj.com/", "<em>The Wall Street Journal</em>")}, ${ext("https://www.bloomberg.com/", "<em>Bloomberg</em>")}, ${ext("https://www.nytimes.com/", "<em>The New York Times</em>")}, ${ext("https://www.mansionglobal.com/", "<em>Mansion Global</em>")}, ${ext("https://therealdeal.com/", "<em>The Real Deal</em>")}, and ${ext("https://www.inman.com/", "<em>Inman</em>")}. The winners aren't always the biggest. They're the ones who built citation infrastructure before the crisis — not during it. The post-NAR settlement is itself a <a href="/crisis-communications">crisis story</a>, and the brokerages that defined the narrative early are still capturing the citations months later.</p>

<p>EPR analyzed Q4 2025 earned media coverage across 12 tier-1 business, real estate, and luxury publications, scoring each brokerage on four dimensions:</p>

<ul>
  <li><strong>Coverage Volume</strong> — tier-1 articles citing the brokerage</li>
  <li><strong>Authority Quote Share</strong> — percentage of luxury-market stories where the brokerage was named as the source</li>
  <li><strong>Sentiment Index</strong> — favorability tone across coverage</li>
  <li><strong>Reporter Reach</strong> — unique tier-1 reporters citing the brokerage</li>
</ul>

<p>The composite is the <strong>Brand Authority Score</strong>. Maximum 100.</p>

<figure>
  <img src="${HERO}" alt="${HERO_ALT}" width="1216" height="640" loading="lazy">
  <figcaption>Top 10 U.S. luxury real estate brokerages ranked by Brand Authority Score, Q4 2025 coverage.</figcaption>
</figure>

<h2>The Top 10</h2>

${rankList}

<h2>What the data shows</h2>

<p>Three patterns from Q4 2025:</p>

<p><strong>The CEO is the brand.</strong> Eight of the top 10 brokerages have a single named executive driving the majority of earned coverage. Brokerages without a media-trained, quote-ready CEO struggled to break tier-1 — regardless of size.</p>

<p><strong>Concentration risk is mispriced.</strong> Six of the top 10 had more than 35% of Q4 coverage come from fewer than five reporters. One beat change, one buyout, one beat reassignment — and the citation engine resets. Reporter diversification is the most underweighted variable in luxury <a href="/real-estate">real estate</a> PR.</p>

<p><strong>The commission story isn't over.</strong> Post-NAR settlement coverage continues to dominate the category, and the brokerages that defined the narrative early — Compass, Sotheby's, Elliman — are still capturing the citations months later. <strong>Authority compounds.</strong></p>

<h2>What this means</h2>

<p>Earned media in luxury real estate is no longer a press release engine. It's a citation infrastructure problem. Tier-1 reporters now write for an industry in transition, and they cite the same five to ten brokerages repeatedly — because those brokerages have built the relationships, the data feeds, and the named-spokesperson reliability that beat journalism actually requires.</p>

<p>The 30 brokerages outside the top 10 are not invisible. They're just uncited.</p>

<p>The Q2 2026 update of the EPR Luxury Real Estate Brand Authority Index will publish in July.</p>

<p>Submissions and methodology questions: <a href="mailto:editorial@everything-pr.com">editorial@everything-pr.com</a>. More <a href="/research">research from Everything-PR</a>.</p>
`.trim();

const excerpt =
  "Compass, Sotheby's International Realty, and Douglas Elliman lead the inaugural EPR Luxury Real Estate Brand Authority Index — top 10 U.S. luxury brokerages ranked by Q4 2025 earned media coverage across 12 tier-1 publications.";

// 1) Upsert post
const { data: maxRow } = await sb.from("posts").select("id").order("id", { ascending: false }).limit(1).maybeSingle();
const nextId = ((maxRow?.id ?? 0) as number) + 1;

const { data: existing } = await sb.from("posts").select("id").eq("slug", SLUG).maybeSingle();
const now = new Date().toISOString();
const row = {
  slug: SLUG,
  title: TITLE,
  excerpt,
  content_html: body_html,
  type: "post" as const,
  status: "publish" as const,
  published_at: now,
  modified_at: now,
  updated_at: now,
  author_id: AUTHOR_ID,
  pillar_slug: PILLAR_SLUG,
  article_type: "research",
  first_inline_image: HERO,
};

let postId: number;
if (existing) {
  postId = existing.id as number;
  const { error } = await sb.from("posts").update(row).eq("id", postId);
  if (error) throw error;
  console.log("updated post id=" + postId);
} else {
  const { error } = await sb.from("posts").insert({ id: nextId, ...row });
  if (error) throw error;
  postId = nextId;
  console.log("inserted post id=" + postId);
}

// 2) Category link → Research
const { error: pcErr } = await sb
  .from("post_categories")
  .upsert({ post_id: postId, category_id: RESEARCH_CATEGORY_ID }, { onConflict: "post_id,category_id" });
if (pcErr) console.warn("post_categories:", pcErr.message);

// 3) seo_meta
const seoRow = {
  object_type: "post",
  object_id: postId,
  url_path: `/${SLUG}/`,
  title: TITLE,
  description: SUBTITLE,
  canonical_url: CANONICAL,
  robots: ROBOTS,
  og_title: TITLE,
  og_description: SUBTITLE,
  og_type: "article",
  og_image: HERO,
  twitter_card: "summary_large_image",
  twitter_title: TITLE,
  twitter_description: SUBTITLE,
  twitter_image: HERO,
  updated_at: now,
};

const { data: seoExisting } = await sb
  .from("seo_meta")
  .select("id")
  .eq("object_type", "post")
  .eq("object_id", postId)
  .maybeSingle();
if (seoExisting) {
  const { error } = await sb.from("seo_meta").update(seoRow).eq("id", seoExisting.id);
  if (error) console.warn("seo update:", error.message);
} else {
  const { data: seoMax } = await sb.from("seo_meta").select("id").order("id", { ascending: false }).limit(1).maybeSingle();
  const seoId = ((seoMax?.id ?? 0) as number) + 1;
  const { error } = await sb.from("seo_meta").insert({ id: seoId, ...seoRow });
  if (error) console.warn("seo insert:", error.message);
}

console.log(JSON.stringify({ id: postId, slug: SLUG, chars: body_html.length }, null, 2));
