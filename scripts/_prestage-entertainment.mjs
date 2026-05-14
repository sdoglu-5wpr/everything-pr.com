import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.EPR_SUPABASE_URL || process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.EPR_SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });

const CATEGORY_ID = 22744;
const AUTHOR_ID = 1052;
const PILLAR_SLUG = "entertainment-media";

const ROWS = [
  [1, "state-of-entertainment-2026", "The State of Entertainment in 2026"],
  [2, "ai-entertainment-communications-playbook", "AI and the Entertainment Industry: The Communications Playbook"],
  [3, "sports-league-team-communications", "Sports League and Team Communications"],
  [4, "streaming-media-company-communications", "Streaming and Media Company Communications"],
  [5, "music-industry-communications", "Music Industry Communications"],
  [6, "awards-season-campaign-communications", "Awards Season and Campaign Communications"],
  [7, "crisis-communications-entertainment", "Crisis Communications in Entertainment"],
  [8, "creator-economy-influencer-communications", "Creator Economy and Influencer Communications"],
  [9, "gaming-esports-communications", "Gaming and Esports Communications"],
  [10, "live-events-touring-communications", "Live Events and Touring Communications"],
];

// Find next available id
const { data: maxRow } = await sb.from("posts").select("id").order("id", { ascending: false }).limit(1).maybeSingle();
let nextId = (maxRow?.id ?? 0) + 1;

const inserts = ROWS.map(([pi, slug, title]) => ({
  id: nextId++,
  slug,
  title,
  type: "post",
  status: "draft",
  article_type: "pillar",
  pillar_slug: PILLAR_SLUG,
  pillar_index: pi,
  author_id: AUTHOR_ID,
  featured_media_id: null,
  content_html: "",
  excerpt: null,
  comment_status: "closed",
}));

const { data, error } = await sb.from("posts").insert(inserts).select("id, slug, pillar_index");
if (error) { console.error(error); process.exit(1); }

// Attach to category
const cats = data.map((r) => ({ post_id: r.id, category_id: CATEGORY_ID }));
const { error: cerr } = await sb.from("post_categories").insert(cats);
if (cerr) { console.error(cerr); process.exit(1); }

console.log("Inserted:");
for (const r of data.sort((a, b) => a.pillar_index - b.pillar_index)) {
  console.log(`  pi=${r.pillar_index} id=${r.id} slug=${r.slug}`);
}
