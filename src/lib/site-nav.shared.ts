// Shared primary nav definition. Source of truth for the site header and
// internal-linking helpers/scripts.

export type LeafLink =
  | { label: string; kind: "category"; slug: string }
  | { label: string; kind: "post"; slug: string }
  | { label: string; kind: "path"; to: string };

export type NavGroup = { label: string; children: LeafLink[] };

export type NavItem =
  | { label: string; kind: "category"; slug: string }
  | { label: string; kind: "path"; to: string }
  | { label: string; kind: "menu"; children: LeafLink[]; groups?: NavGroup[] };

// Helpers to keep grouped definitions terse.
const cat = (label: string, slug: string): LeafLink => ({ label, kind: "category", slug });
const path = (label: string, to: string): LeafLink => ({ label, kind: "path", to });

const SECTOR_GROUPS: NavGroup[] = [
  {
    label: "Tech & Digital",
    children: [
      path("AI", "/ai"),
      path("AdTech", "/adtech"),
      path("Crypto & Web3", "/crypto-web3"),
      cat("Cybersecurity", "cybersecurity"),
      path("Enterprise SaaS", "/enterprise-saas"),
      path("Fintech", "/fintech"),
      path("Startups & Venture", "/startups-venture"),
    ],
  },
  {
    label: "Consumer & Lifestyle",
    children: [
      cat("Beauty", "beauty"),
      cat("Cannabis", "cannabis"),
      cat("Consumer Goods (CPG)", "cpg"),
      cat("Fashion", "fashion"),
      path("Food & Beverage", "/food-beverage"),
      cat("Hospitality", "hospitality"),
      path("Luxury", "/luxury"),
      path("Retail & eCommerce", "/retail-ecommerce"),
      path("Travel", "/travel"),
    ],
  },
  {
    label: "Industry & Infrastructure",
    children: [
      path("Automotive & Mobility", "/automotive-mobility"),
      path("Defense", "/defense"),
      path("Energy", "/energy"),
      path("Real Estate", "/real-estate"),
    ],
  },
  {
    label: "Regulated & Public",
    children: [
      path("Education", "/education"),
      path("Entertainment & Media", "/entertainment-media"),
      cat("Financial Services", "financial-services"),
      cat("Gambling & iGaming", "gambling"),
      cat("Healthcare", "healthcare-pr"),
      cat("Health Tech", "health-tech"),
      path("Legal", "/legal"),
      path("Politics & Government", "/politics-government"),
      path("Public Affairs", "/public-affairs"),
      path("Sports", "/sports"),
    ],
  },
];

const DISCIPLINE_GROUPS: NavGroup[] = [
  {
    label: "AI & Search",
    children: [
      cat("AI Communications", "ai-communications"),
      path("GEO", "/generative-engine-optimization"),
      path("SEO", "/seo"),
    ],
  },
  {
    label: "Earned & Influence",
    children: [
      path("Earned Media", "/earned-media"),
      path("Influencer Marketing", "/influencer-marketing"),
      path("Media Training", "/media-training"),
      path("Podcast PR", "/podcast-pr"),
      path("Analyst Relations", "/analyst-relations"),
    ],
  },
  {
    label: "Marketing & Content",
    children: [
      path("B2B Marketing", "/b2b-marketing"),
      path("Content Marketing", "/content-marketing"),
      cat("Digital Marketing", "marketing"),
      path("Paid Media", "/paid-media"),
      cat("Social Media", "social-media"),
      path("Event & Experiential", "/event-experiential"),
    ],
  },
  {
    label: "Corporate & Strategic",
    children: [
      cat("Crisis Communications", "crisis-pr"),
      path("Executive & Founder Branding", "/executive-founder-branding"),
      path("Government Relations & Lobbying", "/government-relations-lobbying"),
      path("Internal Communications", "/internal-communications"),
      path("Investor Relations", "/investor-relations"),
      path("Reputation Management", "/reputation-management"),
    ],
  },
];

const flatten = (groups: NavGroup[]): LeafLink[] => groups.flatMap((g) => g.children);

export const SITE_PRIMARY_NAV: NavItem[] = [
  { label: "News", kind: "category", slug: "pr-news" },
  { label: "Sectors", kind: "menu", groups: SECTOR_GROUPS, children: flatten(SECTOR_GROUPS) },
  { label: "Disciplines", kind: "menu", groups: DISCIPLINE_GROUPS, children: flatten(DISCIPLINE_GROUPS) },
  { label: "Research", kind: "path", to: "/research" },
  { label: "AI & GEO", kind: "path", to: "/generative-engine-optimization" },
  { label: "PR Firms", kind: "category", slug: "pr-firms" },
  { label: "RFPs", kind: "category", slug: "rfp" },
  { label: "About", kind: "path", to: "/about" },
];
