import { htmlToPlainText } from "./text";

export type FaqPair = { q: string; a: string };

/**
 * Extracts FAQ pairs from HTML where an <h2> or <h3> ending in "?" is
 * followed by answer content. Used for both visible FAQ rendering and
 * FAQPage JSON-LD generation.
 */
export function extractFaqPairs(html: string | null | undefined): FaqPair[] {
  if (!html) return [];
  const re = /<h[23][^>]*>([^<]*\?)\s*<\/h[23]>([\s\S]*?)(?=<h[23]|$)/gi;
  const out: FaqPair[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const q = m[1].replace(/\s+/g, " ").trim();
    const a = htmlToPlainText(m[2]).trim().slice(0, 1000);
    if (q && a) out.push({ q, a });
    if (out.length >= 12) break;
  }
  return out;
}
