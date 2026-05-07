import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

export type FooterMenuItem = { label: string; href: string };

const DEFAULT_MENU: FooterMenuItem[] = [
  { label: "Home", href: "/" },
  { label: "About", href: "/about" },
  { label: "Comments Policy", href: "/comments-policy" },
  { label: "Contact", href: "/contact" },
];

const POLICY_LINKS: FooterMenuItem[] = [
  { label: "Editorial Policy", href: "/editorial-policy" },
  { label: "Ethics Policy", href: "/ethics-policy" },
  { label: "Corrections Policy", href: "/corrections-policy" },
];

const QUICK_LINKS: FooterMenuItem[] = [
  { label: "5W", href: "https://www.5wpr.com/?utm_source=epr&utm_medium=footer&utm_campaign=quick_links" },
  { label: "5W Research", href: "https://www.5wpr.com/new/research/?utm_source=epr&utm_medium=footer&utm_campaign=quick_links" },
];

export function SiteFooter({ menu }: { menu?: FooterMenuItem[] }) {
  const navLinks = menu && menu.length ? menu : DEFAULT_MENU;
  return (
    <footer className="bg-ink text-ink-foreground mt-16">
      <div className="h-1 bg-ticker" />

      {/* About 5W boilerplate */}
      <div className="border-b border-white/10">
        <div className="mx-auto max-w-7xl px-6 py-10 grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
          <div className="md:col-span-2">
            <h3 className="text-sm font-bold uppercase tracking-wider text-white mb-3">About 5W</h3>
            <p className="text-sm text-ink-foreground/80 leading-relaxed">
              5W is the AI Communications Firm, building brand authority across the platforms where decisions now happen — ChatGPT, Claude, Perplexity, Gemini, and Google AI Overviews — alongside earned media, digital, GEO, and influencer channels.{" "}
              <a
                href="https://www.5wpr.com/?utm_source=epr&utm_medium=footer&utm_campaign=about_5w"
                target="_blank"
                rel="noopener noreferrer sponsored"
                className="underline text-white hover:text-white/80"
              >
                www.5wpr.com
              </a>
            </p>
          </div>
          <div className="md:text-right">
            <a
              href="https://www.5wpr.com/contactus/"
              target="_blank"
              rel="noopener noreferrer sponsored"
              className="inline-flex items-center gap-2 rounded-md bg-[color:var(--brand-blue)] px-5 py-3 text-sm font-semibold text-white hover:bg-[color:var(--brand-blue)]/90 transition-colors"
            >
              Work with 5W <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-14 grid grid-cols-1 md:grid-cols-4 gap-10">
        <div className="md:col-span-1">
          <img src="/everything-pr-logo.png" alt="Everything PR News" className="h-12 w-auto bg-white rounded-md px-3 py-2 mb-3" />
          <p className="text-sm text-ink-foreground/70 leading-relaxed">
            Daily reporting on AI communications and the public relations industry — agencies, campaigns, crisis, brands, and the people behind the work.
          </p>
        </div>
        <FooterCol title="Site" links={navLinks} />
        <FooterCol title="Quick Links" links={QUICK_LINKS} external />
        <FooterCol title="Policies" links={POLICY_LINKS} />
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto max-w-7xl px-6 py-5 flex flex-col md:flex-row items-center justify-between text-xs text-ink-foreground/60">
          <span>© {new Date().getFullYear()} Everything-PR. All Rights Reserved.</span>
          <div className="flex flex-wrap gap-x-5 gap-y-2 mt-2 md:mt-0 justify-center md:justify-end">
            <Link to="/terms-of-use" className="hover:text-ink-foreground">Terms of Use</Link>
            <Link to="/privacy-policy" className="hover:text-ink-foreground">Privacy Policy</Link>
            <Link to="/cookie-policy" className="hover:text-ink-foreground">Cookie Policy</Link>
            <Link to="/editorial-policy" className="hover:text-ink-foreground">Editorial Policy</Link>
            <Link to="/terms" className="hover:text-ink-foreground">Terms &amp; Conditions</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links, external = false }: { title: string; links: FooterMenuItem[]; external?: boolean }) {
  return (
    <div>
      <h4 className="text-sm font-semibold mb-3 uppercase tracking-wider text-ink-foreground/60">{title}</h4>
      <ul className="text-sm space-y-2">
        {links.map((l, i) => (
          <li key={`${l.href}-${i}`}>
            <a
              href={l.href}
              {...(external || /^https?:/i.test(l.href) ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              className="text-ink-foreground/80 hover:text-ink-foreground"
            >
              {l.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
