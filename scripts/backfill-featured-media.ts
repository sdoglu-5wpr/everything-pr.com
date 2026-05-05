/**
 * scripts/backfill-featured-media.ts
 *
 * One-shot backfill for posts.featured_media_id from data/posts.jsonl.
 * import-content.ts nulls FKs whose target wasn't seen in validMediaIds — if
 * that pass dropped legitimate ids (e.g. attachments imported in a separate
 * run), this script restores .featured_image.id directly using slug as the
 * idempotent key.
 *
 * Usage:
 *   EPR_SUPABASE_URL=...                                \
 *   EPR_SUPABASE_SERVICE_KEY=...                        \
 *   bun run scripts/backfill-featured-media.ts          \
 *      [--data ./data] [--batch 500] [--dry]
 *
 * Safe to re-run; updates only rows where the target value differs.
 */
import { createReadStream, existsSync } from "node:fs";
import { createInterface } from "node:readline";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const args = new Map<string, string>();
for (let i = 2; i < process.argv.length; i++) {
  const a = process.argv[i];
  if (a.startsWith("--")) {
    const k = a.slice(2);
    const v =
      process.argv[i + 1] && !process.argv[i + 1].startsWith("--")
        ? process.argv[++i]
        : "true";
    args.set(k, v);
  }
}
const DATA_DIR = resolve(args.get("data") ?? "./data");
const BATCH = Number(args.get("batch") ?? 500);
const DRY = args.get("dry") === "true";

const SUPABASE_URL =
  process.env.EPR_SUPABASE_URL ?? process.env.VITE_EPR_SUPABASE_URL;
const SERVICE_KEY = process.env.EPR_SUPABASE_SERVICE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("✖ Missing EPR_SUPABASE_URL / EPR_SUPABASE_SERVICE_KEY");
  process.exit(1);
}
const sb = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function* streamJsonl(file: string) {
  if (!existsSync(file)) throw new Error(`missing: ${file}`);
  const rl = createInterface({
    input: createReadStream(file, { encoding: "utf8" }),
    crlfDelay: Infinity,
  });
  for await (const line of rl) {
    const t = line.trim();
    if (!t) continue;
    try {
      yield JSON.parse(t);
    } catch (e) {
      console.error("✖ bad json:", e);
    }
  }
}

type Pair = { slug: string; featured_media_id: number };

async function main() {
  const file = `${DATA_DIR}/posts.jsonl`;
  console.log(`▶ reading ${file} (dry=${DRY}, batch=${BATCH})`);

  // 1) Load existing media ids so we don't reintroduce dangling FKs.
  const { data: mediaRows, error: mErr } = await sb
    .from("media")
    .select("id")
    .order("id", { ascending: true });
  if (mErr) throw mErr;
  const validMedia = new Set<number>((mediaRows ?? []).map((r: any) => r.id));
  console.log(`  media rows: ${validMedia.size}`);

  // 2) Stream posts.jsonl, collect (slug, featured_image.id) pairs.
  const pairs: Pair[] = [];
  let scanned = 0;
  let skippedNoId = 0;
  let skippedOrphan = 0;
  for await (const r of streamJsonl(file)) {
    scanned++;
    const slug = (r?.slug ?? "").toString().trim();
    const fid = r?.featured_image?.id;
    if (!slug) continue;
    if (typeof fid !== "number") {
      skippedNoId++;
      continue;
    }
    if (!validMedia.has(fid)) {
      skippedOrphan++;
      continue;
    }
    pairs.push({ slug, featured_media_id: fid });
  }
  console.log(
    `  scanned=${scanned} candidates=${pairs.length} skippedNoId=${skippedNoId} skippedOrphan=${skippedOrphan}`,
  );

  if (DRY) {
    console.log("  (dry run — no writes)");
    return;
  }

  // 3) Update in batches; only touch rows where the value differs.
  let updated = 0;
  let unchanged = 0;
  for (let i = 0; i < pairs.length; i += BATCH) {
    const chunk = pairs.slice(i, i + BATCH);
    const slugs = chunk.map((p) => p.slug);
    const { data: existing, error: eErr } = await sb
      .from("posts")
      .select("slug, featured_media_id")
      .in("slug", slugs);
    if (eErr) throw eErr;
    const cur = new Map(
      (existing ?? []).map((r: any) => [r.slug as string, r.featured_media_id as number | null]),
    );

    const toUpdate = chunk.filter(
      (p) => cur.has(p.slug) && cur.get(p.slug) !== p.featured_media_id,
    );

    for (const p of toUpdate) {
      const { error: uErr } = await sb
        .from("posts")
        .update({ featured_media_id: p.featured_media_id })
        .eq("slug", p.slug);
      if (uErr) {
        console.error(`✖ update slug=${p.slug}:`, uErr.message);
      } else {
        updated++;
      }
    }
    unchanged += chunk.length - toUpdate.length;
    process.stdout.write(`\r  progress ${Math.min(i + BATCH, pairs.length)}/${pairs.length} updated=${updated}`);
  }
  console.log(`\n✓ done. updated=${updated} unchanged=${unchanged}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
