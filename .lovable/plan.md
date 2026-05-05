
## Revised plan — incorporating your three additions

Shipping order unchanged: (1) prerender + URL collector → deploy → report `cf-cache-status` → (2) cache headers + perf-test cleanup → (3) revalidate webhook + admin hook + cron → (4) acceptance script.

### 1. Prerender wiring + URL collector (this push)

**Wiring**
- `vite.config.ts`: pass `prerender: { enabled: true, concurrency: 4, crawlLinks: false, routes: async () => collectUrls() }` to TanStack Start (the default config wrapper accepts overrides via `defineConfig({ tanstackStart: { ... } })`).
- New file `src/prerender.ts` exports `collectUrls()`. Build-time only — uses `supabaseAdmin` (service role) directly, no RLS round-trips.

**URLs collected** (with your additions)
- `/`, `/feed`, `/robots.txt`, `/sitemap_index.xml`, `/post-sitemap.xml` (paginated), `/category-sitemap.xml`, `/post_tag-sitemap.xml`, `/author-sitemap.xml`, `/page-sitemap.xml`
- Every `posts` row where `status='publish' AND type IN ('post','page')` → `/$slug`. This naturally includes:
  - The ~12K posts
  - The 19 pages (ethics-policy, corrections-policy, etc.) — verified via `select count(*) from posts where type='page' and status='publish'` before the build commits
  - The 4 study landing pages — same query covers them; we'll log their slugs explicitly during collection so you can grep the build output to confirm
- All 41 categories → `/category/$slug` plus `/category/$slug/page/$n` for n=2..ceil(post_count/pageSize)
- All tags with `post_count >= 5` → `/tag/$slug` (+ paginated)
- All 21 authors → `/author/$slug` (+ paginated)
- **Redirects**: select `source_path` from `redirects where enabled=true`. These are NOT prerendered as pages. Instead, `collectUrls()` also returns a `redirects` array that gets emitted to `dist/_redirects.json`. The Worker reads this map at startup and serves a 301 directly — no Supabase call, no React render.

**Determinism**: collection runs once per build. Slug list snapshot is written to `dist/prerender-manifest.json` for debugging.

### 2. Tiered fallback (documented + wired)

In `src/prerender.ts`:
```
const MAX_PRERENDER = 2500;       // hard cap before tier-1 fallback
const BUILD_TIME_BUDGET_MS = 8 * 60_000;
```
- Tier 1 set (always): `/`, all pages (19), all category roots + first 3 pagination, all author roots + first 3 pagination, top 500 posts ordered by `seo_meta.incoming_link_count desc nulls last`, top 100 by `published_at desc`. Deduped.
- If full URL count ≤ `MAX_PRERENDER` and the build elapsed budget hasn't been exceeded by the time the collector finishes, prerender everything. Otherwise emit only Tier 1 and write `tier=1` into the manifest.
- Tier 2 (everything else) falls back to dynamic SSR at request time. Worker sets `Cache-Control: public, s-maxage=3600, stale-while-revalidate=86400` on those responses so the second visitor gets edge-cached HTML.
- Build log prints: total URLs found, tier chosen, included counts per type, elapsed seconds.

`incoming_link_count` doesn't exist on `seo_meta` today — I'll use `internal_links` aggregated by `target_post_id` as the proxy. If you want a real column added I can do that in step 3.

### 3. Cache-header + noindex correctness on staging

Two facets, both handled in step 2 of the rollout (cache-header pass), called out here so we agree on the contract:

| Surface | `INDEXING_ENABLED=false` (staging) | `INDEXING_ENABLED=true` (prod) |
| --- | --- | --- |
| Prerendered HTML `<head>` | `<meta name="robots" content="noindex,nofollow,noarchive,nosnippet,noimageindex">` baked in at build | `<meta name="robots" content="index,follow,max-image-preview:large">` baked in |
| Worker response header on every request | `X-Robots-Tag: noindex,nofollow,noarchive,nosnippet,noimageindex` | header omitted |
| `/robots.txt` (prerendered as static file) | `User-agent: *\nDisallow: /` | full allow + AI bots + sitemap link |
| `/sitemap*.xml` | not in prerender list → Worker returns `404` | prerendered XML |
| Cache-Control on HTML | `public, max-age=60, s-maxage=86400, stale-while-revalidate=604800` (same as prod — staging perf parity is the whole point) | same |

The `<meta robots>` and the indexing-aware skip of sitemap URLs both happen inside `collectUrls()` / route `head()` at build time, reading `process.env.INDEXING_ENABLED`. The `X-Robots-Tag` response header is added by the Worker middleware (`src/start.ts`) at request time so it's correct even for Tier-2 lazy renders.

**Two artifacts per env — wrangler answer**: `wrangler.jsonc` supports `[env.production]` / `[env.staging]` blocks with per-env `vars`. We add:
```
{
  "vars": { "INDEXING_ENABLED": "false" },
  "env": {
    "production": { "vars": { "INDEXING_ENABLED": "true" } }
  }
}
```
Lovable's deploy publishes a single Worker per project, so the practical model is:
- Staging deploys = current behavior, `INDEXING_ENABLED=false` → noindex artifact.
- Production cutover = flip the secret to `true` and trigger a rebuild. The build reads the new value, prerenders index-allowed HTML, swaps `robots.txt`, includes sitemaps. ~3-10 min downtime-free (old artifact serves until the new one promotes).

If you want truly two simultaneous artifacts (staging at noindex AND production at index, both live), that requires either two Lovable projects or a custom deploy pipeline outside what I can configure from here. I'll flag it explicitly in the docs file.

### Step 1 deliverable (what hits the repo on this push)
- `src/prerender.ts` — collector + tiering logic
- `vite.config.ts` — prerender config + route function
- `src/start.ts` — Worker static-file + redirect-map handler (reads `dist/_redirects.json`)
- `dist/_redirects.json` written at build (committed to artifact, not source)
- `src/server/indexing.constants.ts` — exports the meta-robots strings used by both `head()` and the middleware so they can't drift
- Build log shows: total/tier/per-type counts + study-page slugs explicitly listed
- No changes yet to admin publish flow, no webhook, no cron — those are step 3

After this lands and deploys, I'll run:
```
for url in / /category/pr-news/ /the-ai-coding-tools-ai-visibility-index-2026/ /robots.txt /sitemap_index.xml; do
  for i in 1 2 3; do
    curl -sI "https://everythingpr.lovable.app$url?cb=$RANDOM" | grep -iE 'cf-cache-status|cache-control|x-robots|content-type'
    curl -s -o /dev/null -w "$url hit$i %{time_starttransfer}s\n" "https://everythingpr.lovable.app$url"
  done
done
```
and report back `cf-cache-status` per URL plus TTFB, before starting step 2.

Approve and I'll start step 1.
