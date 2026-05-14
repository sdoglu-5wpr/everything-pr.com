
# Phase 2N — Sector/Discipline Restructure: Survey + Migration Plan

## 1. Inventory (current DB state)

### Existing categories that intersect the restructure

| ID | Slug | Name | post_count | Real attached posts |
|---|---|---|---|---|
| 27955 | `b2b` | B2B Tech & SaaS | 1 | 10 |
| 27959 | `web3` | Web3 / Crypto | 0 | 0 |
| 27950 | `hospitality` | Hospitality & Travel | 23 | 23 |
| 27961 | `travel` | Travel & Hospitality | 0 | 22 (the Phase 2f drafts) |
| 27716 | `travel-pr` | Travel PR | 24 | 24 |
| 27782 | `hospitality-pr` | Hospitality PR | 3 | 3 |
| 27641 | `fashion` | Fashion | 14 | — |
| 27945 | `beauty` | Beauty | 65 | 65 |
| 27948 | `cpg` | CPG | 5 | 5 |
| 22744 | `entertainment-pr` | Entertainment PR & Entertainment Communications | 172 | 172 |
| 23224 | `press-release` | Press Releases & Industry Announcements | 44 | 44 |
| 22740 | `public-relations` | PR Perspectives & Public Relations Commentary | 472 | 472 |
| 27941 | `ai-communications` | AI Communications | 66 | — |
| 27942 | `financial-services` | Financial Services | 16 | — |
| 27943 | `health-tech` | Health Tech | 9 | — |

### Pillars table (parallel copies — must be updated in lockstep)

`pillars` rows that need mutation: `b2b` (17), `web3` (21), `hospitality` (11), `travel` (23). All published.

### Pillar-article drafts attached by `pillar_slug`

| pillar_slug | drafts | article_type=pillar |
|---|---|---|
| b2b | 9 | 9 |
| travel | 22 | 22 |
| defense, legal, public-affairs, real-estate | 25 | 25 (untouched by 2N) |

### Pre-existing redirects of concern

- `/ai` → `/ai-communications/` (301, enabled) — **must drop**
- `/ai/` → `/ai-communications/` (301, enabled) — **must drop**
- `/healthcare` → `/health-tech/` (301) — leave (out of scope)
- `/press-releases/` → `/press-release-2-2` (301) — collides with proposed `/press-releases/` plural; will need attention
- 472 `/public-relations*` legacy redirects already in table (mostly post-id stub redirects, harmless)
- No `/web3 → /crypto-web3/`, no `/b2b → /enterprise-saas/` yet
- No `/entertainment-pr → /entertainment-media/` yet

## 2. Critical surprises (read before approving)

1. **`fashion` slug already taken** (cat 27641, 14 posts). Ronn's "NEW Fashion" already exists. Action: keep cat 27641, promote to top-level Sector. No create needed.
2. **`hospitality` slug already taken** by the OLD "Hospitality & Travel" mega-category (27950, 23 posts). The new plan wants `/hospitality/` as a fresh narrow sibling. Need decision (option A or B below).
3. **Four overlapping H/T categories**: `hospitality` (27950), `travel` (27961), `travel-pr` (27716), `hospitality-pr` (27782). Plus pillars 11 & 23. This is a tangle; recommend consolidation step.
4. **`public-relations` cat = 472 posts** — Ronn's "delete or fold into /about/" cannot be a literal delete without massive data loss. Recommend: keep category, retitle to "PR Perspectives", remove from primary nav, and add a single `/public-relations/ → /about/` 301 ONLY at the landing path while leaving individual post URLs (`/public-relations-xxx`) untouched. Article URLs are top-level slugs (`/<slug>`), not under `/public-relations/`, so no redirect cascade is required for the 472 posts themselves.
5. **`press-release` slug singular vs `/press-releases/` plural in plan**. The existing 301 `/press-releases/ → /press-release-2-2` (a single article!) needs to be removed/repointed before any `/press-releases/` hub can be wired.
6. **Pillar `healthcare-pr` (id 13)** has been hijacked into a research article title. Out-of-scope but flagging.

## 3. Per-operation plan

### A. B2B → Enterprise SaaS

```sql
-- 1. Create new sector
INSERT INTO categories (slug, name, description) VALUES ('enterprise-saas', 'Enterprise SaaS', '...');
INSERT INTO pillars (slug, title, byline, body_html, published) VALUES ('enterprise-saas', 'Enterprise SaaS Communications', ..., false);

-- 2. Move post_categories from 27955 → new id
UPDATE post_categories SET category_id=<new_id> WHERE category_id=27955;

-- 3. Re-parent the 9 pillar drafts
UPDATE posts SET pillar_slug='enterprise-saas' WHERE pillar_slug='b2b';

-- 4. Slug rewrite — DO NOT change post.slug (slugs are top-level under /<slug>, not /b2b/<slug>).
--    Only the pillar landing /b2b/ needs redirecting.

-- 5. Redirects
INSERT INTO redirects (source_path, target_path, status_code, enabled) VALUES
  ('/b2b/', '/enterprise-saas/', 301, true),
  ('/b2b',  '/enterprise-saas/', 301, true);

-- 6. Soft-retire old: rename cat 27955 to "B2B (legacy)" or delete after verifying 0 attached posts.
--    Same for pillars row id 17.
```

**Rows touched:** ~20 (1 cat insert, 1 pillar insert, 10 post_categories updates, 9 posts updates, 2 redirect inserts, 2 retire updates). The 9 drafts STAY draft.

### B. Web3 → Crypto & Web3

```sql
UPDATE categories SET slug='crypto-web3', name='Crypto & Web3' WHERE id=27959;
UPDATE pillars    SET slug='crypto-web3', title='Crypto & Web3 Communications' WHERE id=21;
INSERT INTO redirects VALUES ('/web3/','/crypto-web3/',301,true), ('/web3','/crypto-web3/',301,true);
```

**Rows touched:** 4. No content moves (cat 27959 has 0 posts; pillar uses fts/category lookup).

### C. Hospitality + Travel split — RECOMMENDED APPROACH

Two viable paths — pick one:

**Option A (recommended, minimal disruption):**
- Rename cat 27950 → "Hospitality" (slug stays `hospitality`). Its 23 existing posts ARE hospitality content (hotels/restaurants/resorts) per name semantics.
- Cat 27961 (`travel`, 22 Travel Airlines drafts) becomes the canonical Travel sector. Rename "Travel & Hospitality" → "Travel".
- Retire `travel-pr` (27716, 24 posts) → migrate its 24 posts into cat 27961 (travel), then drop. Or keep as legacy-tagged.
- Retire `hospitality-pr` (27782, 3 posts) → migrate into 27950, drop.
- Pillar 11 (`hospitality`) retitle "Hospitality Communications". Pillar 23 (`travel`) retitle "Travel Communications".
- Redirects: `/travel-pr/` → `/travel/`, `/hospitality-pr/` → `/hospitality/`, `/hospitality-travel/`→`/hospitality/` (if it exists — verify), `/travel-hospitality/`→`/travel/`.

**Option B (fresh start):** Delete cat 27950 + 27961 entirely, build clean — but loses 23 attached posts. Not recommended.

**Rows touched (Option A):** ~60 (post_categories migrations + cat renames + pillar updates + ~5 redirects).

I need your sign-off on **Option A** vs B before executing.

### D. CPG + Food & Beverage split

```sql
INSERT INTO categories (slug, name) VALUES ('food-beverage', 'Food & Beverage');
-- cpg cat 27948 (5 posts) stays. Survey those 5 first; flag F&B-flavored ones for manual move.
INSERT INTO pillars (slug, title, ...) VALUES ('food-beverage', ..., published=false);
```

**Manual triage required:** Survey CPG's 5 posts, return list, you flag which move.

### E. Beauty + Fashion split

`fashion` already exists (27641, 14 posts) — promote to sector, no DB create. Pillar entry needed:
```sql
INSERT INTO pillars (slug, title) VALUES ('fashion', 'Fashion Communications');
```
Survey Beauty's 65 posts, return any fashion-flavored titles for review.

### F. Entertainment-PR → Entertainment & Media

```sql
UPDATE categories SET slug='entertainment-media', name='Entertainment & Media' WHERE id=22744;
-- pillar: no entry exists yet for entertainment-pr — create new entertainment-media pillar.
INSERT INTO pillars (slug, title) VALUES ('entertainment-media', 'Entertainment & Media Communications');
INSERT INTO redirects VALUES ('/entertainment-pr/','/entertainment-media/',301,true);
-- 172 post URLs are top-level (/<slug>) — no per-post redirects needed.
```

**Rows touched:** 4.

### G. 10 new Sector stubs

For each: `ai`, `automotive-mobility`, `energy`, `enterprise-saas` (covered in A), `fashion` (covered in E), `fintech`, `food-beverage` (covered in D), `politics-government`, `retail-ecommerce`, `startups-venture` —

Net new categories needed: **8** (ai, automotive-mobility, energy, fintech, politics-government, retail-ecommerce, startups-venture, + maybe one more after dedupe).

For each: insert `categories` row + `pillars` row (`published=false`) + insert one stub post (`status='draft'`, `featured_media_id=NULL`, `article_type='pillar'`, `pillar_slug=<slug>`, `pillar_index=0`) carrying H1, intro placeholder, CollectionPage + BreadcrumbList JSON-LD.

**Rows touched:** ~24 (8 cats × 3 rows).

### H. 12 new Discipline stubs

Net new: `analyst-relations`, `b2b-marketing`, `content-marketing`, `event-experiential`, `government-relations-lobbying`, `influencer-marketing`, `internal-communications`, `investor-relations`, `media-training`, `paid-media`, `podcast-pr`, `seo`. 12 cats × 3 rows = **~36 rows**.

### I. Press Releases + Public Relations

- **Press Releases:** Recommend keep cat 23224 in place, rename to "Press Releases", remove from primary nav. Defer `/resources/` migration to a later phase. No destructive change now. Drop the bogus `/press-releases/ → /press-release-2-2/` redirect to free the slug for future use.
- **Public Relations:** Keep cat 22740 (472 posts!) in place, retitle to "PR Perspectives", remove from primary nav. Add `/public-relations/ → /about/` 301 for the landing only. Posts under top-level `/<slug>` URLs are unaffected.

### J. Drop pre-existing collisions

```sql
DELETE FROM redirects WHERE source_path IN ('/ai','/ai/');
```
Leave `/healthcare → /health-tech/` alone.

### K. Nav structure (code, not DB)

Edit `src/lib/site-nav.shared.ts`:
- Sectors menu: AI pinned, then alphabetical 29 others.
- Disciplines menu: AI Communications, GEO, SEO pinned, then alphabetical 17 others.
- Drop "B2B", "Press Releases", "Public Relations" from primary nav.
- Update sitemap generators if they enumerate hardcoded slugs (`src/serverFns/sitemaps.server.ts`, `src/lib/internal-linking.shared.ts`).

## 4. Risks

- **fashion / hospitality slug collisions** — addressed via promote-in-place (Option A).
- **Glossary auto-links**: `data/glossary-source.md` and any seeded `where_used`/`related_terms` JSONB referencing `/b2b/`, `/web3/`, `/entertainment-pr/`, `/hospitality/` need a sweep + reseed.
- **Internal links in article HTML**: any `<a href="/b2b/...">` etc. in `posts.content_html` will hit our redirects (fine), but ideally rewrite inline for clean linkjuice. Recommend a follow-up `scripts/rewrite-restructure-anchors.mjs` after migration.
- **JSON-LD `isPartOf`** in seeded articles points to category URLs — pillar drafts in `b2b`, `web3`, `entertainment-pr`, `hospitality`, `travel` need re-render via existing seeders (rerun seed-b2b/seed-travel after rename for fresh JSON-LD).
- **Sitemap caches**: must purge `loader-cache` after migration (`scripts/build-geo.mjs` or restart).
- **`pillar_slug` FK-style writes**: no real FK, but `get_pillar` RPC uses slug match — confirmed safe after rename.
- **404 spike** if redirects mis-fire — mitigated by adding redirects in same transaction as the rename.

## 5. Order of operations

```
Phase 2N-step1  Drop /ai + /ai/ legacy redirects                              (J)
Phase 2N-step2  Survey CPG (5) + Beauty (65) post titles → return to user    (D, E triage)
Phase 2N-step3  Create 8+12 = 20 new categories + pillars + stub drafts       (G, H)
Phase 2N-step4  Rename web3 → crypto-web3                                     (B)
Phase 2N-step5  Rename entertainment-pr → entertainment-media                 (F)
Phase 2N-step6  Hospitality/Travel consolidation (Option A)                   (C)
Phase 2N-step7  B2B → Enterprise SaaS (re-parent 9 drafts + redirect)         (A)
Phase 2N-step8  Press Release / Public Relations renames + nav-removal        (I)
Phase 2N-step9  Update src/lib/site-nav.shared.ts + sitemap helpers           (K)
Phase 2N-step10 Rerun affected seeders for fresh JSON-LD; purge cache         (cleanup)
```

Steps 3–8 are independent and can run in parallel, but recommend serial for clean activity_log audit trail.

**Rollback per step:** every rename keeps the old slug discoverable via the `redirects` table; reverting is `UPDATE categories SET slug=<old>` + delete the redirect. The B2B re-parent is the only step where `pillar_slug` mutates on real (draft) posts — keep a snapshot of the 9 ids+old-slugs before running.

## 6. Total rows touched (estimate)

| Step | Inserts | Updates | Deletes |
|---|---|---|---|
| J | 0 | 0 | 2 |
| G+H stubs (20 sectors+disciplines) | 60 | 0 | 0 |
| B web3 | 2 | 2 | 0 |
| F entertainment | 2 | 1 | 0 |
| C hospitality/travel (Option A) | 5 | ~55 | 2 |
| A B2B → Enterprise SaaS | 5 | 19 | 0 |
| I PR cuts | 1 | 2 | 1 |
| **Total** | ~75 | ~79 | 5 |

Plus ~5 file edits (`site-nav.shared.ts`, `internal-linking.shared.ts`, possibly `glossary-source.md` sweep). **Zero `posts.status` flips.** **Zero `featured_media_id` writes.**

## 7. Decisions I need before executing

1. **Hospitality/Travel: Option A or B?** (Strongly recommend A.)
2. **Public Relations cat 22740** — confirm keep+retitle+nav-remove (vs. fold into /about/ which would orphan 472 posts).
3. **Press Releases** — confirm defer `/resources/` migration; just retitle + nav-remove now.
4. **Stub copy** — confirm placeholder text exactly: `"<Sector> PR & AI Communications coverage from Everything-PR. Definition copy is being prepared and will publish shortly."` Use Ronn's option-1 copy if/when it arrives instead?
5. **Drop pre-existing `/healthcare → /health-tech/` 301?** (Plan says leave; confirming.)

Awaiting "approved — execute Phase 2N" with answers to the 5 decisions above.
