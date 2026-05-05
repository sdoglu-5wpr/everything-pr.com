import { Link } from "@tanstack/react-router";

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

export function SiteFooter({ menu }: { menu?: FooterMenuItem[] }) {
  const navLinks = menu && menu.length ? menu : DEFAULT_MENU;
  return (
    <footer className="bg-ink text-ink-foreground mt-16">
      <div className="h-1 bg-ticker" />
      <div className="mx-auto max-w-7xl px-6 py-14 grid grid-cols-1 md:grid-cols-4 gap-10">
        <div className="md:col-span-1">
          <div className="font-serif text-2xl font-bold mb-3">Everything-PR</div>
          <p className="text-sm text-ink-foreground/70 leading-relaxed">
            Daily reporting on the public relations industry — agencies, campaigns,
            crisis, brands, and the people behind the work.
          </p>
        </div>
        <FooterCol title="Site" links={navLinks} />
        <FooterCol title="Policies" links={POLICY_LINKS} />
        <div>
          <h4 className="text-sm font-semibold mb-3 uppercase tracking-wider text-ink-foreground/60">Contact</h4>
          <ul className="text-sm space-y-2 text-ink-foreground/80">
            <li>Head Office: New York, USA</li>
            <li>Email: contact@everything-pr.com</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto max-w-7xl px-6 py-5 flex flex-col md:flex-row items-center justify-between text-xs text-ink-foreground/60">
          <span>© {new Date().getFullYear()} Everything-PR. All Rights Reserved.</span>
          <div className="flex gap-5 mt-2 md:mt-0">
            <Link to="/privacy-policy" className="hover:text-ink-foreground">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-ink-foreground">Terms &amp; Conditions</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: FooterMenuItem[] }) {
  return (
    <div>
      <h4 className="text-sm font-semibold mb-3 uppercase tracking-wider text-ink-foreground/60">{title}</h4>
      <ul className="text-sm space-y-2">
        {links.map((l, i) => (
          <li key={`${l.href}-${i}`}>
            <a
              href={l.href}
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
