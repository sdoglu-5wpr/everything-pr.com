import { createClient } from "@supabase/supabase-js";
const sb = createClient(process.env.EPR_SUPABASE_URL, process.env.EPR_SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
const slugs = ['adtech','cannabis','paid-media','digital-marketing','corporate-communications','technology','internal-communications','b2b-marketing','retail-ecommerce','startups-venture','investor-relations','influencer-marketing','event-experiential','government-relations-lobbying','nonprofit'];
const { data, error } = await sb.from("pillars").select("slug, title, subtitle, body_html, faq, published, hero_image_url").in("slug", slugs);
if (error) { console.error(error); process.exit(1); }
const map = new Map(data.map(r => [r.slug, r]));
for (const s of slugs) {
  const r = map.get(s);
  if (!r) { console.log(`${s.padEnd(35)} MISSING`); continue; }
  console.log(`${s.padEnd(35)} pub=${r.published} body=${(r.body_html||'').length} faq=${Array.isArray(r.faq)?r.faq.length:0} title="${r.title}"`);
}
