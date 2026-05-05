import { Link } from "@tanstack/react-router";

export function SiteFooter() {
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
        <FooterCol title="Pages" links={[
          { label: "Home", to: "/" },
          { label: "About us", to: "/about" },
          { label: "Authors", to: "/authors" },
          { label: "Subscription", to: "/subscribe" },
        ]} />
        <FooterCol title="More" links={[
          { label: "Contact us", to: "/contact" },
          { label: "Changelog", to: "/changelog" },
          { label: "License", to: "/license" },
          { label: "404 page", to: "/404" },
        ]} />
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
            <Link to="/privacy" className="hover:text-ink-foreground">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-ink-foreground">Terms &amp; Conditions</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: { label: string; to: string }[] }) {
  return (
    <div>
      <h4 className="text-sm font-semibold mb-3 uppercase tracking-wider text-ink-foreground/60">{title}</h4>
      <ul className="text-sm space-y-2">
        {links.map(l => (
          <li key={l.to}>
            <Link to={l.to} className="text-ink-foreground/80 hover:text-ink-foreground">{l.label}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
