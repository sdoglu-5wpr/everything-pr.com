import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { collectUrls } from "./src/prerender";

// Two-pass production build (driven by scripts/build.mjs):
//   LOVABLE_BUILD_PASS=prerender → no Cloudflare plugin, prerender enabled.
//     TanStack's preview server expects dist/server/server.js, so we set
//     server input to "src/server.ts" (basename "server"). This pass writes
//     static HTML into dist/client/<route>/index.html.
//
//   LOVABLE_BUILD_PASS=worker → Cloudflare plugin enabled, prerender disabled.
//     Emits the runtime worker (dist/server/index.js + wrangler.json).
//
//   Anything else (dev, single-pass `vite build` for local sanity) → no
//     prerender, no special server input, Cloudflare plugin on by default
//     during build only.
const PASS = process.env.LOVABLE_BUILD_PASS;
const isPrerenderPass = PASS === "prerender";
const isWorkerPass = PASS === "worker";

async function buildTanstackOptions() {
  if (!isPrerenderPass) {
    // Worker pass + dev: no prerender. Use default server entry.
    return {} as Record<string, unknown>;
  }
  try {
    const result = await collectUrls();
    return {
      pages: result.pages,
      // Force TanStack's server bundle to be named "server.js" so the
      // preview-server plugin (which prerender uses to fetch routes)
      // can locate dist/server/server.js. Without this it defaults to
      // "server" basename anyway, but the Cloudflare plugin overrides it
      // to "index" — which is why we ONLY enable prerender in pass 1
      // (Cloudflare plugin disabled).
      prerender: {
        enabled: true,
        concurrency: 4,
        autoStaticPathsDiscovery: false,
        failOnError: false,
        retryCount: 1,
      },
    } as Record<string, unknown>;
  } catch (e) {
    console.error("[vite.config] URL collection failed; building without prerender:", e);
    return {} as Record<string, unknown>;
  }
}

const tanstackStart = await buildTanstackOptions();

export default defineConfig({
  tanstackStart,
  // Disable Cloudflare plugin during the prerender pass. The plugin renames
  // the worker entry to dist/server/index.js, which breaks TanStack's
  // preview server (it hard-codes basename(serverInput)+".js" = "server.js").
  cloudflare: isPrerenderPass ? false : undefined,
});
