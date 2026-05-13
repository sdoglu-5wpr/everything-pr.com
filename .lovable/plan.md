## Problem

Confirmed via live `curl -I`:

- `/author/mheller`   → **301** → `/author/mheller/`
- `/category/marketing` → **301** → `/category/marketing/`
- `/tag/branding`    → 200 (already serves at no-slash)

But our sitemap and `<link rel="canonical">` advertise the **no-slash** form for `/author/...`. Google sees: "the URL you told me to index redirects somewhere else" → drops the page from the index. This matches the CEO's "author pages aren't showing up in search" complaint, and it's a sitewide pattern — not Mike Heller-specific.

The comment in `netlify.toml` claims canonical form is no-slash, but Netlify's pretty-URL behavior on prerendered/function-served paths is doing the opposite for `/author/*` and `/category/*`. Rather than fight Netlify, align our emitted URLs with what actually returns 200.

## Fix

Emit trailing slashes for author and category URLs in two places:

### 1. `src/serverFns/sitemaps.server.ts`

- `buildAuthorSitemap`: change `${SITE_URL}/author/${a.slug}` → `${SITE_URL}/author/${a.slug}/`
- `buildTermSitemap` (category branch): change `${SITE_URL}/${slug}` → `${SITE_URL}/${slug}/` *only if* live category URLs (`/{slug}` bare) also redirect to slash. Verify with one more `curl -I` on a real bare-slug category before changing — if `/cannabis` returns 200, leave alone.
- Tag branch: leave as-is (live returns 200 at no-slash).

### 2. `src/routes/author.$slug.tsx` and `src/routes/category.$slug.tsx`

The `pathPrefix` passed to `buildArchiveHead` drives both `<link rel="canonical">` and `og:url`. Append a trailing slash:

- author: `pathPrefix: \`/author/${slug}/\``
- category: same treatment if needed (verify category serving first)

`buildArchiveHead` already concatenates `${SITE_URL}${pathPrefix}` with no slash logic, so the change flows through to canonical + og:url + JSON-LD `url` automatically.

### 3. Tag pages

Live test shows `/tag/branding` returns 200 with no slash → no change needed in `post_tag-sitemap.xml` or the tag route.

## Verification after deploy

```bash
curl -sI https://everything-pr.com/author/mheller/ | grep -E '^HTTP|^location'
# Expect: 200, no Location

curl -s https://everything-pr.com/author-sitemap.xml | grep mheller
# Expect: <loc>https://everything-pr.com/author/mheller/</loc>

curl -s https://everything-pr.com/author/mheller/ | grep -i 'rel="canonical"'
# Expect: href="https://everything-pr.com/author/mheller/"
```

Then in Google Search Console → URL Inspection → request indexing for one author URL. Within ~7 days the "Page with redirect" / "Crawled - currently not indexed" status should flip to "Indexed".

## Out of scope

- The CEO's broader claim ("many EPR pages aren't showing"). After this fix, monitor Search Console coverage; most pages are likely indexed but he may be checking via `site:` operator which doesn't reflect full coverage.
- Restructuring Netlify pretty-URL behavior. We're conforming to it, not changing it.

## Files to edit

- `src/serverFns/sitemaps.server.ts` (1–2 lines)
- `src/routes/author.$slug.tsx` (1 line)
- `src/routes/category.$slug.tsx` (1 line, conditional on live behavior)
