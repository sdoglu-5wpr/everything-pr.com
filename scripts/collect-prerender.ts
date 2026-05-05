/**
 * Standalone TS entry that runs collectUrls() and writes the manifest to
 * .prerender-pages.json. Spawned by scripts/build.mjs via `npx tsx` so the
 * Node ESM loader doesn't try to import a .ts file directly.
 */
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { collectUrls } from "../src/prerender";

async function main() {
  const result = await collectUrls();
  if (!result.pages?.length) {
    throw new Error("URL collection returned 0 pages; refusing to run prerender pass");
  }
  const out = resolve(process.cwd(), ".prerender-pages.json");
  writeFileSync(out, JSON.stringify({ pages: result.pages }, null, 2), "utf8");
  console.log(`[collect-prerender] Wrote ${result.pages.length} URLs to ${out}`);
}

main().catch((e) => {
  console.error("[collect-prerender] FAILED:", e);
  process.exit(1);
});
