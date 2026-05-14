export type GlossaryLink = { label: string; url?: string; slug?: string };

export type GlossaryTerm = {
  id: string;
  slug: string;
  title: string;
  short_definition: string;
  extended_html: string | null;
  category: string | null;
  where_used: GlossaryLink[];
  related_terms: GlossaryLink[];
};

export type GlossaryCategory = {
  key: string;
  label: string;
  description?: string;
};

export const GLOSSARY_CATEGORIES: GlossaryCategory[] = [
  { key: "ai-discovery", label: "AI & Discovery" },
  { key: "earned-media-pr", label: "Earned Media & PR" },
  { key: "crisis-risk", label: "Crisis & Risk" },
  { key: "financial-fintech", label: "Financial & Fintech" },
  { key: "healthcare", label: "Healthcare" },
  { key: "legal-policy", label: "Legal & Policy" },
  { key: "marketing-media", label: "Marketing & Media" },
  { key: "b2b-tech", label: "B2B Tech" },
  { key: "consumer-creator", label: "Consumer & Creator" },
  { key: "sports-gaming", label: "Sports & Gaming" },
  { key: "cannabis", label: "Cannabis" },
  { key: "real-estate", label: "Real Estate" },
  { key: "web3", label: "Web3" },
  { key: "reputation", label: "Reputation" },
  { key: "luxury", label: "Luxury" },
];

export const GLOSSARY_LETTERS = "ABCDEFGHIKLMNOPRSTWZ".split("");

export const FEATURED_SLUGS = [
  "geo",
  "aeo",
  "citation-share",
  "entity-authority",
  "retrieval-anchor",
  "ai-disclosure",
  "disclosure-quality",
  "24-hour-rule",
];

export function firstLetter(title: string): string {
  const m = title.match(/[A-Za-z]/);
  return (m ? m[0] : "#").toUpperCase();
}
