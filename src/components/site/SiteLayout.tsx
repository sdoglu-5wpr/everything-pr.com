import { TopTicker } from "./TopTicker";
import { SiteHeader } from "./SiteHeader";
import { SiteFooter, type FooterMenuItem } from "./SiteFooter";
import { BackToTop } from "./BackToTop";

type Props = {
  children: React.ReactNode;
  tickerItems?: { slug: string; title: string }[];
  footerMenu?: FooterMenuItem[];
  afterNewsletter?: React.ReactNode;
};

export function SiteLayout({ children, tickerItems, footerMenu, afterNewsletter }: Props) {
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

