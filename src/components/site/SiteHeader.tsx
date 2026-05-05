import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import logoUrl from "@/assets/everything-pr-logo.png";

const NAV = [
  { label: "All Pages", to: "/" },
  { label: "About", to: "/about" },
  { label: "Authors", to: "/authors" },
  { label: "Contact", to: "/contact" },
];

export function SiteHeader() {
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  return (
    <header className="bg-ink text-ink-foreground">
      <div className="mx-auto max-w-7xl px-6 pt-3 pb-1 flex items-center justify-between text-xs text-ink-foreground/70">
        <span>{today}</span>
        <span>Vol. 127, No. 43,891 &nbsp;•&nbsp; Everything-PR</span>
      </div>
      <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between gap-8">
        <Link to="/" aria-label="Everything PR News — Home" className="flex items-center">
          <img
            src={logoUrl}
            alt="Everything PR News"
            className="h-12 md:h-14 w-auto bg-white rounded-md px-3 py-2"
            loading="eager"
          />
        </Link>
        <nav className="hidden md:flex items-center gap-7 text-sm text-ink-foreground/85">
          {NAV.map(n => (
            <Link
              key={n.to}
              to={n.to}
              className="hover:text-ink-foreground transition-colors"
              activeProps={{ className: "text-ink-foreground font-semibold" }}
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <Button className="bg-white text-ink hover:bg-white/90 font-semibold" size="sm">
          Subscribe
        </Button>
      </div>
    </header>
  );
}
