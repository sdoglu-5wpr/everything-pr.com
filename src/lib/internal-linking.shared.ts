// Internal-linking constants and rules. Source of truth for ops scripts that
// build the internal-links JSONL, audit anchors, and map keywords.

import { SITE_PRIMARY_NAV, type NavItem } from "./site-nav.shared";

function findMenu(label: string): NavItem | undefined {
  return SITE_PRIMARY_NAV.find((n) => n.label === label && n.kind === "menu");
}

function leafCategorySlugs(menuLabel: string): string[] {
  const m = findMenu(menuLabel);
  if (!m || m.kind !== "menu") return [];
  return m.children
    .filter((c): c is { label: string; kind: "category"; slug: string } => c.kind === "category")
    .map((c) => c.slug);
}

export const EPR_SECTOR_CATEGORY_SLUGS: string[] = leafCategorySlugs("Sectors");
export const EPR_DISCIPLINE_CATEGORY_SLUGS: string[] = leafCategorySlugs("Disciplines");

// Hub paths — high-authority internal targets we link toward.
export const EPR_HUB_PATHS: string[] = [
  "/research",
  "/generative-engine-optimization",
  "/about",
  "/pr-news",
  "/pr-firms",
  "/rfp",
];

export const INTERNAL_LINKS_JSONL_RELATIVE = "data/internal-links.jsonl";

export type InternalLinkJsonlRow = {
  source_slug: string;
  target_url: string;
  anchor_text: string;
  kind: "hub" | "sibling" | "manual";
};

export const INTERNAL_LINKING_RULES_SUMMARY = `
Internal linking rules (Everything PR):
1. Every article should link to at most 3 hub pages (sectors, disciplines, /research, /generative-engine-optimization).
2. Every article should link to up to 4 sibling articles in the same primary category.
3. Anchor text must be descriptive — avoid "click here" or bare URLs.
4. No duplicate (source_slug, target_url) pairs.
5. Prefer linking to evergreen pillar/category pages over individual posts when topical.
6. Never self-link.
7. Use relative URLs ("/<slug>" or "/category/<slug>"); never absolute everything-pr.com URLs.
`.trim();
