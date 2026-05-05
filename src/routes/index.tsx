import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ChevronRight } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { NewsletterBanner } from "@/components/site/NewsletterBanner";
import { getHomepage, type HomePost, type HomeAuthor } from "@/server/homepage.functions";

export const Route = createFileRoute("/")({
  loader: () => getHomepage(),
  head: () => ({
    meta: [
      { title: "Everything-PR — Public Relations News & Analysis" },
      {
        name: "description",
        content:
          "Daily reporting on the public relations industry — agencies, campaigns, crisis, brands, and the people behind the work.",
      },
      { property: "og:title", content: "Everything-PR" },
      {
        property: "og:description",
        content: "PR news, insights, crisis communications and more.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
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
  const data = Route.useLoaderData();
  return (
    <SiteLayout tickerItems={data.ticker} footerMenu={data.footerMenu}>
      <div className="mx-auto max-w-7xl px-6 pt-10">
        <Hero hero={data.hero} topStories={data.topStories} />
      </div>

      {data.sections.slice(0, 2).map((s) => (
        <SectionRow key={s.key} title={s.title} categorySlug={s.slug} posts={s.posts} />
      ))}

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

      <div className="mx-auto max-w-7xl px-6">
        <NewsletterBanner />
      </div>
    </SiteLayout>
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
          <div className="aspect-[16/9] w-full overflow-hidden rounded-lg bg-muted">
            {hero.featured_image_url ? (
              <img
                src={hero.featured_image_url}
                alt={hero.title}
                className="h-full w-full object-cover group-hover:scale-[1.02] transition-transform duration-500"
                loading="eager"
              />
            ) : null}
          </div>
          {hero.category ? (
            <span className="inline-flex mt-5 px-3 py-1 text-[11px] font-bold uppercase tracking-wider bg-brand-red text-white rounded-sm">
              {hero.category.name}
            </span>
          ) : null}
          <h1 className="mt-3 font-serif font-extrabold text-3xl md:text-4xl leading-[1.1] group-hover:text-brand-red transition-colors">
            {hero.title}
          </h1>
          {hero.excerpt ? (
            <p className="mt-3 text-base text-muted-foreground line-clamp-3">{hero.excerpt}</p>
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
          {post.title}
        </h3>
        <p className="mt-1 text-[11px] text-muted-foreground">
          {formatDate(post.published_at)}
        </p>
      </div>
      <div className="w-24 h-24 shrink-0 overflow-hidden rounded bg-muted">
        {post.featured_image_url ? (
          <img
            src={post.featured_image_url}
            alt={post.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : null}
      </div>
    </Link>
  );
}

function ByLine({ post, className }: { post: HomePost; className?: string }) {
  return (
    <div className={`flex items-center gap-2 text-xs text-muted-foreground ${className ?? ""}`}>
      {post.author?.avatar_url ? (
        <img
          src={post.author.avatar_url}
          alt={post.author.display_name}
          className="w-6 h-6 rounded-full object-cover"
        />
      ) : (
        <span className="w-6 h-6 rounded-full bg-muted inline-flex items-center justify-center text-[10px] font-semibold text-foreground">
          {(post.author?.display_name ?? "EP").slice(0, 2).toUpperCase()}
        </span>
      )}
      <span className="font-medium text-foreground">
        {post.author?.display_name ?? "Editorial Team"}
      </span>
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
    <Link to="/$slug" params={{ slug: post.slug }} className="group block">
      <div className="aspect-[16/10] w-full overflow-hidden rounded-md bg-muted">
        {post.featured_image_url ? (
          <img
            src={post.featured_image_url}
            alt={post.title}
            className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
            loading="lazy"
          />
        ) : null}
      </div>
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
        className={`mt-1 font-serif font-bold text-lg leading-snug line-clamp-3 group-hover:text-brand-red transition-colors ${
          invert ? "text-white" : ""
        }`}
      >
        {post.title}
      </h3>
      <p
        className={`mt-2 text-xs ${
          invert ? "text-white/60" : "text-muted-foreground"
        }`}
      >
        {post.author?.display_name ?? "Editorial Team"} · {formatDate(post.published_at)}
      </p>
    </Link>
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
                <div className="w-32 h-24 shrink-0 overflow-hidden rounded bg-white/10">
                  {p.featured_image_url ? (
                    <img
                      src={p.featured_image_url}
                      alt={p.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : null}
                </div>
                <div className="flex-1 min-w-0">
                  {p.category ? (
                    <p className="text-[10px] uppercase tracking-wider font-semibold text-brand-red">
                      {p.category.name}
                    </p>
                  ) : null}
                  <h3 className="mt-1 font-serif font-bold text-base text-white leading-snug line-clamp-3 group-hover:text-brand-red transition-colors">
                    {p.title}
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
  return (
    <section className="mx-auto max-w-7xl px-6 mt-16">
      <div className="flex items-end justify-between gap-3 mb-6">
        <h2 className="font-serif font-bold text-2xl flex items-center gap-3">
          <span className="inline-block w-3 h-3 bg-brand-red" aria-hidden />
          Top Authors
        </h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {authors.map((a) => (
          <article
            key={a.id}
            className="rounded-xl border bg-card p-6 flex flex-col items-center text-center"
          >
            <div className="w-20 h-20 rounded-full overflow-hidden bg-muted mb-3">
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
            <p className="mt-1 text-xs text-muted-foreground line-clamp-3 min-h-[3rem]">
              {a.bio ?? `${a.post_count.toLocaleString()} stories published.`}
            </p>
            <a
              href={`/author/${a.slug}`}
              className="mt-4 text-xs font-semibold inline-flex items-center gap-1 text-brand-red hover:underline"
            >
              View profile <ChevronRight className="w-3 h-3" />
            </a>
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
        <div className="aspect-[4/3] md:aspect-auto bg-muted">
          {post.featured_image_url ? (
            <img
              src={post.featured_image_url}
              alt={post.title}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : null}
        </div>
        <div className="p-8 md:p-12 flex flex-col justify-center">
          {post.category ? (
            <p className="text-[10px] uppercase tracking-wider font-semibold text-brand-red">
              {post.category.name}
            </p>
          ) : null}
          <h3 className="mt-2 font-serif font-extrabold text-2xl md:text-3xl leading-[1.15]">
            {post.title}
          </h3>
          {post.excerpt ? (
            <p className="mt-3 text-sm text-muted-foreground line-clamp-4">
              {post.excerpt}
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
