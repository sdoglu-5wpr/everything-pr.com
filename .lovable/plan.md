## Goal

Clean up duplicate categories accumulated over 16 years of WordPress, then build a reusable admin tool so this doesn't drift again.

## Duplicate pairs found (live in DB)

| Loser slug | Posts | Winner slug | Posts | Notes |
|---|---|---|---|---|
| `cannabis-pr` | 4 | `cannabis` | 3 | merge → `cannabis` (cleaner) |
| `cpg-pr` | 2 | `cpg` | 2 | merge → `cpg` |
| `beauty-pr` | 50 | `beauty` | 47 | merge → `beauty` |
| `financial-services-pr` | 8 | `financial-services` | 2 | merge → `financial-services` |
| `health-tech-pr` | 5 | `health-tech` | 1 | merge → `health-tech` |
| `university-pr-2` | 2 | `university-pr` | 49 | obvious WP `-2` dupe → `university-pr` |
| `adtech` | 0 | `adtech-pr` | 2 | merge → `adtech-pr` (only one with posts) |

Sector hubs that have **no non-PR twin** (keep `-pr` slug as canonical, no merge):
`crisis-pr`, `healthcare-pr`, `technology-pr`, `consumer-pr`, `corporate-pr`, `entertainment-pr`, `university-pr`.

The `llms.txt` rewrite to drop `-pr` everywhere is **wrong** for these — would 404 or redirect to homepage. Only flip the slugs we actually merge.

## Plan

### Phase 1 — Manual merge of the 7 confirmed pairs (one migration)

For each pair:
1. Reassign `post_categories.category_id` from loser → winner (skip rows that would dupe).
2. Delete remaining loser rows in `post_categories`.
3. Insert 301 in `redirects` (`source_path = '/<loser>/'`, `target_path = '/<winner>/'`, `enabled = true`). Note: schema uses `target_path`, not `destination_url`.
4. Rewrite inline links in `posts.content_html` (`/<loser>/` → `/<winner>/`, both relative and absolute).
5. Delete the loser category row (no `status`/`merged_into_id` columns exist — hard delete is correct here).
6. Recompute `categories.post_count` for affected winners.

All 7 pairs in a single migration, wrapped so it's atomic.

### Phase 2 — Update llms.txt

Edit `public/llms.txt` to reflect canonical slugs after merge:
- `Cannabis PR` → `/cannabis/`
- `Beauty PR` → `/beauty/`
- `Financial Services PR` → `/financial-services/`
- `CPG / Consumer Brands` → `/cpg/`
- Leave `crisis-pr`, `healthcare-pr`, `technology-pr`, `consumer-pr`, `corporate-pr`, `entertainment-pr` as-is (no twin exists).
- Drop `Cannabis` (`/cannabis/`) listing duplication if any.

### Phase 3 — Admin duplicate-categories tool

New route `src/routes/admin/_protected.categories.duplicates.tsx`:

- Server fn `findDuplicateCategories` (admin-only, uses `supabaseAdmin`): runs the pg_trgm similarity query + `-pr` suffix heuristic, returns pairs with both categories' `post_count` and 5 sample post titles each.
- UI: list pairs side-by-side with post counts, sample titles, and two buttons: "Merge A → B" and "Merge B → A".
- Server fn `mergeCategories({ winnerId, loserId })`: runs the same 6-step merge above in a transaction (via Supabase RPC since supabase-js can't do multi-statement tx — implement as a `SECURITY DEFINER` SQL function `public.merge_categories(winner bigint, loser bigint)`).
- Every merge writes to `activity_log` (already exists) with `action='merge_category'`, `diff` capturing both slugs + counts, so it's auditable/reversible.
- Sidebar link under existing Categories admin.

### Phase 4 — Verify

- After Phase 1 migration: re-run the duplicate detection query in admin tool and confirm only the "no twin" sectors remain.
- Spot-check 2-3 redirected URLs return 301 to canonical (will need redeploy + Cloudflare purge, same as prior fixes).
- Confirm sitemap regenerator picks up only canonical slugs (no code change needed — it queries `categories` directly, so deleted losers drop out automatically).

## Out of scope

- Tag duplicates (separate cleanup, same pattern — can extend the admin tool later).
- The single-post oddities (`insurtech-marketing`, the giant AI-GEO slug, `ai-communications` with 11 posts vs no twin) — these aren't duplicates, just weak categories. Different problem (rationalization, not merging).
- `crisis-pr` pillar already exists and is published; no change.

## Order of operations

1. Confirm the 7-pair winner/loser table above is right (especially `adtech` direction — I picked the one with posts as winner, opposite of the general rule).
2. Run Phase 1 migration.
3. Update `llms.txt`.
4. Build admin tool (Phase 3) — this is the bigger lift, ~1 new route + 1 SQL function + 2 server fns.
5. Run admin tool to catch any pairs the heuristic missed.