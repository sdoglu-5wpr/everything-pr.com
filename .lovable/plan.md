# Polish formatting on recent articles (add H2/H3)

## Problem

Many recently published articles render as walls of `<p>` tags. Section
labels like `1. Audit and Clean Wikipedia and Wikidata`,
`2. Land Tier-One Earned Media…`, or `90-Day Execution Plan` are wrapped
in `<p>` (sometimes `<p><strong>…</strong></p>`) instead of `<h2>` /
`<h3>`. This hurts readability, SEO, FAQ extraction, and the table of
contents experience.

Quick scan of the last 90 days of `posts` (status=publish, type=post):

- 306 published posts
- 72 have **zero** `<h2>`/`<h3>` headings
- 6 use the `<p>1. Title</p>` numbered pattern (e.g. the article you linked)
- 43 use the `<p><strong>Heading</strong></p>` pattern as fake headings

## Approach

A one-shot reformatting pass over all candidate articles, run as a
script (no UI). Two-stage pipeline so we stay safe and reversible:

1. **Deterministic pass** — covers the obvious patterns with regex, no
   AI needed:
   - `<p>N. Heading text</p>` (a paragraph that is just `N. Title`,
     under ~120 chars, followed by another paragraph) → `<h2>Heading</h2>`
   - `<p><strong>Heading text</strong></p>` where the paragraph is only
     the bold span and ≤ 120 chars → `<h2>Heading</h2>`
   - Common known section labels (`Methodology`, `Key Findings`,
     `Conclusion`, `90-Day Execution Plan`, `The Headline Number`,
     `What This Means`, `Recommendations`, etc.) wrapped in a short
     standalone `<p>` → `<h2>`
   - Inside numbered groups, sub-bullets that look like `<p>A. Sub</p>`
     or `<p><em>Sub</em></p>` → `<h3>` (only when nested under an H2)

2. **AI pass for the rest** — for the remaining ~70 articles that have
   *no* headings at all and don't match the deterministic patterns,
   call the Lovable AI gateway (`google/gemini-3-flash-preview`) with a
   strict prompt:
   - Input: current `content_html`
   - Task: insert `<h2>` / `<h3>` where appropriate. Do **not** change
     wording, do **not** add or remove paragraphs, do **not** touch
     images, links, lists, or schema markup. Return HTML only.
   - Output is validated: must still contain the same plain-text body
     (length within ±2%), same number of `<a>` and `<img>` tags. If
     validation fails, skip the article.

## Safety

- Snapshot every modified article into `post_revisions` (kind =
  `'autosave'`, with a note like `pre-format-polish-v1`) before the
  update. The admin already uses this table, so revisions are
  visible/restorable from the existing UI.
- Dry-run mode first: write the proposed HTML to `/tmp/format-diffs/`
  and print a summary (id, slug, what changed). I'll show you the diff
  for ~5 sample articles for sign-off before any DB writes.
- Then run the live pass in batches of 25 with a short delay.

## Scope

- Articles where `status='publish'` AND `type='post'` AND
  `published_at > now() - interval '90 days'`.
- Skip pages, drafts, and anything that already has ≥ 2 `<h2>` tags
  unless it also matches the `<p>N. Title</p>` pattern (the linked
  article does have proper structure elsewhere but still has the
  numbered-paragraph bug).

## Deliverables

1. `scripts/polish-article-formatting.ts` — the reformatter (regex
   stage + AI stage + validator + revision snapshot + batched update).
2. A short admin migration is **not** needed — this is a data update,
   done via the script using the service-role server client.
3. A summary report written to `/mnt/documents/format-polish-report.md`
   listing every article touched, before/after heading counts, and any
   skipped items.

## Out of scope (ask if you want them later)

- Rewriting prose, fixing typos, or restructuring arguments.
- Adding new images or changing existing ones.
- Backfilling FAQ schema (the existing FAQ extractor will benefit
  automatically from the new H2s).
- Older articles (>90 days). Easy to extend the window after we
  validate the first batch.

## Confirmation needed

Before I start the live pass I'll show you 3–5 before/after diffs from
the dry run so you can sanity-check tone and heading choices.
