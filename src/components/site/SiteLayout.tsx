import { useEffect } from "react";
import { useRouterState } from "@tanstack/react-router";
import { TopTicker } from "./TopTicker";
import { SiteHeader } from "./SiteHeader";
import { SiteFooter, type FooterMenuItem } from "./SiteFooter";
import { BackToTop } from "./BackToTop";
import { normalizeInternalAnchors } from "@/lib/anchor-case";

type Props = {
  children: React.ReactNode;
  tickerItems?: { slug: string; title: string }[];
  footerMenu?: FooterMenuItem[];
  afterNewsletter?: React.ReactNode;
};

export function SiteLayout({ children, tickerItems, footerMenu, afterNewsletter }: Props) {
  const location = useRouterState({ select: (s) => s.location.pathname });
  useEffect(() => {
    if (typeof document === "undefined") return;
    // Defer one frame so any post-hydration DOM (markdown, async lists) is in place.
    const id = window.requestAnimationFrame(() => {
      normalizeInternalAnchors(document.body);
    });
    return () => window.cancelAnimationFrame(id);
  }, [location]);
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteHeader />
      <TopTicker items={tickerItems} />
      <main className="flex-1">{children}</main>
      {afterNewsletter}
      <SiteFooter menu={footerMenu} />
      <BackToTop />
    </div>
  );
}


