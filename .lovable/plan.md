## Goal

Make the public site (homepage, articles, archives) feel instant on repeat visits, and cut the admin panel's per-page wait from "many round-trips" to ~1 round-trip. Zero feature/UX changes.

## Where the time goes today

- **Admin dashboard** (`/admin`): fires **10 separate Supabase queries from the browser** in parallel — but each is its own HTTPS request with auth + RLS, so cold load is 800–1500 ms.
- **Admin layout** (`_protected.tsx`): refetches `user_roles` from the browser on every navigation. ~150–300 ms of blank "Loading…".
- **Admin posts list**: server fn does 5 sequential Supabase calls (posts → authors → post_categories → media → categories) per page load.
- **Admin editor open**: 3 lookup queries (categories/tags/authors) + 4 post-detail queries on every post open. Lookup tables rarely change.
- **Article route `/$slug`**: on a cache miss, tries article → pillar → archive → redirect (up to 4 round-trips).
- **Admin bundle**: TipTap RichEditor loaded eagerly into the editor route chunk. Heavy.
- **DB**: Some hot query paths likely lack covering indexes (e.g. `posts(type, status, modified_at)`, `post_categories(category_id)`, `redirects(source_path) WHERE enabled`).

## Plan

### 1. Admin dashboard → single round-trip

- Switch `_protected.index.tsx` to call the existing `getAdminDashboard()` server fn (already aggregates counts + recent + scheduled in one Promise.all on the server) instead of 10 browser queries.
- Add an `activity` query to that server fn so the dashboard becomes one HTTP call.
- Wrap with `cached()` (10 s TTL) so a quick re-visit is instant.

### 2. Admin layout → cache roles once per session

- Move the `user_roles` fetch out of `_protected.tsx`'s `useEffect` and into a TanStack Router `beforeLoad` on the `_protected` route, returning roles via route context.
- Cache in `sessionStorage` keyed on `userId`. Subsequent admin navigations are zero round-trips.
- Keep the existing redirect-to-login behavior.

### 3. Admin posts list → one RPC

- Add Postgres function `get_admin_posts_list(filters jsonb, page, page_size)` that returns rows already joined with author, primary category, and featured media URL, plus total count, in **one** call.
- Replace the 5 chained queries in `listAdminPosts` with this RPC.
- Move the dynamic `await import("@/lib/legacy-urls")` to a static import (Workers cold-start savings).

### 4. Admin editor → cached lookups + parallel post fetch

- Split `getAdminPost` into:
  - `getAdminEditorMeta()` — categories/tags/authors lookups, wrapped in `cached("admin:editor:meta", 60_000)`. Fetched once, reused across every post-open.
  - `getAdminPostDetail({ id })` — single RPC `get_admin_post_detail(p_id)` returning post + seo + category_ids + tag_ids + featured_media in one row.
- Editor route prefetches meta in `loader` (route-level), and the component fetches only post detail.

### 5. Public article route `/$slug` → one resolver

- Add Postgres function `resolve_slug(p_slug)` returning `{ kind: 'article'|'pillar'|'archive'|'redirect'|'none', payload jsonb }`.
- Loader does a single RPC instead of 4 sequential ones; only the matched branch hydrates its full payload (subsequent specialized RPCs reused).
- Net effect on a 404 / category-only slug: 1 round-trip instead of 4.

### 6. Code-split TipTap editor

- Convert `RichEditor` to a `React.lazy()` import inside the editor route.
- Show a lightweight `<textarea>`-style placeholder until the chunk arrives. Cuts the editor route's initial JS by an estimated 200–400 KB gzipped.

### 7. Stronger CDN cache headers

- Articles, category, tag, author archives, sitemaps, and the homepage already set `Cache-Control` server headers. Audit values and standardize:
  - Homepage: `s-maxage=120, stale-while-revalidate=600`
  - Articles: `s-maxage=300, stale-while-revalidate=3600`
  - Archives: `s-maxage=180, stale-while-revalidate=1800`
- Add `Vary: Cookie` only where actually needed (admin), so anonymous traffic shares the cache.

### 8. DB indexes (one migration)

Add only if missing — the migration uses `IF NOT EXISTS`:

```text
posts (type, status, modified_at DESC NULLS LAST)
posts (status, published_at) WHERE status = 'future'
posts (slug)                  -- unique already? verify
post_categories (category_id, post_id)
post_tags (tag_id, post_id)
redirects (source_path) WHERE enabled
seo_meta (object_type, object_id)
media (id)                    -- pk, but verify
authors (slug)
categories (slug), tags (slug)
```

### 9. Small wins

- Replace browser `supabase.auth.getSession()` double-call in `_protected.tsx` with a single call.
- Remove duplicate `useEffect` that resets `pageInput`/`searchInput` in posts list (re-renders only).
- Drop the `await import(...)` patterns in server fns — they add cold-start latency on Workers.
- Add `prefetch="intent"` (TanStack `<Link>` default) hints on admin sidebar links so navigation feels instant.

## Acceptance

- Admin `/admin` first paint: < 400 ms after auth on warm cache, < 800 ms cold (was ~1.5 s).
- Admin `/admin/posts` page change: 1 network call (was 5).
- Admin `/admin/posts/$id` open: 2 calls cold, 1 call warm (was 7).
- Public article on a cached edge node: ~50 ms HTML response.
- Zero behavior changes — same UI, same data, same auth/RLS.

## Out of scope

- Visual redesign, new admin features.
- Switching auth provider, switching to Edge KV, or moving off Supabase RPCs.
- Image-pipeline work (already in `media-backfill`).

## Rollout order (safe)

1. DB migration with indexes + new RPCs (`get_admin_posts_list`, `get_admin_post_detail`, `resolve_slug`). Old code keeps working.
2. Wire admin dashboard, admin layout role-cache, posts list, editor to new RPCs.
3. Code-split RichEditor.
4. Tighten CDN headers.
5. Remove now-dead browser supabase queries.

Each step is independently shippable and reversible.
