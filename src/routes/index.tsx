import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, ChevronRight } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { NewsletterBanner } from "@/components/site/NewsletterBanner";
import { PostImage } from "@/components/site/PostImage";
import { getHomepage, type HomePost, type HomeAuthor, type HomePayload } from "@/serverFns/homepage.functions";
import { fetchHomepageViaRpc } from "@/lib/homepage.shared";
import { supabase } from "@/integrations/supabase/client";
import { buildHomepageHead } from "@/serverFns/seo.head";
import { htmlToPlainText, decodeHtmlEntities } from "@/lib/text";

const EMPTY_PAYLOAD: HomePayload = {
  ticker: [],
  hero: null,
  topStories: [],
  sections: [
    { key: "research", title: "Research", slug: "research", posts: [] },
    { key: "pr-news", title: "PR News", slug: "pr-news", posts: [] },
    { key: "pr-insights", title: "Insights", slug: "pr-insights", posts: [] },
    { key: "marketing", title: "Marketing", slug: "marketing", posts: [] },
    { key: "social-media", title: "Social Media", slug: "social-media", posts: [] },
  ],
  crisis: { title: "Crisis", slug: "crisis-pr", posts: [] },
  topAuthors: [],
  economy: null,
  otherNews: [],
  footerMenu: [],
};

async function loadHomepage(): Promise<HomePayload> {
  // Browser: fetch directly via RPC (fast, like Netlify static build does post-hydration).
  if (typeof window !== "undefined") {
    return fetchHomepageViaRpc(supabase);
  }
  // Server (SSR/prerender): always fetch real data so the first paint is populated.
  try {
    return await getHomepage();
  } catch {
    return EMPTY_PAYLOAD;
  }
}

export const Route = createFileRoute("/")({
  loader: () => loadHomepage(),
  head: () => buildHomepageHead({}),
  component: HomePage,
});

function formatDate(iso: string | null | undefined) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function HomePage() {
  const initial = Route.useLoaderData() as HomePayload;
  const [data, setData] = useState<HomePayload>(initial);

  useEffect(() => {
    if (!initial.hero && initial.topStories.length === 0) {
      fetchHomepageViaRpc(supabase).then(setData).catch(() => {});
    }
  }, [initial]);

  return (
    <SiteLayout tickerItems={data.ticker} footerMenu={data.footerMenu}>
      <div className="mx-auto max-w-7xl px-6 pt-8">
        <p className="text-center text-sm md:text-base font-semibold text-brand-blue tracking-tight">
          The Leading AI Communications &amp; PR Industry Publication. Daily Since 2009.
        </p>
      </div>
      <div className="mx-auto max-w-7xl px-6 pt-6">
        <Hero hero={data.hero} topStories={data.topStories} />
      </div>

      {data.sections.slice(0, 2).map((s) => (
        <SectionRow key={s.key} title={s.title} categorySlug={s.slug} posts={s.posts} />
      ))}

      <AIVisibilityResearch />

      <DarkFeatureSection
        title="Crisis"
        categorySlug={data.crisis.slug}
        posts={data.crisis.posts}
      />

      <TopCreatorsRow authors={data.topAuthors} />

      {data.sections.slice(2).map((s) => (
        <SectionRow key={s.key} title={s.title} categorySlug={s.slug} posts={s.posts} />
      ))}

      {data.economy ? <EconomyFeature post={data.economy} /> : null}

      <SectionRow title="Other news" categorySlug={null} posts={data.otherNews} />

      <AboutEverythingPR />

      <div className="mx-auto max-w-7xl px-6">
        <NewsletterBanner />
      </div>
    </SiteLayout>
  );
}

function AIVisibilityResearch() {
  const items = [
    {
      title: "AI Visibility Index",
      desc: "How brands rank inside ChatGPT, Claude, Perplexity and Gemini answers.",
      href: "https://www.5wpr.com/new/research/ai-visibility-index/?utm_source=epr&utm_medium=homepage&utm_campaign=ai_visibility_research",
    },
    {
      title: "The GEO Reckoning",
      desc: "Why generative engine optimization is rewriting the rules of earned media.",
      href: "https://www.5wpr.com/new/research/geo-reckoning/?utm_source=epr&utm_medium=homepage&utm_campaign=ai_visibility_research",
    },
    {
      title: "The Missing Rung Report",
      desc: "Where today's brands disappear from the AI buyer journey — and how to recover.",
      href: "https://www.5wpr.com/new/research/missing-rung-report/?utm_source=epr&utm_medium=homepage&utm_campaign=ai_visibility_research",
    },
  ];
  return (
    <section className="mx-auto max-w-7xl px-6 mt-14">
      <div className="rounded-2xl border bg-ink text-ink-foreground p-8 md:p-10">
        <div className="flex items-end justify-between gap-3 mb-6">
          <div>
            <p className="text-[11px] uppercase tracking-wider font-semibold text-brand-red">5W Research</p>
            <h2 className="font-serif font-bold text-2xl md:text-3xl text-white mt-1">AI Visibility Research</h2>
          </div>
          <a
            href="https://www.5wpr.com/new/research/?utm_source=epr&utm_medium=homepage&utm_campaign=ai_visibility_research"
            target="_blank"
            rel="noopener noreferrer sponsored"
            className="text-sm font-medium text-white/85 hover:text-white inline-flex items-center gap-1"
          >
            View all <ChevronRight className="w-4 h-4" />
          </a>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {items.map((it) => (
            <a
              key={it.title}
              href={it.href}
              target="_blank"
              rel="noopener noreferrer sponsored"
              className="block rounded-xl border border-white/10 bg-white/5 p-6 hover:bg-white/10 transition-colors"
            >
              <h3 className="font-serif font-bold text-lg text-white">{it.title}</h3>
              <p className="mt-2 text-sm text-white/70 leading-relaxed">{it.desc}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-brand-red">
                Read the research <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

function AboutEverythingPR() {
  return (
    <section className="mx-auto max-w-7xl px-6 mt-16">
      <div className="rounded-2xl border bg-surface-soft p-8 md:p-12">
        <p className="text-[11px] uppercase tracking-wider font-semibold text-brand-blue">
          Published Daily Since 2009
        </p>
        <h2 className="mt-2 font-serif font-extrabold text-2xl md:text-3xl leading-tight">
          Everything-PR — the leading independent publication covering AI communications and the public relations industry.
        </h2>
        <p className="mt-4 text-sm md:text-base text-muted-foreground leading-relaxed">
          We publish daily news, analysis, agency coverage, crisis PR strategy, digital marketing insights, industry research, and expert commentary across every sector of the communications business. Founded in January 2009, Everything-PR is an independent publication that brings a practitioner perspective to industry coverage that trade aggregators and outside observers cannot replicate.
        </p>
        <p className="mt-3 text-sm md:text-base text-muted-foreground leading-relaxed">
          Explore coverage by category:{" "}
          <Link to="/$slug" params={{ slug: "ai-communications" }} className="underline hover:text-brand-blue">AI communications</Link>,{" "}
          <Link to="/$slug" params={{ slug: "consumer-pr" }} className="underline hover:text-brand-blue">consumer PR</Link>,{" "}
          <Link to="/$slug" params={{ slug: "corporate-pr" }} className="underline hover:text-brand-blue">corporate PR</Link>,{" "}
          <Link to="/$slug" params={{ slug: "crisis-pr" }} className="underline hover:text-brand-blue">crisis PR</Link>,{" "}
          <Link to="/$slug" params={{ slug: "healthcare-pr" }} className="underline hover:text-brand-blue">healthcare PR</Link>,{" "}
          <Link to="/$slug" params={{ slug: "technology-pr" }} className="underline hover:text-brand-blue">technology PR</Link>,{" "}
          <Link to="/$slug" params={{ slug: "entertainment-pr" }} className="underline hover:text-brand-blue">entertainment PR</Link>,{" "}
          <Link to="/$slug" params={{ slug: "social-media" }} className="underline hover:text-brand-blue">social media</Link>,{" "}
          <Link to="/$slug" params={{ slug: "marketing" }} className="underline hover:text-brand-blue">marketing</Link>,{" "}
          <Link to="/$slug" params={{ slug: "pr-firms" }} className="underline hover:text-brand-blue">PR firms</Link>,{" "}
          <Link to="/$slug" params={{ slug: "pr-insights" }} className="underline hover:text-brand-blue">PR insights</Link>,{" "}
          <Link to="/$slug" params={{ slug: "pr-leaders" }} className="underline hover:text-brand-blue">PR leaders</Link>,{" "}
          <Link to="/$slug" params={{ slug: "agency-of-record" }} className="underline hover:text-brand-blue">agency of record</Link>,{" "}
          <Link to="/$slug" params={{ slug: "rfp" }} className="underline hover:text-brand-blue">RFPs</Link>, and{" "}
          <Link to="/$slug" params={{ slug: "pr-jobs" }} className="underline hover:text-brand-blue">PR jobs</Link>.
        </p>

        <div className="mt-8 grid md:grid-cols-2 gap-8">
          <div>
            <h3 className="font-serif font-bold text-lg">What is Everything-PR?</h3>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              Everything-PR is an independent publication covering AI communications and the public relations industry, published continuously since January 2009 — making it one of the longest-running and most comprehensive sources of communications intelligence available online. The publication leads with AI communications and generative engine optimization (GEO), and covers PR agency news and account wins, brand communications strategy, crisis PR and reputation management, digital marketing and social media, industry research and data, executive appointments and leadership profiles, PR RFPs and new business opportunities, and the strategic forces shaping how communications is practiced and valued across every sector.
            </p>
          </div>
          <div>
            <h3 className="font-serif font-bold text-lg">What does Everything-PR cover?</h3>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              Everything-PR covers AI communications and the full spectrum of public relations. <Link to="/$slug" params={{ slug: "ai-communications" }} className="underline font-semibold">AI communications</Link> — generative engine optimization (GEO), AI search visibility, and how brands earn presence inside ChatGPT, Claude, Perplexity and Gemini. <Link to="/$slug" params={{ slug: "consumer-pr" }} className="underline font-semibold">Consumer PR</Link>, <Link to="/$slug" params={{ slug: "corporate-pr" }} className="underline font-semibold">Corporate PR</Link>, <Link to="/$slug" params={{ slug: "crisis-pr" }} className="underline font-semibold">Crisis PR</Link>, <Link to="/$slug" params={{ slug: "healthcare-pr" }} className="underline font-semibold">Healthcare PR</Link>, <Link to="/$slug" params={{ slug: "technology-pr" }} className="underline font-semibold">Technology PR</Link>, and <Link to="/$slug" params={{ slug: "entertainment-pr" }} className="underline font-semibold">Entertainment PR</Link>. And <Link to="/$slug" params={{ slug: "marketing" }} className="underline font-semibold">marketing</Link> and <Link to="/$slug" params={{ slug: "social-media" }} className="underline font-semibold">social media</Link> — the digital disciplines increasingly integrated with PR into unified communications programs.
            </p>
          </div>
          <div>
            <h3 className="font-serif font-bold text-lg">Why is Everything-PR the authoritative source?</h3>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              Everything-PR's authority comes from three sources newer publications and aggregators cannot replicate. First, 17 years of continuous daily publishing since January 2009 — an archive of tens of thousands of articles indexed across every major search engine and AI model. Second, a practitioner perspective informed by direct, ongoing participation in AI communications and the broader PR industry. Third, editorial breadth that covers <Link to="/$slug" params={{ slug: "ai-communications" }} className="underline">AI communications and GEO</Link>, <Link to="/$slug" params={{ slug: "marketing" }} className="underline">digital marketing</Link>, <Link to="/$slug" params={{ slug: "social-media" }} className="underline">social media strategy</Link>, <Link to="/$slug" params={{ slug: "agency-of-record" }} className="underline">agency of record</Link> assignments, <Link to="/$slug" params={{ slug: "rfp" }} className="underline">RFPs</Link>, and <Link to="/$slug" params={{ slug: "pr-jobs" }} className="underline">PR jobs</Link>.
            </p>
          </div>
          <div>
            <h3 className="font-serif font-bold text-lg">What is AI Communications?</h3>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              AI communications is the discipline of building and protecting brand presence inside AI-mediated discovery — generative engine optimization (GEO), AI search visibility across ChatGPT, Claude, Perplexity and Gemini, earned media designed to be cited by large language models, influencer and creator programs, and the digital and social channels that feed those models. It sits alongside traditional PR, but treats answer engines — not search results pages — as the primary surface where buyers form opinions and make decisions.
            </p>
          </div>
          <div>
            <h3 className="font-serif font-bold text-lg">How is buyer research changing in 2026?</h3>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              In 2026, buyer research starts inside ChatGPT, Claude, Perplexity and Gemini before it ever reaches a search engine or a brand's website. Decision-makers ask answer engines to compare vendors, summarize reputations, and recommend shortlists — and the brands that show up are the ones with strong earned media footprints, structured content, and a deliberate GEO strategy. Visibility inside AI answers is now as important as visibility in Google results.
            </p>
          </div>
          <div>
            <h3 className="font-serif font-bold text-lg">How is the PR and marketing industry changing in 2026?</h3>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              The industry in 2026 is undergoing structural change at a pace with no recent precedent. Agency consolidation — driven by major M&amp;A activity across the holding company landscape — is reshaping which agencies exist, which brands they own, and how the competitive landscape is structured. Artificial intelligence is restructuring how brands are discovered, how content is created and distributed, and how agencies demonstrate value — with generative engine optimization emerging as a core discipline alongside traditional media relations, social media, and digital marketing.
            </p>
          </div>
        </div>

        <p className="mt-8 text-sm font-semibold text-foreground">
          PR Firms, PR Agencies: Visit <Link to="/" className="underline text-brand-blue">Everything-PR</Link> for the best PR news and trends.
        </p>
      </div>
    </section>
  );
}

/* ---------------- Hero ---------------- */

function Hero({ hero, topStories }: { hero: HomePost | null; topStories: HomePost[] }) {
  if (!hero) {
    return (
      <div className="py-20 text-center text-muted-foreground">
        No published content yet.
      </div>
    );
  }
  return (
    <section className="grid grid-cols-1 lg:grid-cols-12 gap-10">
      <div className="lg:col-span-8">
        <Link to="/$slug" params={{ slug: hero.slug }} className="block group">
          <PostImage
            src={hero.featured_image_url}
            alt={decodeHtmlEntities(hero.title)}
            className="aspect-[16/9] w-full overflow-hidden rounded-lg bg-muted"
            imgClassName="h-full w-full object-cover group-hover:scale-[1.02] transition-transform duration-500"
            loading="eager"
          />
          {hero.category ? (
            <span className="inline-flex mt-5 px-3 py-1 text-[11px] font-bold uppercase tracking-wider bg-brand-red text-white rounded-sm">
              {hero.category.name}
            </span>
          ) : null}
          <h1 className="mt-3 font-serif font-extrabold text-3xl md:text-4xl leading-[1.1] group-hover:text-brand-red transition-colors">
            {decodeHtmlEntities(hero.title)}
          </h1>
          {hero.excerpt ? (
            <p className="mt-3 text-base text-muted-foreground line-clamp-3">{htmlToPlainText(hero.excerpt)}</p>
          ) : null}
          <ByLine post={hero} className="mt-4" />
        </Link>
      </div>

      <aside className="lg:col-span-4">
        <SectionHeading>Top Stories</SectionHeading>
        <ul className="mt-4 divide-y divide-border">
          {topStories.map((p) => (
            <li key={p.id} className="py-4 first:pt-0">
              <TopStoryItem post={p} />
            </li>
          ))}
        </ul>
      </aside>
    </section>
  );
}

function TopStoryItem({ post }: { post: HomePost }) {
  return (
    <Link
      to="/$slug"
      params={{ slug: post.slug }}
      className="group flex items-start gap-3"
    >
      <div className="flex-1 min-w-0">
        {post.category ? (
          <p className="text-[10px] uppercase tracking-wider font-semibold text-brand-red">
            {post.category.name}
          </p>
        ) : null}
        <h3 className="mt-1 font-serif font-bold text-sm leading-snug group-hover:text-brand-red transition-colors line-clamp-3">
          {decodeHtmlEntities(post.title)}
        </h3>
        <p className="mt-1 text-[11px] text-muted-foreground">
          {formatDate(post.published_at)}
        </p>
      </div>
      <PostImage
        src={post.featured_image_url}
        alt={decodeHtmlEntities(post.title)}
        className="w-24 h-24 shrink-0 overflow-hidden rounded bg-muted"
      />
    </Link>
  );
}

function ByLine({ post, className }: { post: HomePost; className?: string }) {
  const author = post.author;
  const name = author?.display_name ?? "Editorial Team";
  const avatar = author?.avatar_url ? (
    <img
      src={author.avatar_url}
      alt={name}
      className="w-6 h-6 rounded-full object-cover"
    />
  ) : (
    <span className="w-6 h-6 rounded-full bg-muted inline-flex items-center justify-center text-[10px] font-semibold text-foreground">
      {name.slice(0, 2).toUpperCase()}
    </span>
  );
  return (
    <div className={`flex items-center gap-2 text-xs text-muted-foreground ${className ?? ""}`}>
      {author?.slug ? (
        <Link
          to="/author/$slug"
          params={{ slug: author.slug }}
          className="flex items-center gap-2 group"
        >
          {avatar}
          <span className="font-medium text-foreground group-hover:text-brand-blue transition-colors">
            {name}
          </span>
        </Link>
      ) : (
        <>
          {avatar}
          <span className="font-medium text-foreground">{name}</span>
        </>
      )}
      <span aria-hidden>•</span>
      <time dateTime={post.published_at ?? undefined}>{formatDate(post.published_at)}</time>
    </div>
  );
}

/* ---------------- Section rows ---------------- */

function SectionHeading({
  children,
  invert = false,
}: {
  children: React.ReactNode;
  invert?: boolean;
}) {
  return (
    <h2
      className={`font-serif font-bold text-xl flex items-center gap-3 border-b pb-3 ${
        invert ? "border-white/15 text-white" : ""
      }`}
    >
      <span className="inline-block w-3 h-3 bg-brand-red" aria-hidden />
      {children}
    </h2>
  );
}

function SectionRow({
  title,
  categorySlug,
  posts,
}: {
  title: string;
  categorySlug: string | null;
  posts: HomePost[];
}) {
  if (!posts.length) return null;
  return (
    <section className="mx-auto max-w-7xl px-6 mt-14">
      <div className="flex items-end justify-between gap-3 mb-6">
        <h2 className="font-serif font-bold text-2xl flex items-center gap-3">
          <span className="inline-block w-3 h-3 bg-brand-red" aria-hidden />
          {title}
        </h2>
        {categorySlug ? (
          <ViewAllLink categorySlug={categorySlug} />
        ) : null}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-7">
        {posts.map((p) => (
          <ArticleCard key={p.id} post={p} />
        ))}
      </div>
    </section>
  );
}

function ViewAllLink({ categorySlug, invert = false }: { categorySlug: string; invert?: boolean }) {
  return (
    <a
      href={`/category/${categorySlug}`}
      className={`text-sm font-medium inline-flex items-center gap-1 hover:text-brand-red ${
        invert ? "text-white/85 hover:text-white" : "text-foreground"
      }`}
    >
      View all <ChevronRight className="w-4 h-4" />
    </a>
  );
}

function ArticleCard({ post, invert = false }: { post: HomePost; invert?: boolean }) {
  return (
    <div className="group block">
      <Link to="/$slug" params={{ slug: post.slug }} className="block">
        <PostImage
          src={post.featured_image_url}
          alt={decodeHtmlEntities(post.title)}
          className="aspect-[16/10] w-full overflow-hidden rounded-md bg-muted"
          imgClassName="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
        />
      </Link>
      {post.category ? (
        <p
          className={`mt-3 text-[10px] uppercase tracking-wider font-semibold ${
            invert ? "text-brand-red" : "text-brand-red"
          }`}
        >
          {post.category.name}
        </p>
      ) : null}
      <h3
        className={`mt-1 font-serif font-bold text-lg leading-snug line-clamp-3 transition-colors ${
          invert ? "text-white" : ""
        }`}
      >
        <Link
          to="/$slug"
          params={{ slug: post.slug }}
          className="hover:text-brand-red"
        >
          {decodeHtmlEntities(post.title)}
        </Link>
      </h3>
      <p
        className={`mt-2 text-xs flex items-center gap-1.5 ${
          invert ? "text-white/60" : "text-muted-foreground"
        }`}
      >
        {post.author?.avatar_url ? (
          <img
            src={post.author.avatar_url}
            alt={post.author.display_name}
            className="w-5 h-5 rounded-full object-cover"
          />
        ) : null}
        {post.author?.slug ? (
          <Link
            to="/author/$slug"
            params={{ slug: post.author.slug }}
            className={`font-medium hover:text-brand-blue ${invert ? "text-white/85" : "text-foreground"}`}
          >
            {post.author.display_name}
          </Link>
        ) : (
          <span className={invert ? "text-white/85" : "text-foreground"}>Editorial Team</span>
        )}
        <span aria-hidden>·</span>
        <span>{formatDate(post.published_at)}</span>
      </p>
    </div>
  );
}

/* ---------------- Dark feature (Crisis) ---------------- */

function DarkFeatureSection({
  title,
  categorySlug,
  posts,
}: {
  title: string;
  categorySlug: string;
  posts: HomePost[];
}) {
  if (!posts.length) return null;
  const [main, ...rest] = posts;
  return (
    <section className="bg-ink text-ink-foreground mt-16 py-14">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex items-end justify-between gap-3 mb-6">
          <h2 className="font-serif font-bold text-2xl flex items-center gap-3 text-white">
            <span className="inline-block w-3 h-3 bg-brand-red" aria-hidden />
            {title}
          </h2>
          <ViewAllLink categorySlug={categorySlug} invert />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7">
            <ArticleCard post={main} invert />
          </div>
          <div className="lg:col-span-5 space-y-6">
            {rest.map((p) => (
              <Link
                key={p.id}
                to="/$slug"
                params={{ slug: p.slug }}
                className="group flex gap-4"
              >
                <PostImage
                  src={p.featured_image_url}
                  alt={decodeHtmlEntities(p.title)}
                  className="w-32 h-24 shrink-0 overflow-hidden rounded bg-muted"
                />
                <div className="flex-1 min-w-0">
                  {p.category ? (
                    <p className="text-[10px] uppercase tracking-wider font-semibold text-brand-red">
                      {p.category.name}
                    </p>
                  ) : null}
                  <h3 className="mt-1 font-serif font-bold text-base text-white leading-snug line-clamp-3 group-hover:text-brand-red transition-colors">
                    {decodeHtmlEntities(p.title)}
                  </h3>
                  <p className="mt-1 text-[11px] text-white/60">
                    {formatDate(p.published_at)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------- Top creators ---------------- */

function TopCreatorsRow({ authors }: { authors: HomeAuthor[] }) {
  if (!authors.length) return null;

  // Ensure preferred ordering: Seth Semilof 3rd, Kevin Mercuri 4th when present
  const ordered = (() => {
    const list = [...authors];
    const pull = (pred: (a: HomeAuthor) => boolean) => {
      const i = list.findIndex(pred);
      return i >= 0 ? list.splice(i, 1)[0] : null;
    };
    const seth = pull((a) => /seth.*semilof/i.test(a.display_name) || a.slug === "seth-semilof");
    const merc = pull((a) => /mercuri/i.test(a.display_name) || a.slug === "kmercuri" || a.slug === "kevin-mercuri");
    const result = list.slice(0, 2);
    if (seth) result.push(seth);
    if (merc) result.push(merc);
    // fill remaining slots up to 4 if we don't have seth/merc
    for (const a of list.slice(2)) {
      if (result.length >= 4) break;
      if (!result.includes(a)) result.push(a);
    }
    return result.slice(0, 4);
  })();

  return (
    <section className="mx-auto max-w-7xl px-6 mt-16">
      <div className="flex items-end justify-between gap-3 mb-6">
        <h2 className="font-serif font-bold text-2xl flex items-center gap-3">
          <span className="inline-block w-3 h-3 bg-brand-red" aria-hidden />
          Top Authors
        </h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {ordered.map((a) => (
          <article
            key={a.id}
            className="rounded-xl border bg-card p-6 flex flex-col items-center text-center overflow-hidden"
          >
            <div className="w-20 h-20 rounded-full overflow-hidden bg-muted mb-3 flex-shrink-0">
              {a.avatar_url ? (
                <img
                  src={a.avatar_url}
                  alt={a.display_name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-serif font-bold text-xl text-muted-foreground">
                  {a.display_name.slice(0, 2).toUpperCase()}
                </div>
              )}
            </div>
            <h3 className="font-serif font-bold text-base">{a.display_name}</h3>
            <p className="mt-1 text-xs text-muted-foreground line-clamp-3 min-h-[3rem] break-words">
              {a.bio
                ? htmlToPlainText(a.bio)
                : `${a.post_count.toLocaleString()} stories published.`}
            </p>
            <Link
              to="/author/$slug"
              params={{ slug: a.slug }}
              className="mt-4 text-xs font-semibold inline-flex items-center gap-1 text-brand-red hover:underline"
            >
              View profile <ChevronRight className="w-3 h-3" />
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}

/* ---------------- Economy / corporate-pr feature ---------------- */

function EconomyFeature({ post }: { post: HomePost }) {
  return (
    <section className="mx-auto max-w-7xl px-6 mt-16">
      <article className="rounded-2xl bg-surface-soft border overflow-hidden grid grid-cols-1 md:grid-cols-2">
        <PostImage
          src={post.featured_image_url}
          alt={decodeHtmlEntities(post.title)}
          className="aspect-[4/3] md:aspect-auto bg-muted"
        />
        <div className="p-8 md:p-12 flex flex-col justify-center">
          {post.category ? (
            <p className="text-[10px] uppercase tracking-wider font-semibold text-brand-red">
              {post.category.name}
            </p>
          ) : null}
          <h3 className="mt-2 font-serif font-extrabold text-2xl md:text-3xl leading-[1.15]">
            {decodeHtmlEntities(post.title)}
          </h3>
          {post.excerpt ? (
            <p className="mt-3 text-sm text-muted-foreground line-clamp-4">
              {htmlToPlainText(post.excerpt)}
            </p>
          ) : null}
          <Link
            to="/$slug"
            params={{ slug: post.slug }}
            className="mt-6 inline-flex w-fit items-center gap-2 rounded-md border border-foreground px-5 py-2.5 text-xs font-semibold uppercase tracking-wider hover:bg-foreground hover:text-background transition-colors"
          >
            Read More <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </article>
    </section>
  );
}
