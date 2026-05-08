## Fix: Author bio shows raw `<p>` and `<a>` tags

**File:** `src/routes/$slug.tsx`

1. Add import: `import { rewriteLegacyHtml } from "@/lib/legacy-urls";`
2. In `AuthorCard` (around line 432), replace:
   ```tsx
   <p className="mt-2 text-sm text-muted-foreground leading-relaxed line-clamp-4">{author.bio}</p>
   ```
   with:
   ```tsx
   <div
     className="mt-2 text-sm text-muted-foreground leading-relaxed line-clamp-4 [&_a]:underline [&_a]:text-foreground"
     dangerouslySetInnerHTML={{ __html: rewriteLegacyHtml(author.bio) }}
   />
   ```

Author bios are admin-controlled (same trust level as `content_html` already rendered via `dangerouslySetInnerHTML` on the same page), so no new XSS surface. `rewriteLegacyHtml` keeps any embedded links pointing at the current domain.