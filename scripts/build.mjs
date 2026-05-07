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
import { cp, rm, mkdir, readdir, writeFile, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(process.cwd());
const DIST = join(ROOT, "dist");
const SNAPSHOT = join(ROOT, ".prerender-snapshot");
const PRERENDER_DATA = join(ROOT, ".prerender-pages.json");
const TARGET = process.argv.includes("--netlify") ? "netlify" : "worker";

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

async function listTopLevel(dir) {
  try {
    return (await readdir(dir)).slice(0, 25).join(", ");
  } catch {
    return "[missing]";
  }
}

async function collectPrerenderPages() {
  // Use tsx to execute the TS entry — Node's plain ESM loader cannot import
  // .ts files directly, but tsx registers a TS loader on demand.
  await run("npx", ["tsx", "scripts/collect-prerender.ts"], {
    NODE_ENV: "production",
  });
}

async function main() {
  console.log("\n=== [build] Pass 1: prerender (no Cloudflare plugin) ===\n");
  await rm(DIST, { recursive: true, force: true });
  await rm(SNAPSHOT, { recursive: true, force: true });
  await rm(PRERENDER_DATA, { force: true });

  await collectPrerenderPages();

  await run("npx", ["vite", "build"], {
    NODE_ENV: "production",
    LOVABLE_BUILD_PASS: "prerender",
  });

  const htmlCount = await countHtml(join(DIST, "client"));
  console.log(`\n[build] Pass 1 produced ${htmlCount} prerendered index.html files`);
  if (htmlCount === 0) {
    const clientListing = await listTopLevel(join(DIST, "client"));
    const serverListing = await listTopLevel(join(DIST, "server"));
    throw new Error(
      `Prerender pass produced 0 HTML files; aborting before Cloudflare pass. ` +
        `dist/client: ${clientListing}; dist/server: ${serverListing}`,
    );
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

  // Generate static sitemap XML files into dist/client so static hosts
  // (Netlify) serve them as files instead of falling through to index.html.
  console.log("\n[build] Generating static sitemap XML files...");
  await run("npx", ["tsx", "scripts/generate-sitemaps.ts"], {
    NODE_ENV: "production",
  });

  console.log("\n[build] Snapshotting prerendered output before second pass...");
  await mkdir(SNAPSHOT, { recursive: true });
  await cp(join(DIST, "client"), join(SNAPSHOT, "client"), { recursive: true });
  if (await exists(join(DIST, "_redirects.json"))) {
    await cp(join(DIST, "_redirects.json"), join(SNAPSHOT, "_redirects.json"));
  }
  if (await exists(join(DIST, "prerender-manifest.json"))) {
    await cp(join(DIST, "prerender-manifest.json"), join(SNAPSHOT, "prerender-manifest.json"));
  }

  console.log(`\n=== [build] Pass 2: ${TARGET === "netlify" ? "Netlify Functions" : "Cloudflare Worker"} bundle ===\n`);
  await rm(DIST, { recursive: true, force: true });

  await run("npx", ["vite", "build"], {
    NODE_ENV: "production",
    LOVABLE_BUILD_PASS: TARGET === "netlify" ? "netlify" : "worker",
  });

  // Patch the Netlify function: the deployed Lambda bootstrap calls
  // `module.handler(event, context)` but @netlify/vite-plugin only emits
  // `export default <fetchHandler>`. Without a named `handler` export the
  // function crashes with "y.handler is not a function" → 502 on every
  // non-static request (admin, /_serverFn/*, SSR fallbacks). We wrap the
  // fetch handler so it works both as a Frameworks API v2 default export
  // AND as a classic AWS Lambda handler.
  if (TARGET === "netlify") {
    const fnPath = join(ROOT, ".netlify/v1/functions/server.mjs");
    if (await exists(fnPath)) {
      const { readFile, writeFile } = await import("node:fs/promises");
      const original = await readFile(fnPath, "utf8");
      if (!original.includes("export const handler")) {
        const patched = original.replace(
          "export default serverEntrypoint.fetch;",
          `const __fetch = serverEntrypoint.fetch;
export default __fetch;
// AWS-Lambda-style adapter for Netlify's classic Functions runtime
export const handler = async (event) => {
  const url = \`https://\${event.headers?.host ?? "site.netlify.app"}\${event.rawUrl ? new URL(event.rawUrl).pathname + new URL(event.rawUrl).search : event.path + (event.rawQuery ? "?" + event.rawQuery : "")}\`;
  const init = {
    method: event.httpMethod || "GET",
    headers: event.headers || {},
  };
  if (event.body && event.httpMethod !== "GET" && event.httpMethod !== "HEAD") {
    init.body = event.isBase64Encoded ? Buffer.from(event.body, "base64") : event.body;
  }
  const req = new Request(url, init);
  const res = await __fetch(req);
  const buf = Buffer.from(await res.arrayBuffer());
  const headers = {};
  res.headers.forEach((v, k) => { headers[k] = v; });
  return { statusCode: res.status, headers, body: buf.toString("base64"), isBase64Encoded: true };
};`,
        );
        await writeFile(fnPath, patched, "utf8");
        console.log("[build] Patched .netlify/v1/functions/server.mjs with handler() export");
      }
    }
  }

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
  await rm(PRERENDER_DATA, { force: true });
  console.log("[build] Done.\n");
}

main().catch((e) => {
  console.error("[build] FAILED:", e);
  process.exit(1);
});
