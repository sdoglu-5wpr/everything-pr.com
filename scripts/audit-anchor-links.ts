#!/usr/bin/env bun
/**
 * Audit (and optionally fix) anchor links in a posts JSONL.
 * Detects legacy absolute everything-pr.com URLs in <a href="..."> attributes.
 *
 * Usage:
 *   bun run scripts/audit-anchor-links.ts --in ./data/posts.jsonl --out ./data/anchor-audit.jsonl
 *   bun run scripts/audit-anchor-links.ts --in ./data/posts.jsonl --out ./data/posts.fixed.jsonl --apply
 */
import { readFileSync, writeFileSync } from "node:fs";
import { rewriteLegacyHtml } from "../src/lib/legacy-urls";

type PostRow = { slug: string; content_html?: string; [k: string]: unknown };

function parseArgs(argv: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const val = argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[++i] : "true";
      out[key] = val;
    }
  }
  return out;
}

const LEGACY_ANCHOR_RE = /<a\b[^>]*href=["']https?:\/\/(?:www\.)?everything-pr\.com(?!\/wp-content\/)([^"']*)["'][^>]*>/gi;

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const inPath = args.in || "./data/posts.jsonl";
  const outPath = args.out || "./data/anchor-audit.jsonl";
  const apply = args.apply === "true" || args.apply === "1";

  const raw = readFileSync(inPath, "utf8");
  const lines = raw.split(/\r?\n/).filter(Boolean);

  let scanned = 0;
  let postsWithLegacy = 0;
  let totalLegacyAnchors = 0;
  let changed = 0;

  const outLines: string[] = [];

  for (const line of lines) {
    let post: PostRow;
    try {
      post = JSON.parse(line);
    } catch {
      continue;
    }
    scanned++;
    const html = post.content_html ?? "";
    const matches = html.match(LEGACY_ANCHOR_RE);
    const count = matches ? matches.length : 0;
    if (count > 0) {
      postsWithLegacy++;
      totalLegacyAnchors += count;
    }

    if (apply) {
      const fixed = rewriteLegacyHtml(html);
      if (fixed !== html) changed++;
      outLines.push(JSON.stringify({ ...post, content_html: fixed }));
    } else {
      outLines.push(
        JSON.stringify({
          slug: post.slug,
          legacy_anchor_count: count,
          samples: matches ? matches.slice(0, 3) : [],
        }),
      );
    }
  }

  writeFileSync(outPath, outLines.join("\n") + "\n", "utf8");
  console.log(
    `Scanned ${scanned} posts | posts_with_legacy=${postsWithLegacy} legacy_anchors=${totalLegacyAnchors} ${
      apply ? `changed=${changed}` : "(audit only — pass --apply to rewrite)"
    } → ${outPath}`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
