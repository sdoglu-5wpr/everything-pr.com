# Phase 2g.1b — /glossary education enrichment plan

## 1. Slug collision inventory

### vs. existing `glossary_terms` (99 rows, not 98)
Queried all 12 proposed slugs against `glossary_terms`. **Zero matches.** All 12 are net-new inserts. No merge/replace decisions required.

### vs. just-shipped Education posts (`posts` table)
Education clusters that share a stem with proposed glossary slugs:

| Proposed glossary slug | Education post slug | Collision? |
|---|---|---|
| `multimodal-learning-ai` | `multimodal-learning-ai` (id 112871) | **Same string, different table + URL namespace** |
| `ai-classroom-assistant` | `ai-classroom-assistants` (id 112865, plural) | No |
| `learning-record-store` | `learning-record-store-data-infrastructure` (id 112870) | No |
| `agentic-learning-environment` | `agentic-learning-environments` (id 112863, plural) | No |
| Other 8 proposed slugs | — | No |

## 2. URL routing model

Two distinct file routes, two distinct tables, two distinct URL namespaces:

- `src/routes/$slug.tsx` → flat `/{slug}/` → reads from `posts`
- `src/routes/glossary.$slug.tsx` → `/glossary/{slug}/` → reads from `glossary_terms` via `getGlossaryTerm`

The slug uniqueness constraint is **per table, not global**. `multimodal-learning-ai` can legitimately exist as both a post (`/multimodal-learning-ai/`) and a glossary entry (`/glossary/multimodal-learning-ai/`) with no resolver conflict. **Recommendation: keep all 12 proposed slugs as-is — no renaming needed.**

## 3. `glossary_terms` schema shape

Columns available for new inserts:

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | auto |
| `slug` | text | unique key |
| `title` | text | required |
| `short_definition` | text | required — first ~40 words / 160 chars |
| `extended_html` | text | nullable — long-form body |
| `category` | text | **single value**, not array |
| `related_terms` | jsonb | array of `{label, url?, slug?}` |
| `where_used` | jsonb | array of `{label, url?, slug?}` — backlink registry |
| `published` | bool | default true |

**No dedicated columns** for `also_known_as`, `etymology`, `synonyms`, `examples`, `compared_to`, `faq`. Ronn's richer Pillar 8 source structure must be rendered as HTML sections inside `extended_html` (e.g. `<h3>Also known as</h3>`, `<h3>Etymology</h3>`, `<h3>Compared to</h3>`, `<h3>Examples</h3>`). The seeder's markdown→HTML pass already handles this — same pattern as the 99 existing terms.

## 4. Tagging mechanism

Tagging is via the **single `category` text column**, not a tag join table. 15 categories currently registered in `src/lib/glossary.shared.ts` `GLOSSARY_CATEGORIES`. **No `education` category exists yet.** To make the 12 entries filterable as the "AI Education Dictionary" subset:

1. Add `{ key: "education", label: "Education" }` to `GLOSSARY_CATEGORIES` in `src/lib/glossary.shared.ts`.
2. Add the 12 new slug→category mappings to `CATEGORY_BY_SLUG` in `scripts/seed-glossary.mjs`.
3. Set `category = 'education'` on all 12 inserts.

The glossary index page (`/glossary`) already filters by category via this list, so the new "Education" facet appears automatically.

## 5. Cross-link integration

`scripts/seed-education.mjs` runs `autoLinkGlossary(html, glossary, selfSlug)` (line 368) during the parse step: it loads all `glossary_terms` and replaces title occurrences in article HTML with `<a href="/glossary/{slug}/">`. The 91 Education articles **already passed through** this step at their original seed time, against the 99-term inventory. They will NOT pick up the 12 new terms until re-parsed.

A re-seed of `seed-education.mjs` is idempotent (matches on slug, updates content_html in place) and is the standard refresh mechanism. It will re-link all 91 articles against the expanded 111-term glossary in one pass.

## 6. Recommended slug adjustments

**None.** All 12 proposed slugs are clear of collisions in their own namespace. The visual similarity between `/multimodal-learning-ai/` (post) and `/glossary/multimodal-learning-ai/` (term) is intentional and SEO-friendly: the term defines, the article explores.

## 7. Order of operations (after approval)

1. **Append** Ronn's 12 entries to `data/glossary-source.md` (verbatim, parser-compatible markdown).
2. **Edit** `src/lib/glossary.shared.ts` — add `education` to `GLOSSARY_CATEGORIES`.
3. **Edit** `scripts/seed-glossary.mjs` — add the 12 slug→`education` mappings to `CATEGORY_BY_SLUG`.
4. **Run** `bun run scripts/seed-glossary.mjs` → expect **+12 inserts** (total 99 → 111). All `published=true` (matches existing pattern; glossary has no draft/publish gating analog to posts).
5. **Re-run** `bun run scripts/seed-education.mjs` → 91 articles re-parsed; `content_html` updated in place with new `/glossary/.../` links. Drafts stay drafts (status untouched). Expect 91 row updates, glossary_linked counts increase.
6. **Verify** with a sample query: pick 3 Education articles, confirm new `<a href="/glossary/ai-tutor/">` etc. appear in `content_html`.

## Estimated rows touched

- `glossary_terms`: **+12 inserts** (99 → 111)
- `posts`: **91 updates** (Education vertical re-parse, content_html only; status/featured_media_id untouched)
- Source files edited: 3 (`data/glossary-source.md`, `src/lib/glossary.shared.ts`, `scripts/seed-glossary.mjs`)

## Open questions / flags

- **None blocking.** Awaiting Ronn's Pillar 8 source content (the 12 markdown entries from `education-drafts-part4.md` lines 909–1674) to append to `data/glossary-source.md`.
- Confirm: keep `published=true` for the 12 new terms (consistent with the other 99), since glossary has no draft workflow? Or do you want them inserted as `published=false` and flipped later to mirror the Education drafts policy?

**Awaiting "approved — execute Phase 2g.1b" + the Pillar 8 source block.**
