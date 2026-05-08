import { Info } from "lucide-react";

const PATTERNS = [/\b5W\b/, /5wpr/i, /five\s*w\s*public\s*relations/i];

export function shouldShow5WDisclosure({
  title,
  contentHtml,
  authorName,
}: {
  title?: string | null;
  contentHtml?: string | null;
  authorName?: string | null;
}): boolean {
  const haystack = `${title ?? ""}\n${contentHtml ?? ""}\n${authorName ?? ""}`;
  return PATTERNS.some((re) => re.test(haystack));
}

export function Disclosure5W() {
  return (
    <aside
      role="note"
      aria-label="Editorial disclosure"
      className="mt-6 mb-8 rounded-md border-l-4 border-brand-blue bg-surface-soft p-4 text-sm text-foreground/85 flex gap-3"
    >
      <Info className="w-4 h-4 mt-0.5 shrink-0 text-brand-blue" aria-hidden />
      <p className="leading-relaxed">
        <span className="font-semibold text-foreground">Disclosure:</span>{" "}
        This article covers 5W or a 5W-related entity. A principal owner of
        Everything-PR is also an owner of 5W. Editorial decisions are made
        independently.
      </p>
    </aside>
  );
}
