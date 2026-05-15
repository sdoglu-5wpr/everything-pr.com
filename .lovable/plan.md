## Audit: Category vs Pillar Duplicate Surfaces

### How routing currently resolves `/$slug` (src/routes/$slug.tsx)

Resolution order in the loader:
1. **Published pillar** → renders `PillarView` (hero + lede + QA + BuildingOut + signup).
2. **Category archive** with ≥1 post → renders `ArchiveView`.
3. **Article** (post with that slug).
4. **Draft pillar** → `PillarPlaceholderView` (200, noindex,follow).
5. **DB redirect lookup** (also pre-checked in `beforeLoad` with trailing slash).

Implication: a draft pillar at slug `X` does NOT block an article at `X` from rendering — the post wins step 3 before step 4 fires. This is exactly why `/ai` renders as the long-form post (id 112308, 26K chars) instead of the AI pillar (id 32, draft, only 133 chars stub).

`src/routes/category.$slug.tsx` is just a 301 → `/$slug`. There is no separate "category-listing" route — the archive is rendered inside `$slug` when (1) no pillar, (2) the category has posts. So `/ai-pr` resolves via step 2: the `ai-pr` category has 90 posts, so it renders as a category archive.

### Step 1 — Inventory of duplicate surfaces

Legend: P = pillar (state, body chars, hero), A = article post (chars), C = category (post count via `post_categories`).

| Topic slug | Pillar | Article post | Category | Today's resolved view |
|---|---|---|---|---|
| `ai` | id 32 **draft** 133c (hero✓) | id 112308 publish, 26 387c | `ai` (4 posts) | **Article** (post wins; draft pillar skipped) |
| `ai-pr` | — | — | `ai-pr` (90 posts) | **Category archive** |
| `adtech` | id 10 **live** 3 432c | id 112305, 26 200c | `adtech` (11) | **Pillar** (article 112305 unreachable at `/adtech`) |
| `cpg` | id 9 **live** 3 262c | id 112310, 26 218c | `cpg` (5) | **Pillar** (article unreachable) |
| `cybersecurity` | id 5 **live** 2 881c | id 112314, 25 260c | `cybersecurity` (12) | **Pillar** (article unreachable) |
| `cyber` | — | — | — | 404 |
| `financial-services` | id 3 **live** 3 488c | id 112316, 27 629c | `financial-services` (15) | **Pillar** (article unreachable) |
| `finserv` | — | — | — | 404 |
| `gambling` | id 8 **live** 2 838c | id 112318, 26 342c | `gambling` (1) + `gambling-pr` (2) | **Pillar** |
| `health-tech` | id 4 **live** 23 269c | id 112319, 25 389c | `health-tech` (8) | **Pillar** (article unreachable) |
| `healthcare` | id 60 **draft** 65c (no hero) | — | — | Currently 301 → `/health-tech/` |
| `healthcare-pr` | id 13 **live** 33 416c | — | `healthcare-pr` (57) | **Pillar** |
| `crisis` | — | — | — | 404 |
| `crisis-pr` | id 2 **live** 2 909c | — | `crisis-pr` (459) | **Pillar** |
| `beauty` | id 6 **live** 2 910c | — | `beauty` (65) | **Pillar** |
| `beauty-fashion` | id 54 **draft** 73c (no hero) | — | — | Pillar placeholder (noindex) |
| `food-beverage` | id 37 **draft** 159c (hero✓) | — | `food-beverage` (0) | Pillar placeholder |
| `automotive` | — | — | — | 301 → `/automotive-mobility` |
| `automotive-mobility` | id 33 **draft** 171c (hero✓) | — | — | Pillar placeholder |
| `entertainment` | — | — | — | 404 |
| `entertainment-media` | id 30 **draft** 171c (hero✓) | — | — | Pillar placeholder |
| `geo` | id 12 **live** 2 979c | — | — | Pillar |
| `generative-engine-optimization` | id 59 **draft** 70c (no hero) | — | — | Pillar placeholder |
| `seo` | id 52 **draft** 135c (hero✓) | — | — | Pillar placeholder |
| `social-media` | id 53 **live** 9 040c | — | — | Pillar |
| `paid-media` / `influencer-marketing` / `b2b-marketing` / `enterprise-saas` (live) / `internal-communications` / `investor-relations` / `media-training` / `event-experiential` / `government-relations-lobbying` / `podcast-pr` / `analyst-relations` / `content-marketing` / `fashion` / `fintech` / `energy` / `politics-government` / `retail-ecommerce` / `startups-venture` | mostly draft stubs 50–200c | — | — | Pillar / placeholder |
| `b2b` / `consumer-brands` / `corporate-communications` / `crisis-communications` / `digital-marketing` / `nonprofit` / `research` / `technology` | draft stubs 50–7 720c, several **no hero** | — | (legacy categories like `consumer-pr`, `corporate-pr`, `digital-pr`, `technology-pr` have 140–364 posts each but DIFFERENT slugs) | Pillar placeholder / 404 |
| `retail` | — | — | — | 301 → `/retail-ecommerce` |
| `defense` | id 18 **live** 933c | — | — | Pillar (7 articles tagged via `pillar_slug`) |
| `education` | id 26 **live** 924c | — | (`university-pr` cat has 50 posts) | Pillar |
| `legal` / `luxury` / `sports` / `travel` / `real-estate` / `public-affairs` / `reputation-management` / `executive-founder-branding` / `earned-media` | live pillars | — | — | Pillar |

### Step 2 — Legacy categories table

Table exists (`categories` + `post_categories`). Counts of relevant rows already shown above. Big legacy `-pr` slugs with substantial post counts that have NO matching pillar slug today:

- `crisis-pr` 459 → already a pillar (slug match) ✓
- `technology-pr` 364 → no pillar (`technology` is a 65-char draft)
- `consumer-pr` 247 → no pillar (`consumer-brands` is a 55-char draft)
- `corporate-pr` 242 → no pillar (`corporate-communications` is a 64-char draft)
- `digital-pr` 140 → no pillar (`digital-marketing` is a 57-char draft)
- `ai-pr` 90 → no pillar with this slug (only `ai` draft)
- `healthcare-pr` 57 → already a pillar ✓
- `university-pr` 50 → no pillar (`education` pillar is live but slug differs)
- `gambling-pr` 2 → effectively duplicate of `gambling` (1)

### Step 3 — Where `/ai-pr` is served

There is no dedicated `/ai-pr` route file. It resolves through `src/routes/$slug.tsx` step 2 (`getArchive({ kind: "category", slug: "ai-pr" })`). Nothing to delete code-wise; the route handler is fine. The `ai-pr` **category row** is what makes it render.

### Step 4 — Existing redirects involving these slugs

Already in `redirects` table for this audit's scope: `/adtech-pr/ → /adtech/`, `/beauty-pr/ → /beauty/`, `/cannabis-pr/ → /cannabis/`, `/automotive → /automotive-mobility`, `/retail → /retail-ecommerce`, `/healthcare(/) → /health-tech/`. No redirects yet for `/ai-pr`, `/healthcare-pr`, `/crisis-pr`, `/cyber`, `/finserv`, `/cpg-pr`, `/gambling-pr`, `/technology-pr`, `/consumer-pr`, `/corporate-pr`, `/digital-pr`, `/university-pr`, etc.

### Step 5 — Per-topic consolidation proposal

Three buckets.

#### A. Pillar exists & is canonical — collapse the duplicate post and category onto it

For each of these, the "long-form article" (auto-generated 25–27K HTML) is currently unreachable because the live pillar wins `/$slug`. The post and the matching category should both fold into the pillar.

| Canonical | Action on duplicate post | Action on category (`-pr` or same slug) | Redirects to add | Articles to reparent |
|---|---|---|---|---|
| `/adtech` (pillar 10) | move post 112305's body into `pillars.body_html` (or archive post → unpublish), then delete/unpublish post | merge `adtech` category into pillar (set `pillar_slug='adtech'` on its 11 posts), unpublish category | `/adtech-pr/` already → `/adtech/`. Add `/ai-pr/?` see B | 11 |
| `/cpg` (pillar 9) | same | merge `cpg` cat (5 posts) | n/a | 5 |
| `/cybersecurity` (pillar 5) | same | merge `cybersecurity` cat (12) | `/cyber → /cybersecurity` | 12 |
| `/financial-services` (pillar 3) | same | merge `financial-services` cat (15) | `/finserv → /financial-services` | 15 |
| `/gambling` (pillar 8) | same | merge `gambling` (1) + `gambling-pr` (2) | `/gambling-pr/ → /gambling/` | 3 |
| `/health-tech` (pillar 4) | same | merge `health-tech` cat (8) | (keep `/healthcare → /health-tech`) | 8 |
| `/beauty` (pillar 6) | n/a | merge `beauty` cat (65) | n/a | 65 |
| `/healthcare-pr` (pillar 13) | n/a | category slug matches, just confirm `pillar_slug` reparent on 57 posts | none | 57 |
| `/crisis-pr` (pillar 2) | n/a | reparent 459 posts | none | 459 |

"Reparent" means setting `posts.pillar_slug = '<canonical>'` for every post currently in the category (via `post_categories`). The category row itself is then unpublished/deleted to remove the legacy archive surface.

#### B. Pillar does NOT exist with the canonical slug yet — promote one or alias

| Topic | Recommendation |
|---|---|
| `ai` / `ai-pr` | The 90-post `ai-pr` category is the real index. Two clean options — needs your call: **(B1)** Publish pillar `ai` (currently draft, 133c) using post 112308's content → `body_html`, reparent all 90 `ai-pr` + 4 `ai` category posts to `pillar_slug='ai'`, then `301 /ai-pr → /ai`. **(B2)** Create a new pillar with slug `ai-pr` (preserves the 90-post URL), unpublish draft pillar `ai`, redirect post `/ai → /ai-pr`. |
| `crisis` | No pillar, no post, no cat. Add `301 /crisis → /crisis-pr`. |
| `automotive` | already 301'd → `/automotive-mobility`; pillar 33 is still draft and short. Plan to publish it once content is there. |
| `entertainment` | add `301 /entertainment → /entertainment-media`; promote pillar 30 (draft) when content lands. |
| `retail` | already 301'd → `/retail-ecommerce`; promote pillar 39 when content lands. |
| `consumer-brands` | legacy `consumer-pr` cat has 247 posts. Decide canonical slug: keep `/consumer-brands` and `301 /consumer-pr → /consumer-brands`, OR rename pillar to `consumer-pr`. **Needs your call.** |
| `corporate-communications` | legacy `corporate-pr` cat 242 posts. Same decision. **Needs your call.** |
| `digital-marketing` | legacy `digital-pr` cat 140 posts. Same. **Needs your call.** |
| `technology` | legacy `technology-pr` cat 364 posts. Pillar slug `technology` is a 65-char draft with no hero. Decide canonical: `/technology` vs `/technology-pr`. **Needs your call.** |
| `education` | legacy `university-pr` cat 50 posts. Reparent to `pillar_slug='education'`, `301 /university-pr → /education`. |
| `food-beverage` / `beauty-fashion` / `health-tech` vs `healthcare-pr` overlap | `food-beverage` pillar exists draft, no posts in cat. `beauty-fashion` is a duplicate of `beauty` — propose retiring pillar 54 and `301 /beauty-fashion → /beauty`. `health-tech` and `healthcare-pr` are arguably distinct (devices/SaaS vs hospitals/payers); keep both. |
| `geo` / `generative-engine-optimization` | duplicate. Pillar 12 `geo` is live with content; pillar 59 is a 70-char draft. Retire 59 and `301 /generative-engine-optimization → /geo`. |

#### C. Pure stubs awaiting content (no duplicate surface today)

`b2b-marketing`, `paid-media`, `influencer-marketing`, `internal-communications`, `investor-relations`, `media-training`, `event-experiential`, `government-relations-lobbying`, `podcast-pr`, `analyst-relations`, `content-marketing`, `fashion`, `fintech`, `energy`, `politics-government`, `retail-ecommerce`, `startups-venture`, `automotive-mobility`, `entertainment-media`, `food-beverage`, `seo` — all draft pillars rendering as placeholders. No action needed in this consolidation pass; flag for later content fill-in.

### Step 6 — Pillars currently `published=true` that are missing a hero image

Query result: every `published=true` pillar has `hero_image_url IS NOT NULL`. ✅ No live pillar will look broken. Heroless pillars are all in draft state: `b2b`, `consumer-brands`, `corporate-communications`, `crisis-communications`, `digital-marketing`, `generative-engine-optimization`, `healthcare`, `nonprofit`, `research`, `technology`, `beauty-fashion`. These all need a hero before being promoted (your earlier batch handled the live ones already).

### Step 7 — Edge cases needing your decision before I write the migration

1. **`/ai` canonicalization** — option B1 (canonical `/ai`) or B2 (canonical `/ai-pr`). Affects 94 posts and the URL shown on social shares.
2. **`consumer-pr` (247) / `corporate-pr` (242) / `digital-pr` (140) / `technology-pr` (364)** — for each, do we keep the `-pr` slug as the canonical URL (more SEO equity, worse modern naming) or move to the cleaner pillar slug (`consumer-brands`, `corporate-communications`, `digital-marketing`, `technology`) and 301 the legacy?
3. **Long-form posts at `/adtech`, `/cpg`, `/cybersecurity`, `/financial-services`, `/gambling`, `/health-tech`, `/ai`** (the 25–27K char auto-articles, all 7 published 2026-05-15) — should I (a) merge their HTML into `pillars.body_html` so the content survives, or (b) just unpublish them since the pillar is the canonical surface, or (c) keep them as separate `/X-overview`-style URLs?
4. **`gambling` vs `gambling-pr` cat** — both tiny (1 + 2 posts). Confirm I can collapse into one.
5. **`healthcare` vs `health-tech`** — currently `/healthcare → /health-tech`. The legacy `healthcare-pr` (57-post category, also a live pillar) covers a different angle. Confirm this 3-way is intentional.

### Step 8 — Once you approve, the execution batch will be

A single migration that:
1. Sets `posts.pillar_slug` on every post in each merged category (via `post_categories`).
2. Inserts redirects for every legacy slug → canonical slug (with and without trailing slash).
3. Unpublishes (or deletes) the duplicate post rows you've decided to retire.
4. Unpublishes / deletes the duplicate category rows.
5. Promotes selected draft pillars to `published=true` once their `body_html` is filled (only those covered by your decisions in Step 7).
6. Optionally copies long-form post HTML into `pillars.body_html` per your call in Step 7.3.

No code changes to `$slug.tsx` are needed — the resolver order already does the right thing once the data is consolidated.