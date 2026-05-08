import { createFileRoute, Link, notFound, redirect, stripSearchParams, useRouter } from "@tanstack/react-router";

import { ChevronRight, ArrowRight, Clock, Share2, Twitter, Linkedin, Facebook, Link as LinkIcon } from "lucide-react";
import { getArticleBySlug, type RelatedPost, type ArticlePayload, type ArticleAuthor } from "@/serverFns/articles.functions";
import { getArchive, type ArchivePayload } from "@/serverFns/archives.functions";
import { getPillar, type PillarPayload } from "@/serverFns/pillars.functions";
import { lookupRedirect } from "@/serverFns/redirects.functions";
import { fetchArticleViaRpc } from "@/lib/articles.shared";
import { fetchArchiveViaRpc } from "@/lib/archives.shared";
import { fetchPillarViaRpc } from "@/lib/pillars.shared";
import { supabase } from "@/integrations/supabase/client";
import { SiteLayout } from "@/components/site/SiteLayout";
import { NewsletterBanner } from "@/components/site/NewsletterBanner";
import { PostImage } from "@/components/site/PostImage";
import { ContactPage } from "@/components/site/ContactPage";
import { ArchiveView, type PageHref } from "@/components/site/ArchiveView";
import { PillarView } from "@/components/site/PillarView";
import { htmlToPlainText } from "@/lib/text";
import { rewriteLegacyHtml } from "@/lib/legacy-urls";
import { buildArticleHead } from "@/serverFns/seo.article";
import { extractFaqPairs } from "@/lib/faq";
import { FaqSection } from "@/components/site/FaqSection";
import { About5WBoilerplate, Related5WResearch, Work5WCTA } from "@/components/site/FiveWBlocks";

import fiveWBanner from "@/assets/5wpr-banner.jpg";

async function loadArticle(slug: string): Promise<ArticlePayload | null> {
  // In the browser (e.g. Netlify static hosting where TanStack server functions
  // are not deployed), call Supabase directly. On the server, use the typed
  // server function so we get response-cache headers + loader cache.
  if (typeof window !== "undefined") {
    return fetchArticleViaRpc(supabase, slug);
  }
  return getArticleBySlug({ data: { slug } });
}

async function lookupRedirectInBrowser(path: string) {
  const variants = [path];
  if (path.endsWith("/")) variants.push(path.replace(/\/+$/, ""));
  else variants.push(`${path}/`);
  const { data } = await (supabase as any)
    .from("redirects")
    .select("source_path, target_path, status_code")
    .in("source_path", variants)
    .eq("enabled", true)
    .limit(1)
    .maybeSingle();
  return data ? { target_path: data.target_path, status_code: data.status_code } : null;
}

export const Route = createFileRoute("/$slug")({
  validateSearch: (s: Record<string, unknown>) => ({
    page: Math.max(1, Number(s.page) || 1),
  }),
  search: { middlewares: [stripSearchParams({ page: 1 }) as any] },
  loaderDeps: ({ search }) => ({ page: search.page }),
  loader: async ({ params, deps }) => {
    if (!params.slug || params.slug.includes(".")) throw notFound();

    // 1. Try article (only on page 1 — articles aren't paginated)
    if (deps.page === 1) {
      const data = await loadArticle(params.slug);
      if (data) return { kind: "article" as const, data };
    }

    // 2. Try pillar (industry landing page)
    const pillar = typeof window !== "undefined"
      ? await fetchPillarViaRpc(supabase, params.slug, deps.page)
      : await getPillar({ data: { slug: params.slug, page: deps.page } });
    if (pillar) return { kind: "pillar" as const, data: pillar };

    // 3. Fall back to category archive
    const archive = typeof window !== "undefined"
      ? await fetchArchiveViaRpc(supabase, { kind: "category", slug: params.slug, page: deps.page })
      : await getArchive({ data: { kind: "category", slug: params.slug, page: deps.page } });
    if (archive && archive.items.length > 0) {
      return { kind: "archive" as const, data: archive, slug: params.slug };
    }

    const r = typeof window !== "undefined"
      ? await lookupRedirectInBrowser(`/${params.slug}`)
      : await lookupRedirect({ data: { path: `/${params.slug}` } });
    if (r?.target_path) {
      throw redirect({ href: r.target_path, statusCode: (r.status_code ?? 301) as 301 | 302 });
    }
    throw notFound();
  },
  head: ({ loaderData }) => {
    if (!loaderData) return { meta: [{ title: "Everything-PR" }] };
    if (loaderData.kind === "pillar") {
      const p = loaderData.data.pillar;
      const description = p.subtitle || `${p.title} — long-form guide and the latest coverage on Everything-PR.`;
      const meta = [
        { title: `${p.title} · Everything-PR` },
        { name: "description", content: description },
        { property: "og:title", content: p.title },
        { property: "og:description", content: description },
        { property: "og:type", content: "article" },
        { name: "twitter:card", content: "summary_large_image" },
      ];
      if (p.hero_image_url) {
        meta.push({ property: "og:image", content: p.hero_image_url });
        meta.push({ name: "twitter:image", content: p.hero_image_url });
      }
      const scripts = p.schema_jsonld
        ? [{ type: "application/ld+json", children: JSON.stringify(p.schema_jsonld) }]
        : [];
      return { meta, scripts };
    }
    if (loaderData.kind !== "article") return { meta: [{ title: "Everything-PR" }] };
    const { article } = loaderData.data;
    return buildArticleHead(article);
  },
  notFoundComponent: NotFound,
  errorComponent: ErrorView,
  component: ArticlePage,
});

function NotFound() {
  return (
    <SiteLayout>
      <div className="mx-auto max-w-2xl px-6 py-24 text-center">
        <h1 className="font-serif text-5xl font-bold mb-3">404</h1>
        <p className="text-muted-foreground mb-6">We couldn’t find the article you’re looking for.</p>
        <Link to="/" className="text-brand-blue underline">Back to homepage</Link>
      </div>
    </SiteLayout>
  );
}

function ErrorView({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  return (
    <SiteLayout>
      <div className="mx-auto max-w-2xl px-6 py-24 text-center">
        <h1 className="font-serif text-3xl font-bold mb-3">Something went wrong</h1>
        <p className="text-muted-foreground mb-6">{error.message}</p>
        <button
          onClick={() => { router.invalidate(); reset(); }}
          className="rounded-md bg-ink text-ink-foreground px-4 py-2 text-sm"
        >
          Try again
        </button>
      </div>
    </SiteLayout>
  );
}

function formatDate(iso: string | null | undefined, opts: Intl.DateTimeFormatOptions = { year: "numeric", month: "long", day: "numeric" }) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", opts);
}

function readingTime(html: string | null | undefined): number {
  if (!html) return 1;
  const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const words = text ? text.split(" ").length : 0;
  return Math.max(1, Math.round(words / 220));
}

type LoaderData =
  | { kind: "article"; data: ArticlePayload }
  | { kind: "pillar"; data: PillarPayload }
  | { kind: "archive"; data: ArchivePayload; slug: string };

function ArticlePage() {
  const loaderData = Route.useLoaderData() as LoaderData | undefined;
  if (!loaderData) return <NotFound />;

  if (loaderData.kind === "pillar") {
    return <PillarView data={loaderData.data} />;
  }

  if (loaderData.kind === "archive") {
    const { data, slug } = loaderData;
    return (
      <ArchiveView
        data={data}
        eyebrow="Category"
        buildHref={(p): PageHref => {
          if (p === 1) return { to: "/$slug", params: { slug } };
          return { to: "/category/$slug/page/$page", params: { slug, page: String(p) } };
        }}
      />
    );
  }

  const { article, topStories = [], otherNews = [], relatedPosts = [] } = loaderData.data;
  const categories = article.categories ?? [];
  const primaryCategory = categories[0];
  const minutes = readingTime(article.content_html);
  const faqPairs = extractFaqPairs(article.content_html);

  if (article.type === "page" && article.slug === "contact") {
    return (
      <SiteLayout>
        <ContactPage />
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="bg-surface-soft border-b">
        <div className="mx-auto max-w-7xl px-6 py-3 flex items-center gap-2 text-xs text-muted-foreground">
          <Link to="/" className="hover:text-foreground">Home</Link>
          <ChevronRight className="w-3 h-3" />
          {primaryCategory ? (
            <>
              <Link to="/$slug" params={{ slug: primaryCategory.slug }} className="hover:text-foreground">{primaryCategory.name}</Link>
              <ChevronRight className="w-3 h-3" />
            </>
          ) : null}
          <span className="text-foreground line-clamp-1">{article.title}</span>
        </div>
      </nav>

      <div className="mx-auto max-w-7xl px-6 pt-10 pb-4">
        {primaryCategory ? (
          <Link
            to="/$slug"
            params={{ slug: primaryCategory.slug }}
            className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-ticker hover:text-brand-blue mb-4"
          >
            <span className="inline-block w-2 h-2 bg-ticker" aria-hidden />
            {primaryCategory.name}
          </Link>
        ) : null}
        <h1 className="font-serif text-4xl md:text-5xl font-bold leading-[1.05] tracking-tight max-w-4xl">
          {article.title}
        </h1>
        <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-muted-foreground">
          {article.author?.slug ? (
            <Link
              to="/author/$slug"
              params={{ slug: article.author.slug }}
              className="flex items-center gap-3 group"
            >
              {article.author.avatar_url ? (
                <img
                  src={article.author.avatar_url}
                  alt={article.author.display_name}
                  className="w-9 h-9 rounded-full object-cover ring-2 ring-transparent group-hover:ring-[color:var(--brand-blue)]/30 transition"
                />
              ) : (
                <span className="w-9 h-9 rounded-full bg-muted inline-flex items-center justify-center text-xs font-semibold text-foreground">
                  {(article.author.display_name ?? "EP").slice(0, 2).toUpperCase()}
                </span>
              )}
              <span className="font-semibold text-foreground group-hover:text-[color:var(--brand-blue)] transition-colors">
                By {article.author.display_name}
              </span>
            </Link>
          ) : (
            <>
              <span className="w-9 h-9 rounded-full bg-muted inline-flex items-center justify-center text-xs font-semibold text-foreground">
                EP
              </span>
              <span className="font-semibold text-foreground">By Editorial Team</span>
            </>
          )}
          <span aria-hidden>·</span>
          <time dateTime={article.published_at ?? undefined}>
            {formatDate(article.published_at)}
          </time>
          <span aria-hidden>·</span>
          <span className="inline-flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            {minutes} min read
          </span>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 grid grid-cols-1 lg:grid-cols-3 gap-10 mt-2">
        <div className="lg:col-span-2">
          {article.featured_image?.url ? (
            <figure className="mt-2">
              <img
                src={article.featured_image.url}
                alt={article.featured_image.alt ?? article.title}
                className="w-full h-auto rounded-lg object-cover"
                loading="eager"
                decoding="async"
                fetchPriority="high"
                width={1200}
                height={675}
              />
            </figure>
          ) : null}

          <ShareBar title={article.title} slug={article.slug} />

          <article
            className="prose-article mt-6"
            dangerouslySetInnerHTML={{ __html: article.content_html }}
          />


          {categories.length > 1 ? (
            <div className="mt-8 flex flex-wrap items-center gap-2">
              <span className="text-xs uppercase tracking-wider text-muted-foreground mr-2">Tags</span>
              {categories.map(c => (
                <Link
                  key={c.id}
                  to="/$slug"
                  params={{ slug: c.slug }}
                  className="text-xs font-medium px-2.5 py-1 rounded-full bg-surface-soft border hover:border-brand-blue hover:text-brand-blue transition-colors"
                >
                  {c.name}
                </Link>
              ))}
            </div>
          ) : null}

          <FaqSection pairs={faqPairs} />

          {article.author ? <AuthorCard author={article.author} /> : null}
        </div>

        <aside className="lg:col-span-1">
          <div className="sticky top-6 space-y-8">
            <a
              href="https://www.5wpr.com/?utm_source=epr&utm_medium=sidebar_banner&utm_campaign=epr_article_sidebar"
              target="_blank"
              rel="noopener noreferrer sponsored"
              className="block overflow-hidden rounded-lg border hover:opacity-90 transition-opacity"
            >
              <img src={fiveWBanner} alt="5W Public Relations — the AI Communications Firm" className="w-full h-auto" loading="lazy" />
            </a>
            <div>
              <SidebarHeader title="Top Stories" />
              <ul className="mt-4 space-y-4">
                {topStories.map(s => (
                  <li key={s.id}>
                    <SidebarItem post={s} />
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-lg border bg-surface-soft p-5">
              <h3 className="font-serif text-lg font-bold mb-2">Get the PR Brief</h3>
              <p className="text-sm text-muted-foreground mb-3">
                The week's biggest stories in PR, comms and media — straight to your inbox.
              </p>
              <Link
                to="/"
                className="inline-flex items-center gap-1 text-sm font-semibold text-brand-blue hover:underline"
              >
                Subscribe <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </aside>
      </div>

      {relatedPosts.length ? (
        <section className="mx-auto max-w-7xl px-6 mt-16">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-serif text-2xl font-bold flex items-center gap-3">
              <span className="inline-block w-3 h-3 bg-brand-blue" aria-hidden />
              Related reading
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {relatedPosts.map((p) => (
              <OtherCard key={p.id} post={p} />
            ))}
          </div>
        </section>
      ) : null}

      {otherNews.length ? (
        <section className="mx-auto max-w-7xl px-6 mt-16">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-serif text-2xl font-bold flex items-center gap-3">
              <span className="inline-block w-3 h-3 bg-ticker" aria-hidden />
              Other news
            </h2>
            <Link to="/" className="text-sm font-medium text-foreground inline-flex items-center gap-1 hover:text-brand-blue">
              See all <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {otherNews.map(p => (
              <OtherCard key={p.id} post={p} />
            ))}
          </div>
        </section>
      ) : null}

      <div className="mx-auto max-w-7xl px-6">
        <NewsletterBanner />
      </div>
    </SiteLayout>
  );
}

function ShareBar({ title, slug }: { title: string; slug: string }) {
  const url = `https://everything-pr.com/${slug}`;
  const enc = encodeURIComponent;
  return (
    <div className="mt-6 flex items-center gap-3 border-y py-3 text-sm">
      <span className="inline-flex items-center gap-1.5 text-muted-foreground font-medium">
        <Share2 className="w-4 h-4" /> Share
      </span>
      <div className="flex items-center gap-1">
        <a aria-label="Share on X" href={`https://twitter.com/intent/tweet?text=${enc(title)}&url=${enc(url)}`} target="_blank" rel="noopener noreferrer" className="w-8 h-8 inline-flex items-center justify-center rounded-full hover:bg-surface-soft text-muted-foreground hover:text-foreground"><Twitter className="w-4 h-4" /></a>
        <a aria-label="Share on LinkedIn" href={`https://www.linkedin.com/sharing/share-offsite/?url=${enc(url)}`} target="_blank" rel="noopener noreferrer" className="w-8 h-8 inline-flex items-center justify-center rounded-full hover:bg-surface-soft text-muted-foreground hover:text-foreground"><Linkedin className="w-4 h-4" /></a>
        <a aria-label="Share on Facebook" href={`https://www.facebook.com/sharer/sharer.php?u=${enc(url)}`} target="_blank" rel="noopener noreferrer" className="w-8 h-8 inline-flex items-center justify-center rounded-full hover:bg-surface-soft text-muted-foreground hover:text-foreground"><Facebook className="w-4 h-4" /></a>
        <a aria-label="Copy link" href={url} className="w-8 h-8 inline-flex items-center justify-center rounded-full hover:bg-surface-soft text-muted-foreground hover:text-foreground"><LinkIcon className="w-4 h-4" /></a>
      </div>
    </div>
  );
}

function AuthorCard({ author }: { author: ArticleAuthor }) {
  return (
    <div className="mt-12 rounded-xl border bg-surface-soft p-6 flex gap-5">
      {author.avatar_url ? (
        <img src={author.avatar_url} alt={author.display_name} className="w-16 h-16 rounded-full object-cover shrink-0" />
      ) : (
        <span className="w-16 h-16 rounded-full bg-muted inline-flex items-center justify-center font-semibold text-foreground shrink-0">
          {author.display_name.slice(0, 2).toUpperCase()}
        </span>
      )}
      <div className="min-w-0">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">Written by</div>
        <div className="font-serif text-xl font-bold mt-0.5">{author.display_name}</div>
        {author.bio ? (
          <div
            className="mt-2 text-sm text-muted-foreground leading-relaxed line-clamp-4 [&_a]:underline [&_a]:text-foreground"
            dangerouslySetInnerHTML={{ __html: rewriteLegacyHtml(author.bio) }}
          />
        ) : null}
      </div>
    </div>
  );
}

function SidebarHeader({ title }: { title: string }) {
  return (
    <h2 className="font-serif text-xl font-bold flex items-center gap-2 border-b pb-3">
      <span className="inline-block w-3 h-3 bg-ticker" aria-hidden />
      {title}
    </h2>
  );
}

function SidebarItem({ post }: { post: RelatedPost }) {
  return (
    <Link to="/$slug" params={{ slug: post.slug }} className="group flex gap-3">
      <PostImage
        src={post.featured_image_url}
        alt={post.title}
        className="w-24 h-20 shrink-0 overflow-hidden rounded-md bg-muted"
        imgClassName="w-full h-full object-cover group-hover:scale-105 transition-transform"
      />
      <div className="min-w-0 flex-1">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">
          {post.category_name ?? "News"} · {formatDate(post.published_at, { month: "short", day: "numeric", year: "numeric" })}
        </div>
        <div className="text-sm font-semibold leading-snug text-foreground group-hover:text-brand-blue line-clamp-3">
          {post.title}
        </div>
      </div>
    </Link>
  );
}

function OtherCard({ post }: { post: RelatedPost }) {
  return (
    <Link to="/$slug" params={{ slug: post.slug }} className="group block">
      <PostImage
        src={post.featured_image_url}
        alt={post.title}
        className="aspect-[16/10] overflow-hidden rounded-lg bg-muted"
        imgClassName="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
      />
      <div className="mt-3 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">{post.author_name ?? "Editorial Team"}</span>
        {" · "}
        {formatDate(post.published_at, { month: "2-digit", day: "2-digit", year: "numeric" })}
      </div>
      <h3 className="mt-1 text-base font-semibold leading-snug text-foreground group-hover:text-brand-blue line-clamp-3">
        {post.title}
      </h3>
      {post.excerpt ? (
        <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{htmlToPlainText(post.excerpt)}</p>
      ) : null}
    </Link>
  );
}
