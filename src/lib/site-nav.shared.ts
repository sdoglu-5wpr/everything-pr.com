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
      { label: "AdTech", kind: "path", to: "/adtech" },
      { label: "B2B", kind: "path", to: "/b2b" },
      { label: "Beauty", kind: "category", slug: "beauty" },
      { label: "Cannabis", kind: "category", slug: "cannabis" },
      { label: "Consumer Goods (CPG)", kind: "category", slug: "cpg" },
      { label: "Cybersecurity", kind: "category", slug: "cybersecurity" },
      { label: "Defense", kind: "path", to: "/defense" },
      { label: "Education", kind: "path", to: "/education" },
      { label: "Financial Services", kind: "category", slug: "financial-services" },
      { label: "Gambling & iGaming", kind: "category", slug: "gambling" },
      { label: "Healthcare", kind: "category", slug: "healthcare-pr" },
      { label: "Health Tech", kind: "category", slug: "health-tech" },
      { label: "Hospitality & Travel", kind: "category", slug: "hospitality" },
      { label: "Legal", kind: "path", to: "/legal" },
      { label: "Luxury", kind: "path", to: "/luxury" },
      { label: "Public Affairs", kind: "path", to: "/public-affairs" },
      { label: "Real Estate", kind: "path", to: "/real-estate" },
      { label: "Sports", kind: "path", to: "/sports" },
      { label: "Travel", kind: "path", to: "/travel" },
      { label: "Web3", kind: "path", to: "/web3" },
    ],
  },
  {
    label: "Disciplines",
    kind: "menu",
    children: [
      { label: "AI Communications", kind: "category", slug: "ai-communications" },
      { label: "Crisis Communications", kind: "category", slug: "crisis-pr" },
      { label: "Earned Media", kind: "path", to: "/earned-media" },
      { label: "Executive & Founder Branding", kind: "path", to: "/executive-founder-branding" },
      { label: "GEO", kind: "path", to: "/geo" },
      { label: "Reputation Management", kind: "path", to: "/reputation-management" },
      { label: "Digital Marketing", kind: "category", slug: "marketing" },
      { label: "Press Releases", kind: "category", slug: "press-release" },
      { label: "Public Relations", kind: "category", slug: "public-relations" },
      { label: "Social Media", kind: "category", slug: "social-media" },
    ],
  },
  { label: "Research", kind: "path", to: "/research" },
  { label: "AI & GEO", kind: "path", to: "/geo" },
  { label: "PR Firms", kind: "category", slug: "pr-firms" },
  { label: "RFPs", kind: "category", slug: "rfp" },
  {
    label: "About",
    kind: "menu",
    children: [
      { label: "About Everything-PR", kind: "path", to: "/about" },
      { label: "Team", kind: "path", to: "/about/team" },
    ],
  },
];
