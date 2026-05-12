#!/usr/bin/env bun
/**
 * SEO canonical audit.
 *
 * Samples N URLs from the post sitemap, hits each with a battery of
 * "broken" variants (uppercase, www, trailing-slash off, tracking params,
 * legacy /category/ prefix, double slashes, /feed/ suffix), and confirms
 * that every variant 301-redirects (no 302) to the same canonical URL.
 *
 * Usage:
 *   bun scripts/seo-canonical-audit.ts                       # default 50 samples vs https://everything-pr.com
 *   bun scripts/seo-canonical-audit.ts --base=https://... --samples=20
 */
const args = new Map(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k, v ?? "true"];
  }),
);

const BASE = (args.get("base") ?? "https://everything-pr.com").replace(/\/$/, "");
const SAMPLE_SIZE = Number(args.get("samples") ?? 50);

type Result = { variant: string; url: string; status: number; location: string | null; ok: boolean; reason?: string };

async function head(url: string): Promise<{ status: number; location: string | null }> {
  const res = await fetch(url, { redirect: "manual", method: "GET", headers: { "user-agent": "lovable-seo-audit/1.0" } });
  return { status: res.status, location: res.headers.get("location") };
}

function variantsFor(canonical: URL): { name: string; url: string }[] {
  const path = canonical.pathname; // e.g. /my-post/
  const noSlash = path.endsWith("/") ? path.slice(0, -1) : path;
  const upper = path.toUpperCase();
  const slug = noSlash.replace(/^\//, "");
  return [
    { name: "uppercase", url: `${canonical.origin}${upper}` },
    { name: "no-trailing-slash", url: `${canonical.origin}${noSlash}` },
    { name: "www", url: `https://www.everything-pr.com${path}` },
    { name: "utm-params", url: `${canonical.origin}${path}?utm_source=test&utm_medium=email` },
    { name: "noamp", url: `${canonical.origin}${path}?noamp=mobile` },
    { name: "fbclid", url: `${canonical.origin}${path}?fbclid=abc123` },
    { name: "double-slash", url: `${canonical.origin}//${slug}/` },
    { name: "category-prefix", url: `${canonical.origin}/category/${slug}/` },
  ];
}

async function fetchSitemapUrls(): Promise<string[]> {
  const xml = await (await fetch(`${BASE}/post-sitemap.xml`)).text();
  const urls: string[] = [];
  for (const m of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) urls.push(m[1]);
  return urls;
}

function sample<T>(arr: T[], n: number): T[] {
  const copy = [...arr];
  const out: T[] = [];
  while (out.length < n && copy.length) {
    out.push(copy.splice(Math.floor(Math.random() * copy.length), 1)[0]);
  }
  return out;
}

async function audit() {
  console.log(`Auditing ${BASE} (samples=${SAMPLE_SIZE})…\n`);
  const all = await fetchSitemapUrls();
  if (!all.length) {
    console.error("No URLs in sitemap.");
    process.exit(1);
  }
  const picks = sample(all, Math.min(SAMPLE_SIZE, all.length));

  let pass = 0;
  let fail = 0;
  const failures: Result[] = [];

  for (const canonicalUrl of picks) {
    const canon = new URL(canonicalUrl);
    // sanity: canonical itself should be 200
    const baseRes = await head(canonicalUrl);
    if (baseRes.status !== 200) {
      failures.push({ variant: "canonical-itself", url: canonicalUrl, status: baseRes.status, location: baseRes.location, ok: false, reason: "canonical not 200" });
      fail++;
      continue;
    }

    for (const v of variantsFor(canon)) {
      const r = await head(v.url);
      const isRedirect = r.status === 301;
      const dest = r.location ? new URL(r.location, v.url).toString() : null;
      // Allow chain: final destination after one hop should equal canonical (or be 200 on canonical).
      let finalOk = isRedirect && dest === canonicalUrl;
      if (!finalOk && isRedirect && dest) {
        // Follow one extra hop in case of intermediate normalization
        const hop = await head(dest);
        const hopDest = hop.location ? new URL(hop.location, dest).toString() : null;
        if (hop.status === 301 && hopDest === canonicalUrl) finalOk = true;
      }
      const ok = isRedirect && finalOk;
      const result: Result = {
        variant: v.name,
        url: v.url,
        status: r.status,
        location: dest,
        ok,
        reason: !isRedirect
          ? `expected 301, got ${r.status}`
          : !finalOk
            ? `redirected to ${dest} ≠ ${canonicalUrl}`
            : undefined,
      };
      if (ok) pass++;
      else {
        fail++;
        failures.push(result);
      }
    }
  }

  console.log(`PASS: ${pass}`);
  console.log(`FAIL: ${fail}\n`);
  if (failures.length) {
    console.log("Failures:");
    for (const f of failures.slice(0, 50)) {
      console.log(`  [${f.variant}] ${f.url}`);
      console.log(`     status=${f.status} loc=${f.location ?? "-"}  → ${f.reason}`);
    }
    if (failures.length > 50) console.log(`  …and ${failures.length - 50} more`);
    process.exit(1);
  }
  console.log("All canonicalization checks passed.");
}

audit().catch((e) => {
  console.error(e);
  process.exit(1);
});
