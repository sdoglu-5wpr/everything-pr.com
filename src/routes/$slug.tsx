import { createFileRoute, Link, notFound, redirect, useRouter } from "@tanstack/react-router";
import { ChevronRight, ArrowRight, Clock, Share2, Twitter, Linkedin, Facebook, Link as LinkIcon } from "lucide-react";
import { getArticleBySlug, type RelatedPost, type ArticlePayload, type ArticleAuthor } from "@/serverFns/articles.functions";
import { getArchive, type ArchivePayload } from "@/serverFns/archives.functions";
import { lookupRedirect } from "@/serverFns/redirects.functions";
import { fetchArticleViaRpc } from "@/lib/articles.shared";
import { fetchArchiveViaRpc } from "@/lib/archives.shared";
import { supabase } from "@/integrations/supabase/client";
import { SiteLayout } from "@/components/site/SiteLayout";
import { NewsletterBanner } from "@/components/site/NewsletterBanner";
import { PostImage } from "@/components/site/PostImage";
import { ContactPage } from "@/components/site/ContactPage";
import { ArchiveView, type PageHref } from "@/components/site/ArchiveView";

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
  loader: async ({ params }) => {
    if (!params.slug || params.slug.includes(".")) throw notFound();

    // Try article first
    const data = await loadArticle(params.slug);
    if (data) return { kind: "article" as const, data };

    // Fall back to category archive (legacy permalinks like /social-media)
    const archive = typeof window !== "undefined"
      ? await fetchArchiveViaRpc(supabase, { kind: "category", slug: params.slug, page: 1 })
      : await getArchive({ data: { kind: "category", slug: params.slug, page: 1 } });
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
    if (!loaderData || loaderData.kind !== "article") return { meta: [{ title: "Everything-PR" }] };
    const { article } = loaderData.data;
    const title = article.seo?.title || `${article.title} · Everything-PR`;
    const description =
      article.seo?.description ||
      article.excerpt ||
      `${article.title} — read the full story on Everything-PR.`;
    const ogImage = article.seo?.og_image || article.featured_image?.url || undefined;
    const canonical = article.seo?.canonical_url || undefined;

    const meta = [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: article.seo?.og_title || article.title },
      { property: "og:description", content: article.seo?.og_description || description },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: article.title },
      { name: "twitter:description", content: description },
    ];
    if (ogImage) {
      meta.push({ property: "og:image", content: ogImage });
      meta.push({ name: "twitter:image", content: ogImage });
    }
    if (article.seo?.robots) meta.push({ name: "robots", content: article.seo.robots });

    const links = canonical ? [{ rel: "canonical", href: canonical }] : [];

    const ld = {
      "@context": "https://schema.org",
      "@type": "NewsArticle",
      headline: article.title,
      description,
      image: ogImage ? [ogImage] : undefined,
      datePublished: article.published_at ?? undefined,
      dateModified: article.modified_at ?? article.published_at ?? undefined,
      author: article.author
        ? { "@type": "Person", name: article.author.display_name }
        : undefined,
      publisher: {
        "@type": "Organization",
        name: "Everything-PR",
      },
    };

    return {
      meta,
      links,
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify(ld),
        },
      ],
    };
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
  | { kind: "archive"; data: ArchivePayload; slug: string };

function ArticlePage() {
  const loaderData = Route.useLoaderData() as LoaderData | undefined;
  if (!loaderData) return <NotFound />;

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

  const { article, topStories = [], otherNews = [] } = loaderData.data;
  const categories = article.categories ?? [];
  const primaryCategory = categories[0];
  const minutes = readingTime(article.content_html);

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
        {article.excerpt ? (
          <p className="mt-5 text-lg md:text-xl text-muted-foreground leading-relaxed max-w-3xl">
            {article.excerpt}
          </p>
        ) : null}
        <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-muted-foreground">
          {article.author?.avatar_url ? (
            <img
              src={article.author.avatar_url}
              alt={article.author.display_name}
              className="w-9 h-9 rounded-full object-cover"
            />
          ) : (
            <span className="w-9 h-9 rounded-full bg-muted inline-flex items-center justify-center text-xs font-semibold text-foreground">
              {(article.author?.display_name ?? "EP").slice(0, 2).toUpperCase()}
            </span>
          )}
          <span className="font-semibold text-foreground">
            By {article.author?.display_name ?? "Editorial Team"}
          </span>
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
              />
              {article.featured_image.alt ? (
                <figcaption className="mt-2 text-sm text-muted-foreground">
                  {article.featured_image.alt}
                </figcaption>
              ) : null}
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

          {article.author ? <AuthorCard author={article.author} /> : null}
        </div>

        <aside className="lg:col-span-1">
          <div className="sticky top-6 space-y-8">
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
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed line-clamp-4">{author.bio}</p>
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
        <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{post.excerpt}</p>
      ) : null}
    </Link>
  );
}
