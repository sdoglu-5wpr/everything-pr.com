import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { collectUrls } from "./src/prerender";

// Collect URLs at config-load time. During dev (`vite dev`), Supabase env vars
// may not be present — fall back to a minimal page list and skip prerender.
async function buildTanstackOptions() {
  const isBuild = process.env.NODE_ENV === "production" || process.argv.includes("build");
  if (!isBuild) {
    return {} as Record<string, unknown>;
  }
  try {
    const result = await collectUrls();
    return {
      pages: result.pages,
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

export default defineConfig({ tanstackStart });
