// Best-effort CDN + in-memory cache purge.
//
// - Always clears the per-Worker loader cache (immediate effect on dynamic SSR).
// - If CLOUDFLARE_API_TOKEN + CLOUDFLARE_ZONE_ID are set, purges the listed
//   URLs from Cloudflare's edge cache.
// - If NETLIFY_PURGE_TOKEN + NETLIFY_SITE_ID are set, purges via Netlify's
//   purge API (purges by site, not URL — that's the only public option).
//
// Failures are logged but never thrown — purge is best-effort and must not
// break the originating mutation (delete/update).

import { clearLoaderCache } from "@/serverFns/loader-cache.server";

const SITE_HOSTS = [
  "https://everything-pr.com",
  "https://www.everything-pr.com",
  "https://everythingpr.lovable.app",
];

function buildUrls(paths: string[]): string[] {
  const urls: string[] = [];
  for (const host of SITE_HOSTS) {
    for (const p of paths) {
      const path = p.startsWith("/") ? p : `/${p}`;
      urls.push(`${host}${path}`);
      // Trailing-slash variant — prerendered pages canonicalize with slash
      if (!path.endsWith("/") && path !== "/") urls.push(`${host}${path}/`);
    }
  }
  return urls;
}

async function purgeCloudflare(urls: string[]): Promise<void> {
  const token = process.env.CLOUDFLARE_API_TOKEN;
  const zoneId = process.env.CLOUDFLARE_ZONE_ID;
  if (!token || !zoneId) return;
  // Cloudflare accepts max 30 URLs per request
  const chunks: string[][] = [];
  for (let i = 0; i < urls.length; i += 30) chunks.push(urls.slice(i, i + 30));
  for (const files of chunks) {
    try {
      const res = await fetch(
        `https://api.cloudflare.com/client/v4/zones/${zoneId}/purge_cache`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ files }),
        },
      );
      if (!res.ok) {
        console.warn(`[cache-purge] Cloudflare purge failed ${res.status}`, await res.text());
      }
    } catch (e) {
      console.warn("[cache-purge] Cloudflare purge error", e);
    }
  }
}

async function purgeNetlify(): Promise<void> {
  const token = process.env.NETLIFY_PURGE_TOKEN;
  const siteId = process.env.NETLIFY_SITE_ID;
  if (!token || !siteId) return;
  try {
    const res = await fetch(
      `https://api.netlify.com/api/v1/purge`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ site_id: siteId }),
      },
    );
    if (!res.ok) {
      console.warn(`[cache-purge] Netlify purge failed ${res.status}`, await res.text());
    }
  } catch (e) {
    console.warn("[cache-purge] Netlify purge error", e);
  }
}

/**
 * Purge caches for the given site paths. Pass paths like "/", "/my-slug",
 * "/category/news". Always clears the in-memory loader cache.
 */
export async function purgePaths(paths: string[]): Promise<void> {
  const unique = Array.from(new Set(paths.filter(Boolean)));
  // Always clear in-memory cache (cheap and immediate on this Worker).
  try {
    const n = clearLoaderCache();
    console.log(`[cache-purge] cleared ${n} loader cache entries`);
  } catch (e) {
    console.warn("[cache-purge] loader cache clear error", e);
  }
  const urls = buildUrls(unique);
  // Run CDN purges in parallel, never throw.
  await Promise.allSettled([purgeCloudflare(urls), purgeNetlify()]);
}
