import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!key) throw new Error("need SUPABASE_SERVICE_ROLE_KEY");
const sb = createClient(url, key);

const { data: authors } = await sb.from("authors").select("id, slug, display_name, bio, avatar_url, website, social");

function pick(html, re) {
  const m = html.match(re);
  return m ? m[1] : null;
}

function extractLdPerson(html, name) {
  const scripts = [...html.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)];
  for (const s of scripts) {
    try {
      const j = JSON.parse(s[1]);
      const graph = j["@graph"] || [j];
      for (const node of graph) {
        if (node["@type"] === "Person" && (!name || node.name === name)) return node;
      }
    } catch {}
  }
  return null;
}

function gravatarUpsize(u) {
  if (!u) return u;
  return u.replace(/([?&])s=\d+/, "$1s=500");
}

let updated = 0;
for (const a of authors) {
  const url = `https://everything-pr.com/author/${a.slug}/`;
  let html;
  try {
    const r = await fetch(url, { headers: { "user-agent": "epr-backfill/1.0" } });
    if (!r.ok) { console.log("skip", a.slug, r.status); continue; }
    html = await r.text();
  } catch (e) { console.log("err", a.slug, e.message); continue; }

  const desc = pick(html, /<meta name="description" content="([^"]+)"/i);
  const person = extractLdPerson(html, a.display_name);
  const sameAs = person?.sameAs || [];
  const avatar = gravatarUpsize(person?.image?.url || a.avatar_url);

  const social = { ...(a.social || {}) };
  let website = a.website;
  for (const link of sameAs) {
    if (/facebook\.com/i.test(link)) social.facebook = link;
    else if (/twitter\.com|x\.com/i.test(link)) social.twitter = link;
    else if (/linkedin\.com/i.test(link)) social.linkedin = link;
    else if (/instagram\.com/i.test(link)) social.instagram = link;
    else if (!website) website = link;
  }
  // If website is currently a facebook/twitter URL, move it
  if (website && /facebook\.com/i.test(website)) { social.facebook = social.facebook || website; website = null; }
  if (website && /twitter\.com|x\.com/i.test(website)) { social.twitter = social.twitter || website; website = null; }
  if (website && /linkedin\.com/i.test(website)) { social.linkedin = social.linkedin || website; website = null; }
  if (website && /instagram\.com/i.test(website)) { social.instagram = social.instagram || website; website = null; }

  const patch = {
    bio: desc || a.bio,
    avatar_url: avatar,
    website,
    social,
  };
  const { error } = await sb.from("authors").update(patch).eq("id", a.id);
  if (error) { console.log("err update", a.slug, error.message); continue; }
  updated++;
  console.log("✓", a.slug, "bio:", !!desc, "social:", Object.values(social).filter(Boolean).length);
}
console.log("done", updated, "/", authors.length);
