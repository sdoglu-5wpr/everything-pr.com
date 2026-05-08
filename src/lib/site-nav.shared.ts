// Shared primary nav definition. Source of truth for the site header and
// internal-linking helpers/scripts.

export type LeafLink =
  | { label: string; kind: "category"; slug: string }
  | { label: string; kind: "post"; slug: string }
  | { label: string; kind: "path"; to: string };

export type NavItem =
  | { label: string; kind: "category"; slug: string }
  | { label: string; kind: "path"; to: string }
  | { label: string; kind: "menu"; children: LeafLink[] };

export const SITE_PRIMARY_NAV: NavItem[] = [
  { label: "News", kind: "category", slug: "pr-news" },
  {
    label: "Sectors",
    kind: "menu",
    children: [
      { label: "AdTech", kind: "category", slug: "adtech" },
      { label: "Beauty", kind: "category", slug: "beauty" },
      { label: "Cannabis", kind: "category", slug: "cannabis" },
      { label: "Consumer Goods (CPG)", kind: "category", slug: "cpg" },
      { label: "Cybersecurity", kind: "category", slug: "cybersecurity" },
      { label: "Financial Services", kind: "category", slug: "financial-services" },
      { label: "Gambling & iGaming", kind: "category", slug: "gambling" },
      { label: "Healthcare", kind: "category", slug: "healthcare-pr" },
      { label: "Health Tech", kind: "category", slug: "health-tech" },
      { label: "Hospitality & Travel", kind: "category", slug: "hospitality" },
    ],
  },
  {
    label: "Disciplines",
    kind: "menu",
    children: [
      { label: "AI Communications", kind: "category", slug: "ai-communications" },
      { label: "Crisis Communications", kind: "category", slug: "crisis-pr" },
      { label: "Digital Marketing", kind: "category", slug: "marketing" },
      { label: "Press Releases", kind: "category", slug: "press-release" },
      { label: "Public Relations", kind: "category", slug: "public-relations" },
      { label: "Social Media", kind: "category", slug: "social-media" },
    ],
  },
  { label: "Research", kind: "path", to: "/research" },
  { label: "AI & GEO", kind: "path", to: "/generative-engine-optimization" },
  { label: "PR Firms", kind: "category", slug: "pr-firms" },
  { label: "RFPs", kind: "category", slug: "rfp" },
  { label: "About", kind: "path", to: "/about" },
];
