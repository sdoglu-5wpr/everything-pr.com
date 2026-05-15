// Regenerate the recent batch (today's auto-featured posts + pillar heroes) with the
// cinematic two-stage planner + Nano Banana 2 renderer. Filename = post/pillar slug.
// Replaces the media row in-place, updates seo_meta og_image, and deletes the
// orphaned old storage object.
//
// Usage:
//   EPR_SUPABASE_URL=... EPR_SUPABASE_SERVICE_KEY=... LOVABLE_API_KEY=... \
//   node scripts/regen-cinematic-batch.mjs --mode=posts --limit=30 --offset=0
//   node scripts/regen-cinematic-batch.mjs --mode=pillars --limit=30
//
// --dry=1 to preview without writes.

import { createClient } from "@supabase/supabase-js";
import { generateImageFor, extFromMime } from "./lib/cinematic-image.mjs";

const SUPABASE_URL = process.env.EPR_SUPABASE_URL;
const SERVICE_KEY = process.env.EPR_SUPABASE_SERVICE_KEY;
const AI_KEY = process.env.LOVABLE_API_KEY;
if (!SUPABASE_URL || !SERVICE_KEY || !AI_KEY) {
  console.error("missing env (EPR_SUPABASE_URL / EPR_SUPABASE_SERVICE_KEY / LOVABLE_API_KEY)");
  process.exit(1);
}
const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const ARG = Object.fromEntries(process.argv.slice(2).map(a => {
  const [k, v] = a.replace(/^--/, "").split("=");
  return [k, v ?? "1"];
}));
const MODE = ARG.mode || "posts";          // posts | pillars
const LIMIT = Number(ARG.limit ?? 30);
const OFFSET = Number(ARG.offset ?? 0);
const DRY = ARG.dry === "1";
const SINCE = ARG.since || "2026-05-15";   // today's batch

function safeSlug(s) {
  return (s || "image").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "image";
}

async function processPost(post) {
  const oldMediaId = post.featured_media_id;
  const oldPath = post.media?.storage_path;

  const { mime, bytes, visual_prompt, alt_text } = await generateImageFor({
    apiKey: AI_KEY,
    title: post.title,
    focusKeyword: null,
    body: post.content_html,
    brandInstructions: null,
  });

  const ext = extFromMime(mime);
  const slug = safeSlug(post.slug);
  const filename = `${slug}.${ext}`;
  const now = new Date();
  const newPath = `auto-featured/${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}/${post.id}-${filename}`;

  if (DRY) {
    return { dry: true, filename, alt_text, visual_prompt: visual_prompt.slice(0, 80), bytes: bytes.length };
  }

  const { error: upErr } = await supabase.storage.from("wp-media")
    .upload(newPath, bytes, { contentType: mime, upsert: true });
  if (upErr) throw new Error(`upload:${upErr.message}`);

  const { data: pub } = supabase.storage.from("wp-media").getPublicUrl(newPath);
  const publicUrl = pub.publicUrl;

  // Update existing media row in place (keeps featured_media_id pointer).
  const { error: mErr } = await supabase.from("media").update({
    url: publicUrl, storage_path: newPath, filename, mime_type: mime,
    alt_text, title: post.title, filesize: bytes.byteLength,
  }).eq("id", oldMediaId);
  if (mErr) throw new Error(`media_update:${mErr.message}`);

  await supabase.from("posts").update({ modified_at: now.toISOString() }).eq("id", post.id);

  // og_image
  await supabase.from("seo_meta").upsert({
    object_type: "post", object_id: post.id, url_path: `/${post.slug}/`,
    og_image: publicUrl, og_type: "article", twitter_card: "summary_large_image",
  }, { onConflict: "object_type,object_id" });

  // Delete old storage object (cleanup) — only if path differs.
  if (oldPath && oldPath !== newPath) {
    await supabase.storage.from("wp-media").remove([oldPath]);
  }

  return { url: publicUrl, alt_text, filename, bytes: bytes.length };
}

async function processPillar(p) {
  const { mime, bytes, visual_prompt, alt_text } = await generateImageFor({
    apiKey: AI_KEY,
    title: p.title,
    focusKeyword: p.slug,
    body: p.subtitle || p.description || p.title,
    brandInstructions: "Broad conceptual hero suggesting an entire industry vertical. Layered editorial composition.",
  });
  const ext = extFromMime(mime);
  const slug = safeSlug(p.slug);
  const filename = `${slug}-pillar-hero.${ext}`;
  const now = new Date();
  const newPath = `pillar-heroes/${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}/${p.id}-${filename}`;

  if (DRY) return { dry: true, filename, alt_text, visual_prompt: visual_prompt.slice(0, 80) };

  // Determine old path from existing URL (storage path follows the public-URL suffix).
  const oldUrl = p.hero_image_url || "";
  const oldPathMatch = oldUrl.match(/\/wp-media\/(.+)$/);
  const oldPath = oldPathMatch ? oldPathMatch[1] : null;

  const { error: upErr } = await supabase.storage.from("wp-media")
    .upload(newPath, bytes, { contentType: mime, upsert: true });
  if (upErr) throw new Error(`upload:${upErr.message}`);

  const { data: pub } = supabase.storage.from("wp-media").getPublicUrl(newPath);

  const { error: updErr } = await supabase.from("pillars").update({
    hero_image_url: pub.publicUrl,
    hero_image_alt: alt_text,
    updated_at: now.toISOString(),
  }).eq("id", p.id);
  if (updErr) {
    // Fallback if hero_image_alt column doesn't exist
    await supabase.from("pillars").update({
      hero_image_url: pub.publicUrl, updated_at: now.toISOString(),
    }).eq("id", p.id);
  }

  if (oldPath && oldPath !== newPath) {
    await supabase.storage.from("wp-media").remove([oldPath]);
  }
  return { url: pub.publicUrl, alt_text, filename, bytes: bytes.length };
}

async function runPosts() {
  // Today's batch: posts whose featured_media is in auto-featured/* and uploaded today.
  const { data, error } = await supabase
    .from("posts")
    .select("id, slug, title, focus_keyword, content_html, featured_media_id, media:featured_media_id(storage_path, uploaded_at)")
    .not("featured_media_id", "is", null)
    .order("id", { ascending: true });
  if (error) { console.error(error); process.exit(1); }

  const targets = (data || [])
    .filter(p => p.media?.storage_path?.startsWith("auto-featured/")
              && p.media.uploaded_at?.startsWith(SINCE))
    .slice(OFFSET, OFFSET + LIMIT);

  console.log(`POSTS batch since=${SINCE} total-window=${data?.length ?? 0} processing=${targets.length} (offset=${OFFSET} limit=${LIMIT})${DRY?" [DRY]":""}`);

  let ok = 0, fail = 0;
  for (const post of targets) {
    const tag = `[${post.id}] ${post.slug}`;
    try {
      const t0 = Date.now();
      const r = await processPost(post);
      ok++;
      console.log(`OK  ${tag} -> ${r.filename} ${(r.bytes/1024)|0}KB ${Date.now()-t0}ms`);
    } catch (e) {
      fail++;
      console.error(`ERR ${tag} :: ${e.message}`);
      if (/429|rate/i.test(e.message)) await new Promise(r => setTimeout(r, 8000));
    }
  }
  console.log(`\nPOSTS done. ok=${ok} fail=${fail}`);
}

async function runPillars() {
  const { data, error } = await supabase
    .from("pillars")
    .select("id, slug, title, subtitle, hero_image_url, updated_at")
    .like("hero_image_url", "%pillar-heroes/%")
    .order("id", { ascending: true });
  if (error) { console.error(error); process.exit(1); }
  const targets = (data || []).filter(p => (p.updated_at || "").startsWith(SINCE)).slice(OFFSET, OFFSET + LIMIT);
  console.log(`PILLARS since=${SINCE} processing=${targets.length}${DRY?" [DRY]":""}`);

  let ok = 0, fail = 0;
  for (const p of targets) {
    const tag = `[${p.id}] ${p.slug}`;
    try {
      const t0 = Date.now();
      const r = await processPillar(p);
      ok++;
      console.log(`OK  ${tag} -> ${r.filename} ${(r.bytes/1024)|0}KB ${Date.now()-t0}ms`);
    } catch (e) {
      fail++;
      console.error(`ERR ${tag} :: ${e.message}`);
      if (/429|rate/i.test(e.message)) await new Promise(r => setTimeout(r, 8000));
    }
  }
  console.log(`\nPILLARS done. ok=${ok} fail=${fail}`);
}

if (MODE === "pillars") await runPillars();
else await runPosts();
