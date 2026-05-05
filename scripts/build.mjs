#!/usr/bin/env node
/**
 * Two-pass production build:
 *   Pass 1 (prerender): no Cloudflare plugin. TanStack's preview server
 *     loads dist/server/server.js (its hard-coded default), crawls every URL
 *     from src/prerender.ts, and writes static HTML into dist/client/<path>/index.html.
 *     We snapshot dist/client and dist/_redirects.json after this pass.
 *
 *   Pass 2 (worker): Cloudflare Vite plugin enabled. Emits the runtime worker
 *     to dist/server/index.js with wrangler.json + asset binding pointing at
 *     ../client. After build we restore the snapshotted prerendered HTML +
 *     _headers + redirect map on top of the freshly written client/ dir.
 *
 * Lovable runs `npm run build`; this script is the build entry.
 */
import { spawn } from "node:child_process";
import { cp, rm, mkdir, readFile, writeFile, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(process.cwd());
const DIST = join(ROOT, "dist");
const SNAPSHOT = join(ROOT, ".prerender-snapshot");

function run(cmd, args, env) {
  return new Promise((resolveP, rejectP) => {
    const child = spawn(cmd, args, {
      stdio: "inherit",
      env: { ...process.env, ...env },
      shell: false,
    });
    child.on("exit", (code) =>
      code === 0 ? resolveP() : rejectP(new Error(`${cmd} ${args.join(" ")} exited ${code}`)),
    );
    child.on("error", rejectP);
  });
}

async function exists(p) {
  try { await stat(p); return true; } catch { return false; }
}

async function countHtml(dir) {
  if (!existsSync(dir)) return 0;
  const { execSync } = await import("node:child_process");
  try {
    return Number(execSync(`find ${dir} -name index.html | wc -l`).toString().trim());
  } catch { return 0; }
}

async function main() {
  console.log("\n=== [build] Pass 1: prerender (no Cloudflare plugin) ===\n");
  await rm(DIST, { recursive: true, force: true });
  await rm(SNAPSHOT, { recursive: true, force: true });

  await run("npx", ["vite", "build"], {
    NODE_ENV: "production",
    LOVABLE_BUILD_PASS: "prerender",
  });

  const htmlCount = await countHtml(join(DIST, "client"));
  console.log(`\n[build] Pass 1 produced ${htmlCount} prerendered index.html files`);
  if (htmlCount === 0) {
    throw new Error("Prerender pass produced 0 HTML files; aborting before Cloudflare pass");
  }

  // Write a _headers file so CF Workers Static Assets serves prerendered HTML
  // with the production cache-control headers we need at the edge.
  const headersBody = [
    "/*",
    "  Cache-Control: public, max-age=60, s-maxage=86400, stale-while-revalidate=604800",
    "",
    "/*.xml",
    "  Cache-Control: public, max-age=300, s-maxage=3600, stale-while-revalidate=86400",
    "  Content-Type: application/xml; charset=utf-8",
    "",
    "/robots.txt",
    "  Cache-Control: public, max-age=300, s-maxage=3600",
    "  Content-Type: text/plain; charset=utf-8",
    "",
    "/feed",
    "  Cache-Control: public, max-age=300, s-maxage=3600",
    "  Content-Type: application/xml; charset=utf-8",
    "",
    "/assets/*",
    "  Cache-Control: public, max-age=31536000, immutable",
    "",
  ].join("\n");
  await writeFile(join(DIST, "client", "_headers"), headersBody, "utf8");
  console.log("[build] Wrote dist/client/_headers");

  console.log("\n[build] Snapshotting prerendered output before Cloudflare pass...");
  await mkdir(SNAPSHOT, { recursive: true });
  await cp(join(DIST, "client"), join(SNAPSHOT, "client"), { recursive: true });
  if (await exists(join(DIST, "_redirects.json"))) {
    await cp(join(DIST, "_redirects.json"), join(SNAPSHOT, "_redirects.json"));
  }
  if (await exists(join(DIST, "prerender-manifest.json"))) {
    await cp(join(DIST, "prerender-manifest.json"), join(SNAPSHOT, "prerender-manifest.json"));
  }

  console.log("\n=== [build] Pass 2: Cloudflare worker bundle ===\n");
  await rm(DIST, { recursive: true, force: true });

  await run("npx", ["vite", "build"], {
    NODE_ENV: "production",
    LOVABLE_BUILD_PASS: "worker",
  });

  console.log("\n[build] Restoring prerendered HTML + _headers on top of worker output...");
  // Cloudflare plugin writes dist/client (assets bundle) — overlay the
  // prerendered HTML + _headers without removing the JS/CSS chunks it produced.
  await cp(join(SNAPSHOT, "client"), join(DIST, "client"), { recursive: true, force: true });
  if (await exists(join(SNAPSHOT, "_redirects.json"))) {
    await cp(join(SNAPSHOT, "_redirects.json"), join(DIST, "_redirects.json"));
  }
  if (await exists(join(SNAPSHOT, "prerender-manifest.json"))) {
    await cp(join(SNAPSHOT, "prerender-manifest.json"), join(DIST, "prerender-manifest.json"));
  }

  const finalCount = await countHtml(join(DIST, "client"));
  console.log(`\n[build] Final dist/client contains ${finalCount} prerendered index.html files`);

  await rm(SNAPSHOT, { recursive: true, force: true });
  console.log("[build] Done.\n");
}

main().catch((e) => {
  console.error("[build] FAILED:", e);
  process.exit(1);
});
