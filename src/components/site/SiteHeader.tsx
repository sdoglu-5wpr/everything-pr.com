import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import logoUrl from "@/assets/everything-pr-logo.png";

type LeafLink =
  | { label: string; kind: "category"; slug: string }
  | { label: string; kind: "post"; slug: string }
  | { label: string; kind: "path"; to: string };

type NavItem =
  | { label: string; kind: "category"; slug: string }
  | { label: string; kind: "path"; to: string }
  | { label: string; kind: "menu"; children: LeafLink[] };

const NAV: NavItem[] = [
  { label: "RFPs", kind: "category", slug: "rfp" },
  {
    label: "News",
    kind: "menu",
    children: [
      { label: "All News", kind: "category", slug: "news" },
      { label: "Corporate PR", kind: "category", slug: "corporate-pr" },
      { label: "Consumer PR", kind: "category", slug: "consumer-pr" },
      { label: "Crisis PR", kind: "category", slug: "crisis-pr" },
      { label: "Healthcare PR", kind: "category", slug: "healthcare-pr" },
      { label: "Agency of Record", kind: "category", slug: "agency-of-record" },
      { label: "Editorial", kind: "category", slug: "editorial" },
      { label: "Entertainment PR", kind: "category", slug: "entertainment-pr" },
      { label: "General Management", kind: "category", slug: "general-management" },
      { label: "Insights", kind: "category", slug: "insights" },
      { label: "PR Insiders", kind: "category", slug: "pr-insiders" },
      { label: "PR Insights & Strategy", kind: "category", slug: "pr-insights-strategy" },
      { label: "PR Jobs & Careers", kind: "category", slug: "pr-jobs-careers" },
      { label: "PR Leaders", kind: "category", slug: "pr-leaders" },
      { label: "PR Perspectives", kind: "category", slug: "pr-perspectives" },
      { label: "Press Release", kind: "category", slug: "press-release" },
      { label: "Technology PR", kind: "category", slug: "technology-pr" },
      { label: "Top PR", kind: "category", slug: "top-pr" },
      { label: "University PR", kind: "category", slug: "university-pr" },
    ],
  },
  {
    label: "Social Media & Digital Marketing",
    kind: "menu",
    children: [
      { label: "Social Media", kind: "category", slug: "social-media" },
      { label: "Marketing", kind: "category", slug: "marketing" },
    ],
  },
  { label: "PR Firms", kind: "category", slug: "pr-firms" },
  { label: "Features", kind: "category", slug: "features" },
  {
    label: "Research",
    kind: "menu",
    children: [
      { label: "PR Spend Transparency Study — 2026", kind: "post", slug: "pr-spend-transparency-study-2026" },
      { label: "The Nonprofit PR Transparency Study — 2026", kind: "post", slug: "the-nonprofit-pr-transparency-study-2026" },
      { label: "The Municipal & State PR Spend Study — 2026", kind: "post", slug: "the-municipal-state-pr-spend-study-2026" },
      { label: "The AI Company Comms Study 2026", kind: "post", slug: "the-ai-company-comms-study-2026" },
      { label: "The Foreign Influence PR Study — 2026", kind: "post", slug: "the-foreign-influence-pr-study-2026" },
      { label: "All Research", kind: "category", slug: "research" },
    ],
  },
];

function LeafLinkEl({ leaf, className }: { leaf: LeafLink; className?: string }) {
  if (leaf.kind === "category") {
    return (
      <Link to="/$slug" params={{ slug: leaf.slug }} className={className}>
        {leaf.label}
      </Link>
    );
  }
  if (leaf.kind === "post") {
    return (
      <Link to="/$slug" params={{ slug: leaf.slug }} className={className}>
        {leaf.label}
      </Link>
    );
  }
  return (
    <Link to={leaf.to} className={className}>
      {leaf.label}
    </Link>
  );
}

export function SiteHeader() {
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  return (
    <header className="bg-white text-foreground border-b border-black/10">
      <div className="mx-auto max-w-7xl px-6 py-4 flex items-center gap-6">
        <Link to="/" aria-label="Everything PR News — Home" className="flex items-center shrink-0">
          <img
            src={logoUrl}
            alt="Everything PR News"
            className="h-12 md:h-14 w-auto"
            loading="eager"
          />
        </Link>

        <nav className="hidden lg:flex items-center gap-1 ml-auto text-[13px] font-semibold uppercase tracking-wide">
          {NAV.map((item) => {
            if (item.kind === "category") {
              return (
                <Link
                  key={item.label}
                  to="/$slug"
                  params={{ slug: item.slug }}
                  className="px-3 py-2 rounded hover:text-[color:var(--brand-blue)] transition-colors"
                  activeProps={{ className: "text-[color:var(--brand-blue)]" }}
                >
                  {item.label}
                </Link>
              );
            }
            if (item.kind === "path") {
              return (
                <Link
                  key={item.label}
                  to={item.to}
                  className="px-3 py-2 rounded hover:text-[color:var(--brand-blue)] transition-colors"
                  activeProps={{ className: "text-[color:var(--brand-blue)]" }}
                >
                  {item.label}
                </Link>
              );
            }
            const isOpen = openMenu === item.label;
            return (
              <div
                key={item.label}
                className="relative"
                onMouseEnter={() => setOpenMenu(item.label)}
                onMouseLeave={() => setOpenMenu((prev) => (prev === item.label ? null : prev))}
              >
                <button
                  type="button"
                  className={`px-3 py-2 inline-flex items-center gap-1 rounded transition-colors ${
                    isOpen ? "text-[color:var(--brand-blue)] bg-black/5" : "hover:text-[color:var(--brand-blue)]"
                  }`}
                  aria-haspopup="true"
                  aria-expanded={isOpen}
                  onClick={() => setOpenMenu(isOpen ? null : item.label)}
                >
                  {item.label}
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
                {isOpen && (
                  <div
                    className="absolute left-0 top-full z-50 min-w-[260px] bg-white border border-black/10 shadow-lg border-l-4 border-l-[color:var(--brand-blue)] py-2"
                  >
                    {item.children.map((child) => (
                      <LeafLinkEl
                        key={child.label}
                        leaf={child}
                        className="block px-5 py-2.5 text-[13px] font-normal normal-case text-foreground hover:bg-black/5 hover:text-[color:var(--brand-blue)] transition-colors"
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          <Link
            to="/search"
            aria-label="Search"
            className="ml-2 p-2 rounded hover:text-[color:var(--brand-blue)] transition-colors border-l border-black/10 pl-4"
          >
            <Search className="h-4 w-4" />
          </Link>
        </nav>
      </div>
    </header>
  );
}
