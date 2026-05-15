import { createClient } from "@supabase/supabase-js";
const sb = createClient(
  process.env.EPR_SUPABASE_URL,
  process.env.EPR_SUPABASE_SERVICE_KEY,
  { auth: { persistSession: false } },
);
const ROWS = [
  [112927, 1, "sitzer-burnett-timeline", "The Sitzer-Burnett Timeline: How the Industry Explained the Settlement"],
  [112928, 2, "buyer-representation-agreements-consumer-conversation", "Buyer Representation Agreements: How Top Agents Talk to Consumers Now"],
  [112929, 3, "compass-exp-anywhere-brand-strategy-new-era", "Compass, eXp, Anywhere: Brand Strategy in the New Commission Era"],
  [112930, 4, "independent-vs-franchise-brokerages-2026", "Independent Brokerages vs. Franchise Models in 2026"],
  [112931, 5, "brokerage-recruiting-war-2026", "The Recruiting War: How Brokerages Communicate With Agents"],
  [112932, 6, "commission-transparency-consumer-trust", "Commission Transparency and Consumer Trust"],
];
for (const [id, pi, slug, title] of ROWS) {
  const { error } = await sb.from("posts").insert({
    id, slug, title, content_html: "", excerpt: null,
    type: "post", status: "draft", article_type: "cluster",
    pillar_slug: "real-estate", pillar_index: pi,
    parent_id: 112751, author_id: 1052, featured_media_id: null,
  });
  console.log(id, slug, error ? `ERR: ${error.message}` : "ok");
}
const { data } = await sb.from("posts").select("id,slug,parent_id,pillar_index,article_type,pillar_slug,status").in("id", ROWS.map(r => r[0])).order("id");
console.table(data);
