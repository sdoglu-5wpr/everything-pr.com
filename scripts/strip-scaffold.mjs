#!/usr/bin/env node
// Second pass: strip internal editorial scaffolding that leaked into bodies:
//   - leading <h2>PILLAR PAGE</h2>
//   - leading/intra <h2 id="cluster-…">CLUSTER X.Y — …</h2> headings
//   - <p>---</p> / <p>—</p> separator paragraphs
import { createClient } from "@supabase/supabase-js";

const sb = createClient(process.env.EPR_SUPABASE_URL, process.env.EPR_SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});

async function fetchAll() {
  const out = [];
  let from = 0;
  const pageSize = 200;
  while (true) {
    const { data, error } = await sb
      .from("posts")
      .select("id, slug, content_html")
      .or("content_html.ilike.%>PILLAR PAGE<%,content_html.ilike.%>CLUSTER %,content_html.ilike.%<p>---</p>%,content_html.ilike.%<p>—</p>%")
      .range(from, from + pageSize - 1);
    if (error) throw error;
    if (!data?.length) break;
    out.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return out;
}

const posts = await fetchAll();
console.log(`[strip-scaffold] ${posts.length} candidates`);

const pillarH2Re = /<h2[^>]*>\s*PILLAR PAGE\s*<\/h2>\s*/gi;
const clusterH2Re = /<h2[^>]*id="cluster-[^"]*"[^>]*>[\s\S]*?<\/h2>\s*/gi;
const dashPRe = /<p>\s*(?:-{2,}|—|–)\s*<\/p>\s*/g;

let updated = 0;
for (const p of posts) {
  const before = p.content_html || "";
  let next = before
    .replace(pillarH2Re, "")
    .replace(clusterH2Re, "")
    .replace(dashPRe, "");
  if (next === before) continue;
  const { error } = await sb.from("posts").update({ content_html: next }).eq("id", p.id);
  if (error) { console.error(p.slug, error.message); continue; }
  updated++;
  if (updated % 20 === 0) console.log(`[strip-scaffold] updated ${updated}…`);
}
console.log(`[strip-scaffold] done. updated=${updated}`);
