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

/**
 * Removes an in-content "Frequently Asked Questions" section so the
 * dedicated FaqSection card doesn't duplicate it. Strips the FAQ heading
 * plus subsequent contiguous question-heading blocks (headings ending in "?").
 */
export function stripFaqFromHtml(html: string | null | undefined): string {
  if (!html) return html ?? "";
  const re = /<h([234])[^>]*>\s*(?:<[^>]*>\s*)*frequently asked questions\s*(?:<\/[^>]*>\s*)*<\/h\1>/i;
  const m = re.exec(html);
  if (!m) return html;
  const start = m.index;
  let end = start + m[0].length;
  const blockRe = /<h([234])[^>]*>([\s\S]*?)<\/h\1>([\s\S]*?)(?=<h[234][^>]*>|$)/gi;
  blockRe.lastIndex = end;
  let nm: RegExpExecArray | null;
  while ((nm = blockRe.exec(html))) {
    if (nm.index !== end) break;
    const qText = nm[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    if (!/\?\s*$/.test(qText)) break;
    end = nm.index + nm[0].length;
    blockRe.lastIndex = end;
  }
  return html.slice(0, start) + html.slice(end);
}
