import { Link } from "@tanstack/react-router";
import { ArrowRight, BookOpen } from "lucide-react";
import { SiteLayout } from "./SiteLayout";
import { PostImage } from "./PostImage";
import { decodeHtmlEntities, htmlToPlainText } from "@/lib/text";
import type { PillarPayload } from "@/lib/pillars.shared";
import fivewprBanner from "@/assets/5wpr-banner.jpg";
import virgoPrBanner from "@/assets/virgo-pr-banner.gif";

function formatDate(iso: string | null | undefined) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function PillarView({ data }: { data: PillarPayload }) {
  const { pillar, items, total } = data;
  return (
    <SiteLayout>
      {/* HERO */}
      <section className="relative overflow-hidden bg-[#0A1628] text-white">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0A1628] via-[#101F36] to-[#1A2940]" aria-hidden />
        <div className="relative mx-auto max-w-7xl px-6 py-16 md:py-24 grid grid-cols-1 md:grid-cols-12 gap-10 items-center">
          <div className="md:col-span-7">
            <div className="text-xs font-bold uppercase tracking-[0.3em] text-[#FF3366] mb-5 flex items-center gap-3">
              <span className="inline-block h-px w-8 bg-[#FF3366]" />
              Industry Pillar
            </div>
            <h1 className="font-serif text-4xl md:text-6xl font-bold leading-[1.05] tracking-tight">
              {pillar.title}
            </h1>
            {pillar.subtitle ? (
              <p className="mt-5 text-lg md:text-xl text-white/70 max-w-2xl leading-relaxed">
                {pillar.subtitle}
              </p>
            ) : null}
            {pillar.byline ? (
              <div className="mt-7 text-sm text-white/60">
                By <span className="text-white font-semibold">{pillar.byline}</span>
              </div>
            ) : null}
            <div className="mt-8 flex items-center gap-3">
              <a
                href="#articles"
                className="inline-flex items-center gap-2 bg-[#FF3366] hover:bg-[#FF1B52] text-white font-semibold text-sm px-5 py-3 rounded-md transition-colors"
              >
                Browse {total} article{total === 1 ? "" : "s"} <ArrowRight className="w-4 h-4" />
              </a>
              <a
                href="#guide"
                className="inline-flex items-center gap-2 border border-white/20 hover:border-white/40 text-white font-semibold text-sm px-5 py-3 rounded-md transition-colors"
              >
                <BookOpen className="w-4 h-4" /> Read the guide
              </a>
            </div>
          </div>
          <div className="md:col-span-5">
            {pillar.hero_image_url ? (
              <img
                src={pillar.hero_image_url}
                alt={pillar.title}
                className="w-full h-auto rounded-lg shadow-2xl ring-1 ring-white/10"
                loading="eager"
              />
            ) : (
              <div className="aspect-[16/9] rounded-lg bg-white/5 ring-1 ring-white/10 flex items-center justify-center text-white/30 text-sm">
                {pillar.title}
              </div>
            )}
          </div>
        </div>
        <div className="relative mx-auto max-w-7xl px-6 pb-6 flex items-center justify-between text-[11px] uppercase tracking-[0.2em] text-white/40 border-t border-white/10 pt-4">
          <span><span className="text-white font-bold">5W</span> · The AI Communications Firm</span>
          <span>Pillar · {pillar.title}</span>
        </div>
      </section>

      {/* GUIDE BODY + ARTICLE SIDEBAR */}
      <div className="mx-auto max-w-7xl px-6 py-14 grid grid-cols-1 lg:grid-cols-12 gap-12">
        <article id="guide" className="lg:col-span-8 prose-article prose-pillar">
          <div
            dangerouslySetInnerHTML={{ __html: pillar.body_html }}
          />

          {pillar.faq && pillar.faq.length > 0 ? (
            <section className="mt-14">
              <h2>Frequently Asked Questions</h2>
              <div className="not-prose space-y-4 mt-6">
                {pillar.faq.map((f, i) => (
                  <details key={i} className="group rounded-lg border bg-surface-soft p-5">
                    <summary className="cursor-pointer font-semibold text-foreground list-none flex items-start justify-between gap-4">
                      <span>{f.q}</span>
                      <span className="shrink-0 text-muted-foreground group-open:rotate-180 transition">▾</span>
                    </summary>
                    <div className="mt-3 text-muted-foreground" dangerouslySetInnerHTML={{ __html: f.a }} />
                  </details>
                ))}
              </div>
            </section>
          ) : null}
        </article>

        <aside className="lg:col-span-4">
          <div className="sticky top-6 space-y-6">
            <a
              href="https://www.5wpr.com/?utm_source=everything-pr&utm_medium=banner&utm_campaign=5wpr-banner"
              target="_blank"
              rel="noopener noreferrer sponsored"
              className="block overflow-hidden rounded-lg border hover:opacity-90 transition-opacity"
            >
              <img src={fivewprBanner} alt="5WPR — Built for now" className="w-full h-auto" loading="lazy" />
            </a>

            <div className="rounded-lg border bg-white p-5 shadow-sm">
              <div className="text-xs font-bold uppercase tracking-[0.18em] text-[#FF3366] mb-3 flex items-center gap-2">
                <span className="inline-block w-2 h-2 bg-[#FF3366]" /> Latest in {pillar.title}
              </div>
              <ul className="space-y-4 divide-y">
                {items.slice(0, 5).map((p, i) => (
                  <li key={p.id} className={i === 0 ? "" : "pt-4"}>
                    <Link
                      to="/$slug"
                      params={{ slug: p.slug }}
                      className="group flex gap-3"
                    >
                      <PostImage
                        src={p.featured_image_url}
                        alt={p.title}
                        className="w-20 h-16 shrink-0 overflow-hidden rounded bg-muted"
                        imgClassName="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      <div className="min-w-0">
                        <div className="font-semibold text-sm leading-snug line-clamp-3 group-hover:text-brand-blue">
                          {decodeHtmlEntities(p.title)}
                        </div>
                        <div className="text-[11px] text-muted-foreground mt-1">{formatDate(p.published_at)}</div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
              {items.length > 5 ? (
                <a href="#articles" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand-blue hover:underline">
                  See all <ArrowRight className="w-4 h-4" />
                </a>
              ) : null}
            </div>

            <a
              href="https://virgo-pr.com/?utm_source=everything-pr&utm_medium=banner&utm_campaign=epr-banner"
              target="_blank"
              rel="noopener noreferrer sponsored"
              className="block overflow-hidden rounded-lg border hover:opacity-90 transition-opacity"
            >
              <img src={virgoPrBanner} alt="Virgo PR" className="w-full h-auto" loading="lazy" />
            </a>
          </div>
        </aside>
      </div>

      {/* ARTICLES GRID */}
      <section id="articles" className="bg-surface-soft border-t">
        <div className="mx-auto max-w-7xl px-6 py-14">
          <div className="flex items-end justify-between mb-8">
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.2em] text-ticker mb-2 flex items-center gap-2">
                <span className="inline-block w-2 h-2 bg-ticker" /> Coverage
              </div>
              <h2 className="font-serif text-3xl md:text-4xl font-bold">All articles in {pillar.title}</h2>
            </div>
            <div className="text-sm text-muted-foreground">{total} article{total === 1 ? "" : "s"}</div>
          </div>

          {items.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground rounded-lg border bg-white">
              No articles tagged in this category yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {items.map((p) => (
                <article key={p.id} className="group bg-white rounded-lg border overflow-hidden flex flex-col hover:shadow-md transition-shadow">
                  <Link to="/$slug" params={{ slug: p.slug }} className="block">
                    <PostImage
                      src={p.featured_image_url}
                      alt={p.title}
                      className="aspect-[16/10] overflow-hidden bg-muted"
                      imgClassName="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  </Link>
                  <div className="p-5 flex flex-col flex-1">
                    {p.category ? (
                      <Link
                        to="/$slug"
                        params={{ slug: p.category.slug }}
                        className="text-[10px] font-bold uppercase tracking-[0.18em] text-ticker hover:text-brand-blue inline-flex items-center gap-1.5 mb-2"
                      >
                        <span className="inline-block w-1.5 h-1.5 bg-ticker" />
                        {p.category.name}
                      </Link>
                    ) : null}
                    <h3 className="font-serif text-lg font-bold leading-snug mb-2">
                      <Link to="/$slug" params={{ slug: p.slug }} className="hover:text-brand-blue line-clamp-3">
                        {decodeHtmlEntities(p.title)}
                      </Link>
                    </h3>
                    {p.excerpt ? (
                      <p className="text-sm text-muted-foreground line-clamp-2">{htmlToPlainText(p.excerpt)}</p>
                    ) : null}
                    <div className="mt-4 pt-3 border-t text-xs text-muted-foreground flex items-center justify-between">
                      {p.author ? (
                        <Link to="/author/$slug" params={{ slug: p.author.slug }} className="hover:text-foreground font-medium">
                          {p.author.display_name}
                        </Link>
                      ) : <span />}
                      <time dateTime={p.published_at ?? undefined}>{formatDate(p.published_at)}</time>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </SiteLayout>
  );
}
