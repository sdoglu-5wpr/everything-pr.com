// Generate hero images for the 242 image-less drafts via Lovable AI Gateway.
// Uploads to Supabase storage `wp-media`, inserts media row, sets featured_media_id.
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.EPR_SUPABASE_URL;
const SERVICE_KEY = process.env.EPR_SUPABASE_SERVICE_KEY;
const AI_KEY = process.env.LOVABLE_API_KEY;

if (!SUPABASE_URL || !SERVICE_KEY || !AI_KEY) {
  console.error("missing env"); process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const ARG = Object.fromEntries(process.argv.slice(2).map(a => {
  const [k, v] = a.replace(/^--/, "").split("=");
  return [k, v ?? "1"];
}));
const LIMIT = Number(ARG.limit ?? 999);
const ONLY_PILLAR = ARG.pillar; // optional filter
const DRY = ARG.dry === "1";

function slugify(s) {
  return (s || "image").toLowerCase().replace(/<[^>]+>/g, " ")
    .replace(/&[a-z]+;/g, " ").replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "").slice(0, 80) || "featured";
}

function buildAlt(title) {
  return `Editorial illustration for article: ${title.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim()}`.slice(0, 240);
}

function buildPrompt(post) {
  const ex = (post.excerpt || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 400);
  const verticalHint = post.pillar_slug
    ? `\nIndustry context: ${post.pillar_slug.replace(/-/g, " ")}.`
    : "";
  const typeHint = post.article_type === "cluster"
    ? "Style: focused topical editorial illustration, single conceptual subject, narrow framing."
    : post.article_type === "pillar"
      ? "Style: broad conceptual hero image, layered composition suggesting an entire industry domain."
      : "Style: modern editorial illustration, clean composition.";
  return `Editorial cover image for a public-relations industry article.
Title: "${post.title}".${verticalHint}
${ex ? `Context: ${ex}` : ""}
${typeHint} Professional, magazine-quality, subtle gradient background, no text, no logos, no watermarks, 16:9 framing.`;
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

async function processPost(post) {
  const prompt = buildPrompt(post);
  const { mime, bytes } = await genImage(prompt);
  const ext = mime === "image/jpeg" ? "jpg" : mime === "image/webp" ? "webp" : "png";
  const seoSlug = slugify(post.title);
  const filename = `${seoSlug}-featured.${ext}`;
  const now = new Date();
  const path = `auto-featured/${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}/${post.id}-${filename}`;

  const { error: upErr } = await supabase.storage.from("wp-media")
    .upload(path, bytes, { contentType: mime, upsert: true });
  if (upErr) throw new Error(`upload:${upErr.message}`);

  const { data: pub } = supabase.storage.from("wp-media").getPublicUrl(path);
  const publicUrl = pub.publicUrl;

  const { data: maxRow } = await supabase.from("media").select("id")
    .order("id", { ascending: false }).limit(1).maybeSingle();
  const nextId = ((maxRow?.id ?? 0)) + 1;

  const { data: ins, error: insErr } = await supabase.from("media").insert({
    id: nextId, url: publicUrl, storage_path: path, filename, mime_type: mime,
    alt_text: buildAlt(post.title), title: post.title, filesize: bytes.byteLength,
    uploaded_at: now.toISOString(),
  }).select("id").single();
  if (insErr) throw new Error(`media_insert:${insErr.message}`);

  const { error: postErr } = await supabase.from("posts")
    .update({ featured_media_id: ins.id, modified_at: now.toISOString() })
    .eq("id", post.id);
  if (postErr) throw new Error(`post_update:${postErr.message}`);

  return { media_id: ins.id, url: publicUrl, bytes: bytes.byteLength };
}

async function main() {
  let q = supabase.from("posts")
    .select("id, slug, title, excerpt, pillar_slug, article_type")
    .eq("status", "draft").eq("type", "post")
    .is("featured_media_id", null)
    .order("id", { ascending: true })
    .limit(LIMIT);
  if (ONLY_PILLAR) q = q.eq("pillar_slug", ONLY_PILLAR);
  const { data: posts, error } = await q;
  if (error) { console.error(error); process.exit(1); }
  console.log(`Found ${posts.length} drafts to process${DRY ? " (DRY RUN)" : ""}`);

  let ok = 0, fail = 0;
  const errors = [];
  for (const p of posts) {
    const tag = `[${p.id}] ${p.pillar_slug || "-"}/${p.article_type || "-"} ${p.slug}`;
    if (DRY) { console.log(`DRY ${tag}`); continue; }
    try {
      const t0 = Date.now();
      const r = await processPost(p);
      ok++;
      console.log(`OK  ${tag} -> media#${r.media_id} ${(r.bytes/1024)|0}KB ${Date.now()-t0}ms`);
    } catch (e) {
      fail++;
      const msg = e?.message || String(e);
      errors.push({ id: p.id, slug: p.slug, err: msg });
      console.error(`ERR ${tag} :: ${msg}`);
      // brief backoff on rate limit
      if (/429|rate/i.test(msg)) await new Promise(r => setTimeout(r, 5000));
    }
  }
  console.log(`\nDone. ok=${ok} fail=${fail}`);
  if (errors.length) console.log(JSON.stringify(errors, null, 2));
}

main().catch(e => { console.error(e); process.exit(1); });
