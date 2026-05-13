## Goal

Make every image URL on the public site use `https://api.everything-pr.com/storage/...` instead of `https://unycfscvsckgxboherpk.supabase.co/storage/...`, so the raw Supabase project host never appears in HTML, OG/Twitter tags, JSON-LD, RSS, or anything a visitor can copy from "View source" / "Copy image address".

This needs to work for both **new** uploads and **existing** rows in the database.

---

## Two layers (defense in depth)

### Layer 1 — Render-time rewrite (immediate, covers all existing rows)

Extend `src/lib/legacy-urls.ts` with a new step that runs on every URL we emit:

- Add constants:
  - `SUPABASE_PROJECT_HOST = "unycfscvsckgxboherpk.supabase.co"`
  - `CUSTOM_STORAGE_HOST   = "api.everything-pr.com"`
- New helper `rewriteSupabaseStorageUrl(url)` — replaces `https?://unycfscvsckgxboherpk.supabase.co` with `https://api.everything-pr.com` (only when the path starts with `/storage/`, to be safe).
- New helper `rewriteSupabaseStorageInHtml(html)` — same swap inside `src`, `href`, and `srcset` attributes (mirrors the existing `LEGACY_ATTR_PATTERN` approach).
- Compose both into existing entry points so the rest of the codebase changes nothing:
  - `rewriteLegacyUrl(...)`        → also call `rewriteSupabaseStorageUrl`
  - `rewriteWpContentUrls(...)`    → also call `rewriteSupabaseStorageInHtml`
  - `rewriteLegacyHtml(...)`       → already chains the two above, so it picks it up
  - `pickFirstImageSrc(...)`       → already routes through the helpers
  - `resolvePostImageUrl(...)`     → already routes through `rewriteLegacyUrl`

This single change rewrites:
- `<ArticleBody>` HTML
- featured image `<img>` (PostImage / cards / hero)
- `og:image`, `twitter:image`, JSON-LD `image`, JSON-LD `articleBody`
- RSS `<content:encoded>` and `<enclosure>`
- Author/category/tag thumbnails
- Sitemap image entries (if any)

Also audit and patch any place that builds OG/Twitter/JSON-LD image URLs without going through these helpers — likely candidates from the file list:
- `src/serverFns/seo.article.ts`
- `src/serverFns/seo.head.ts`
- `src/lib/schema.ts`
- `src/routes/feed.ts`
- sitemap route files under `src/routes/*sitemap*`

If any of those read raw URLs straight from the DB, wrap them in `rewriteLegacyUrl`.

### Layer 2 — Write-time normalization (so new rows are clean too)

`.env` already sets `EPR_SUPABASE_URL=https://api.everything-pr.com`, so `supabaseAdmin.storage.getPublicUrl()` should already return `api.everything-pr.com`. Verify this is true in production env (Netlify) — if Netlify env still points `EPR_SUPABASE_URL` at the `*.supabase.co` host, fix it there. No code change needed if env is correct; otherwise add a tiny normalizer right after each `getPublicUrl()` call (5 sites) to force the custom host.

### Layer 3 — One-time DB backfill (optional but recommended)

To stop leaking old URLs in API responses, RSS readers caching old payloads, sitemaps, etc., run a migration that rewrites stored URLs in place:

```sql
update posts
set content_html = replace(content_html,
      'https://unycfscvsckgxboherpk.supabase.co/storage/',
      'https://api.everything-pr.com/storage/')
where content_html like '%unycfscvsckgxboherpk.supabase.co/storage/%';

update posts
set featured_image = replace(featured_image::text,
      'https://unycfscvsckgxboherpk.supabase.co/storage/',
      'https://api.everything-pr.com/storage/')::jsonb
where featured_image::text like '%unycfscvsckgxboherpk.supabase.co/storage/%';

update media
set url = replace(url,
      'https://unycfscvsckgxboherpk.supabase.co/storage/',
      'https://api.everything-pr.com/storage/')
where url like '%unycfscvsckgxboherpk.supabase.co/storage/%';

-- repeat for post_meta.og_image, authors.avatar_url, categories.image, etc.
```

I'll inspect the schema first and only touch columns that actually contain Supabase storage URLs.

---

## Verification

After deploy:
1. `curl -s https://everything-pr.com/<slug> | grep -c unycfscvsckgxboherpk` → must print `0`.
2. `curl -s https://everything-pr.com/feed | grep -c unycfscvsckgxboherpk` → `0`.
3. View source on a post page — every `<img src>`, `og:image`, `twitter:image`, JSON-LD `image` shows `api.everything-pr.com`.
4. Right-click → Copy image address on featured image and an inline image → both return `api.everything-pr.com/storage/...`.
5. Image still loads (custom domain serves the same object).

---

## Files to change

- `src/lib/legacy-urls.ts` — add the two helpers, wire into existing exports.
- `src/serverFns/seo.article.ts`, `src/serverFns/seo.head.ts`, `src/lib/schema.ts`, `src/routes/feed.ts`, sitemap routes — only where raw DB URLs bypass the helpers (audit + add the helper call).
- (Optional) Supabase migration with the `replace(...)` UPDATEs above.
- No changes to upload code if Netlify env already has `EPR_SUPABASE_URL=https://api.everything-pr.com`; otherwise update Netlify env or add a normalizer at the 5 `getPublicUrl()` call sites.

No edge function or Netlify redirect needed — this is a pure render-time + data fix.