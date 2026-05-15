## Problem

On `/premium-cabin-first-class-storytelling` (and 21 sibling Travel pillar articles), two things look broken:

1. **FAQ shows twice** — once inside the article body (`<h2>FAQ</h2>` + Q/A `<h3>`s), then again in the dedicated "Frequently Asked Questions" accordion below.
2. **"Related Playbooks" list is raw markdown** — items render as `[Loyalty Program PR & the Miles Economy](/loyalty-program-pr-miles-economy/)` instead of clickable links.

## Root cause

- The article view already calls `stripFaqFromHtml`, but that helper only matches an `<h2>` whose text is **"Frequently Asked Questions"**. Ronn's Travel batch uses **`<h2>FAQ</h2>`**, so nothing gets stripped and the body FAQ stays.
- The seeder converted the markdown-link list into `<ul><li>` tags but did not convert the `[text](url)` syntax inside each `<li>` into `<a href>` tags.

Scope (queried just now): only the **22 articles with `pillar_slug='travel'`** are affected. All other Ronn batches are clean.

## Fix

### 1. Make the FAQ stripper recognize "FAQ" / "FAQs"

`src/lib/faq.ts` — extend the regex in `stripFaqFromHtml` so it also matches headings whose text is `FAQ` or `FAQs` (case-insensitive), in addition to "Frequently Asked Questions". One-line change.

This is the safety net so the body FAQ is hidden even if some article slips through with the short heading in the future.

### 2. One-time DB backfill on the 22 Travel articles

Run a Supabase migration that, for `article_type='pillar' AND pillar_slug='travel'`:

- **Convert markdown links inside `<li>`**: replace `<li>[label](/path/)</li>` with `<li><a href="/path/">label</a></li>` using a `regexp_replace` with the `g` flag. Decode `&amp;` back to `&` inside the label so titles like "Loyalty Program PR & the Miles Economy" render correctly.
- **Strip the stray `<p>---</p>` horizontal-rule paragraphs** that appear between the body, FAQ, Related Playbooks, and About 5W blocks (cosmetic).
- Touch `updated_at` so cache busts.

The dedicated "Frequently Asked Questions" accordion below the article is already populated from `extractFaqPairs(content_html)` and will keep working — once `stripFaqFromHtml` removes the body copy, the page shows the FAQ exactly once.

### 3. Verify

Reload `/premium-cabin-first-class-storytelling` and one or two siblings (e.g. `/loyalty-program-pr-miles-economy`, `/route-launch-pr-playbook`) and confirm:
- Only one FAQ section (the styled accordion).
- "Related Playbooks" items are clickable `<a>` links pointing at `/[slug]/`.
- No leftover `---` separators.

## Files touched

- `src/lib/faq.ts` — extend `stripFaqFromHtml` regex.
- One Supabase migration that updates `posts.content_html` for the 22 Travel rows.

No changes to `PillarView`, the article route, or any other vertical.