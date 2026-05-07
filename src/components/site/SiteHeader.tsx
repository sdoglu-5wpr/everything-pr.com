import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronDown, Search, Menu, X } from "lucide-react";
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

function LeafLinkEl({ leaf, className, onClick }: { leaf: LeafLink; className?: string; onClick?: () => void }) {
  if (leaf.kind === "category" || leaf.kind === "post") {
    return (
      <Link to="/$slug" params={{ slug: leaf.slug }} className={className} onClick={onClick}>
        {leaf.label}
      </Link>
    );
  }
  return (
    <Link to={leaf.to} className={className} onClick={onClick}>
      {leaf.label}
    </Link>
  );
}

function SearchBox({ onSubmit, autoFocus }: { onSubmit?: () => void; autoFocus?: boolean }) {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        const term = q.trim();
        if (!term) return;
        navigate({ to: "/search", search: { s: term, page: 1 } });
        setQ("");
        onSubmit?.();
      }}
      className="flex items-center gap-2 w-full"
    >
      <input
        type="search"
        autoFocus={autoFocus}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search articles…"
        className="flex-1 min-w-0 border border-black/15 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--brand-blue)]/30"
        aria-label="Search articles"
      />
      <button
        type="submit"
        className="px-3 py-1.5 rounded bg-[color:var(--brand-blue)] text-white text-sm font-semibold inline-flex items-center gap-1"
      >
        <Search className="h-4 w-4" />
      </button>
    </form>
  );
}

export function SiteHeader() {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileSubmenu, setMobileSubmenu] = useState<string | null>(null);
  const closeMobile = () => {
    setMobileOpen(false);
    setMobileSubmenu(null);
  };

  return (
    <header className="bg-white text-foreground border-b border-black/10 sticky top-0 z-40 shadow-sm">
      {/* Powered by 5W strip */}
      <div className="bg-[color:var(--brand-blue)] text-white text-xs">
        <div className="mx-auto max-w-7xl px-6 h-8 flex items-center justify-center text-center">
          <a
            href="https://www.5wpr.com/?utm_source=epr&utm_medium=topstrip&utm_campaign=powered_by_5w"
            target="_blank"
            rel="noopener noreferrer sponsored"
            className="font-semibold tracking-wide hover:underline"
          >
            Powered by 5W — the AI Communications Firm
          </a>
        </div>
      </div>
      <div className="mx-auto max-w-7xl px-6 py-4 flex items-center gap-6">
        <Link to="/" aria-label="Everything PR News — Home" className="flex items-center shrink-0">
          <img
            src={logoUrl}
            alt="Everything PR News"
            className="h-12 md:h-14 w-auto"
            loading="eager"
          />
        </Link>

        <nav className="hidden lg:flex items-center gap-1 ml-auto text-[13px] font-semibold tracking-tight">
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
                  <div className="absolute left-0 top-full z-50 min-w-[260px] bg-white border border-black/10 shadow-lg border-l-4 border-l-[color:var(--brand-blue)] py-2">
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
          <button
            type="button"
            onClick={() => setSearchOpen((v) => !v)}
            aria-label="Search"
            aria-expanded={searchOpen}
            className="ml-2 p-2 rounded hover:text-[color:var(--brand-blue)] transition-colors border-l border-black/10 pl-4"
          >
            <Search className="h-4 w-4" />
          </button>
        </nav>

        {/* Mobile controls */}
        <div className="ml-auto flex items-center gap-1 lg:hidden">
          <button
            type="button"
            onClick={() => setSearchOpen((v) => !v)}
            aria-label="Search"
            className="p-2 rounded hover:bg-black/5"
          >
            <Search className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
            className="p-2 rounded hover:bg-black/5"
          >
            {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Inline desktop search */}
      {searchOpen ? (
        <div className="border-t border-black/10 bg-surface-soft">
          <div className="mx-auto max-w-7xl px-6 py-3">
            <SearchBox autoFocus onSubmit={() => setSearchOpen(false)} />
          </div>
        </div>
      ) : null}

      {/* Mobile drawer */}
      {mobileOpen ? (
        <div className="lg:hidden border-t border-black/10 bg-white max-h-[80vh] overflow-y-auto">
          <div className="px-6 py-3 space-y-0.5 text-sm font-semibold tracking-tight">
            {NAV.map((item) => {
              if (item.kind === "category") {
                return (
                  <Link
                    key={item.label}
                    to="/$slug"
                    params={{ slug: item.slug }}
                    onClick={closeMobile}
                    className="block px-2 py-2 rounded hover:bg-black/5"
                  >
                    {item.label}
                  </Link>
                );
              }
              if (item.kind === "path") {
                return (
                  <Link key={item.label} to={item.to} onClick={closeMobile} className="block px-2 py-2 rounded hover:bg-black/5">
                    {item.label}
                  </Link>
                );
              }
              const open = mobileSubmenu === item.label;
              return (
                <div key={item.label}>
                  <button
                    type="button"
                    onClick={() => setMobileSubmenu(open ? null : item.label)}
                    aria-expanded={open}
                    className="w-full flex items-center justify-between px-2 py-2 rounded hover:bg-black/5"
                  >
                    <span>{item.label}</span>
                    <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
                  </button>
                  {open ? (
                    <div className="pl-4 border-l-2 border-[color:var(--brand-blue)]/30 ml-2 my-1">
                      {item.children.map((child) => (
                        <LeafLinkEl
                          key={child.label}
                          leaf={child}
                          onClick={closeMobile}
                          className="block px-2 py-2 text-[13px] font-normal normal-case text-foreground hover:bg-black/5 hover:text-[color:var(--brand-blue)] rounded"
                        />
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })}
            <div className="border-t pt-3 mt-3 grid grid-cols-2 gap-2 normal-case font-normal">
              <Link to="/about" onClick={closeMobile} className="block px-2 py-2 rounded hover:bg-black/5 text-sm">
                About Us
              </Link>
              <Link to="/$slug" params={{ slug: "contact" }} onClick={closeMobile} className="block px-2 py-2 rounded hover:bg-black/5 text-sm">
                Contact
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}
