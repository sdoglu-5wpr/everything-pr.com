import { TopTicker } from "./TopTicker";
import { SiteHeader } from "./SiteHeader";
import { SiteFooter, type FooterMenuItem } from "./SiteFooter";
import { InlineNewsletter } from "./InlineNewsletter";

type Props = {
  children: React.ReactNode;
  tickerItems?: { slug: string; title: string }[];
  footerMenu?: FooterMenuItem[];
};

export function SiteLayout({ children, tickerItems, footerMenu }: Props) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteHeader />
      <TopTicker items={tickerItems} />
      <main className="flex-1">{children}</main>
      <InlineNewsletter />
      <SiteFooter menu={footerMenu} />
    </div>
  );
}
