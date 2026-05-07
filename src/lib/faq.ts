import { htmlToPlainText } from "./text";

export type FaqPair = { q: string; a: string };

/**
 * Extracts FAQ pairs from HTML where an <h2> or <h3> ending in "?" is
 * followed by answer content. Used for both visible FAQ rendering and
 * FAQPage JSON-LD generation.
 */
export function extractFaqPairs(html: string | null | undefined): FaqPair[] {
  if (!html) return [];
  const out: FaqPair[] = [];
  const seen = new Set<string>();

  // Strip nested tags from heading content for the question text.
  const stripTags = (s: string) => s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

  // Pattern A: <h2>/<h3>/<h4> ending in "?" followed by content until next heading.
  const reHeading = /<h([234])[^>]*>([\s\S]*?)<\/h\1>([\s\S]*?)(?=<h[234][^>]*>|$)/gi;
  let m: RegExpExecArray | null;
  while ((m = reHeading.exec(html))) {
    const qRaw = stripTags(m[2]);
    if (!/\?\s*$/.test(qRaw)) continue;
    const a = htmlToPlainText(m[3]).trim().slice(0, 1000);
    if (!qRaw || !a) continue;
    const key = qRaw.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ q: qRaw, a });
    if (out.length >= 20) return out;
  }

  // Pattern B: <p><strong>Question?</strong></p> followed by paragraph(s).
  const reStrong = /<p[^>]*>\s*<(?:strong|b)>([\s\S]*?\?)\s*<\/(?:strong|b)>\s*<\/p>([\s\S]*?)(?=<p[^>]*>\s*<(?:strong|b)>|<h[234]|$)/gi;
  while ((m = reStrong.exec(html))) {
    const qRaw = stripTags(m[1]);
    const a = htmlToPlainText(m[2]).trim().slice(0, 1000);
    if (!qRaw || !a) continue;
    const key = qRaw.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ q: qRaw, a });
    if (out.length >= 20) break;
  }

  return out;
}
