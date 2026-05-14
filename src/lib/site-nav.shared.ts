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

// Phase 2N taxonomy. Sectors: AI pinned first, then alphabetical.
// Disciplines: AI Communications + GEO + SEO pinned, then alphabetical.
export const SITE_PRIMARY_NAV: NavItem[] = [
  { label: "News", kind: "category", slug: "pr-news" },
  {
    label: "Sectors",
    kind: "menu",
    children: [
      { label: "AI", kind: "path", to: "/ai" },
      { label: "AdTech", kind: "path", to: "/adtech" },
      { label: "Automotive & Mobility", kind: "path", to: "/automotive-mobility" },
      { label: "Beauty", kind: "category", slug: "beauty" },
      { label: "Cannabis", kind: "category", slug: "cannabis" },
      { label: "Consumer Goods (CPG)", kind: "category", slug: "cpg" },
      { label: "Crypto & Web3", kind: "path", to: "/crypto-web3" },
      { label: "Cybersecurity", kind: "category", slug: "cybersecurity" },
      { label: "Defense", kind: "path", to: "/defense" },
      { label: "Education", kind: "path", to: "/education" },
      { label: "Energy", kind: "path", to: "/energy" },
      { label: "Enterprise SaaS", kind: "path", to: "/enterprise-saas" },
      { label: "Entertainment & Media", kind: "path", to: "/entertainment-media" },
      { label: "Fashion", kind: "category", slug: "fashion" },
      { label: "Financial Services", kind: "category", slug: "financial-services" },
      { label: "Fintech", kind: "path", to: "/fintech" },
      { label: "Food & Beverage", kind: "path", to: "/food-beverage" },
      { label: "Gambling & iGaming", kind: "category", slug: "gambling" },
      { label: "Healthcare", kind: "category", slug: "healthcare-pr" },
      { label: "Health Tech", kind: "category", slug: "health-tech" },
      { label: "Hospitality", kind: "category", slug: "hospitality" },
      { label: "Legal", kind: "path", to: "/legal" },
      { label: "Luxury", kind: "path", to: "/luxury" },
      { label: "Politics & Government", kind: "path", to: "/politics-government" },
      { label: "Public Affairs", kind: "path", to: "/public-affairs" },
      { label: "Real Estate", kind: "path", to: "/real-estate" },
      { label: "Retail & eCommerce", kind: "path", to: "/retail-ecommerce" },
      { label: "Sports", kind: "path", to: "/sports" },
      { label: "Startups & Venture", kind: "path", to: "/startups-venture" },
      { label: "Travel", kind: "path", to: "/travel" },
    ],
  },
  {
    label: "Disciplines",
    kind: "menu",
    children: [
      { label: "AI Communications", kind: "category", slug: "ai-communications" },
      { label: "GEO", kind: "path", to: "/geo" },
      { label: "SEO", kind: "path", to: "/seo" },
      { label: "Analyst Relations", kind: "path", to: "/analyst-relations" },
      { label: "B2B Marketing", kind: "path", to: "/b2b-marketing" },
      { label: "Content Marketing", kind: "path", to: "/content-marketing" },
      { label: "Crisis Communications", kind: "category", slug: "crisis-pr" },
      { label: "Digital Marketing", kind: "category", slug: "marketing" },
      { label: "Earned Media", kind: "path", to: "/earned-media" },
      { label: "Event & Experiential", kind: "path", to: "/event-experiential" },
      { label: "Executive & Founder Branding", kind: "path", to: "/executive-founder-branding" },
      { label: "Government Relations & Lobbying", kind: "path", to: "/government-relations-lobbying" },
      { label: "Influencer Marketing", kind: "path", to: "/influencer-marketing" },
      { label: "Internal Communications", kind: "path", to: "/internal-communications" },
      { label: "Investor Relations", kind: "path", to: "/investor-relations" },
      { label: "Media Training", kind: "path", to: "/media-training" },
      { label: "Paid Media", kind: "path", to: "/paid-media" },
      { label: "Podcast PR", kind: "path", to: "/podcast-pr" },
      { label: "Reputation Management", kind: "path", to: "/reputation-management" },
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
