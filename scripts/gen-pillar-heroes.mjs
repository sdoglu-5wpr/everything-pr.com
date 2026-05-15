// Generate hero images for pillars missing hero_image_url.
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.EPR_SUPABASE_URL;
const SERVICE_KEY = process.env.EPR_SUPABASE_SERVICE_KEY;
const AI_KEY = process.env.LOVABLE_API_KEY;
if (!SUPABASE_URL || !SERVICE_KEY || !AI_KEY) { console.error("missing env"); process.exit(1); }

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const ARG = Object.fromEntries(process.argv.slice(2).map(a => {
  const [k, v] = a.replace(/^--/, "").split("="); return [k, v ?? "1"];
}));
const LIMIT = Number(ARG.limit ?? 999);
const DRY = ARG.dry === "1";

function slugify(s) {
  return (s || "pillar").toLowerCase().replace(/<[^>]+>/g, " ")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "pillar";
}

function buildPrompt(p) {
  const sub = (p.subtitle || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 300);
  return `Broad conceptual hero image for a public-relations industry vertical landing page.
Vertical: "${p.title}".
${sub ? `Tagline: ${sub}` : ""}
Style: layered editorial composition suggesting an entire industry domain, magazine-quality, professional, subtle gradient background, no text, no logos, no watermarks, 16:9 framing.`;
}

async function genImage(prompt) {
  const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${AI_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash-image",
      messages: [{ role: "user", content: prompt }],
      modalities: ["image", "text"],
    }),
  });
  if (!r.ok) throw new Error(`ai_${r.status}: ${(await r.text()).slice(0, 200)}`);
  const j = await r.json();
  const url = j?.choices?.[0]?.message?.images?.[0]?.image_url?.url;
  if (!url?.startsWith("data:")) throw new Error("no_image");
  const comma = url.indexOf(",");
  const mime = url.slice(5, comma).split(";")[0] || "image/png";
  return { mime, bytes: Buffer.from(url.slice(comma + 1), "base64") };
}

async function processPillar(p) {
  const { mime, bytes } = await genImage(buildPrompt(p));
  const ext = mime === "image/jpeg" ? "jpg" : mime === "image/webp" ? "webp" : "png";
  const filename = `${slugify(p.slug)}-pillar-hero.${ext}`;
  const now = new Date();
  const path = `pillar-heroes/${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}/${p.id}-${filename}`;

  const { error: upErr } = await supabase.storage.from("wp-media")
    .upload(path, bytes, { contentType: mime, upsert: true });
  if (upErr) throw new Error(`upload:${upErr.message}`);

  const { data: pub } = supabase.storage.from("wp-media").getPublicUrl(path);
  const publicUrl = pub.publicUrl;

  const { error: updErr } = await supabase.from("pillars")
    .update({ hero_image_url: publicUrl, updated_at: now.toISOString() })
    .eq("id", p.id);
  if (updErr) throw new Error(`pillar_update:${updErr.message}`);
  return { url: publicUrl, bytes: bytes.byteLength };
}

async function main() {
  const { data: pillars, error } = await supabase.from("pillars")
    .select("id, slug, title, subtitle")
    .is("hero_image_url", null)
    .order("id", { ascending: true })
    .limit(LIMIT);
  if (error) { console.error(error); process.exit(1); }
  console.log(`Found ${pillars.length} pillars to process${DRY ? " (DRY)" : ""}`);

  let ok = 0, fail = 0;
  for (const p of pillars) {
    const tag = `[${p.id}] ${p.slug}`;
    if (DRY) { console.log(`DRY ${tag}`); continue; }
    try {
      const t0 = Date.now();
      const r = await processPillar(p);
      ok++;
      console.log(`OK  ${tag} -> ${(r.bytes/1024)|0}KB ${Date.now()-t0}ms`);
    } catch (e) {
      fail++;
      const msg = e?.message || String(e);
      console.error(`ERR ${tag} :: ${msg}`);
      if (/429|rate/i.test(msg)) await new Promise(r => setTimeout(r, 5000));
    }
  }
  console.log(`\nDone. ok=${ok} fail=${fail}`);
}

main().catch(e => { console.error(e); process.exit(1); });
