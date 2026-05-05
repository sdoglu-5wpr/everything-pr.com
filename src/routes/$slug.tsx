import { createFileRoute, Link, notFound, useRouter } from "@tanstack/react-router";
import { ChevronRight, ArrowRight } from "lucide-react";
import { getArticleBySlug, type RelatedPost } from "@/server/articles.functions";
import { SiteLayout } from "@/components/site/SiteLayout";
import { NewsletterBanner } from "@/components/site/NewsletterBanner";

export const Route = createFileRoute("/$slug")({
  loader: async ({ params }) => {
    const data = await getArticleBySlug({ data: { slug: params.slug } });
    if (!data) throw notFound();
    return data;
  },
  head: ({ loaderData }) => {
    if (!loaderData) return { meta: [{ title: "Not found · Everything-PR" }] };
    const { article } = loaderData;
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

function ArticlePage() {
  const { article, topStories, otherNews } = Route.useLoaderData();
  const primaryCategory = article.categories[0];

  return (
    <SiteLayout>
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="bg-surface-soft border-b">
        <div className="mx-auto max-w-7xl px-6 py-3 flex items-center gap-2 text-xs text-muted-foreground">
          <Link to="/" className="hover:text-foreground">Home</Link>
          <ChevronRight className="w-3 h-3" />
          {primaryCategory ? (
            <>
              <Link to="/" className="hover:text-foreground">{primaryCategory.name}</Link>
              <ChevronRight className="w-3 h-3" />
            </>
          ) : null}
          <span className="text-foreground line-clamp-1">{article.title}</span>
        </div>
      </nav>

      <div className="mx-auto max-w-7xl px-6 pt-10 pb-4">
        <h1 className="font-serif text-4xl md:text-5xl font-bold leading-[1.1] max-w-4xl">
          {article.title}
        </h1>
        <div className="mt-5 flex items-center gap-3 text-sm text-muted-foreground">
          {article.author?.avatar_url ? (
            <img
              src={article.author.avatar_url}
              alt={article.author.display_name}
              className="w-8 h-8 rounded-full object-cover"
            />
          ) : (
            <span className="w-8 h-8 rounded-full bg-muted inline-flex items-center justify-center text-xs font-semibold text-foreground">
              {(article.author?.display_name ?? "EP").slice(0, 2).toUpperCase()}
            </span>
          )}
          <span className="font-medium text-foreground">
            {article.author?.display_name ?? "Editorial Team"}
          </span>
          {primaryCategory ? (
            <>
              <span aria-hidden>•</span>
              <span>{primaryCategory.name}</span>
            </>
          ) : null}
          <span aria-hidden>•</span>
          <time dateTime={article.published_at ?? undefined}>
            {formatDate(article.published_at)}
          </time>
        </div>
      </div>

      {/* Hero + sidebar */}
      <div className="mx-auto max-w-7xl px-6 grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2">
          {article.featured_image?.url ? (
            <figure className="mt-2">
              <img
                src={article.featured_image.url}
                alt={article.featured_image.alt ?? article.title}
                className="w-full h-auto rounded-lg object-cover"
                loading="eager"
              />
            </figure>
          ) : null}

          {article.excerpt ? (
            <p className="mt-6 text-lg text-foreground/90 leading-relaxed">
              {article.excerpt}
            </p>
          ) : null}

          <article
            className="prose-article mt-6"
            // content comes from trusted import pipeline; rendered as-is to preserve WP markup
            dangerouslySetInnerHTML={{ __html: article.content_html }}
          />
        </div>

        <aside className="lg:col-span-1">
          <div className="sticky top-6">
            <SidebarHeader title="Top Stories" />
            <ul className="mt-4 space-y-4">
              {topStories.map(s => (
                <li key={s.id}>
                  <SidebarItem post={s} />
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>

      {/* Other news */}
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
      <div className="w-24 h-20 shrink-0 overflow-hidden rounded-md bg-muted">
        {post.featured_image_url ? (
          <img
            src={post.featured_image_url}
            alt={post.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
            loading="lazy"
          />
        ) : null}
      </div>
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
      <div className="aspect-[16/10] overflow-hidden rounded-lg bg-muted">
        {post.featured_image_url ? (
          <img
            src={post.featured_image_url}
            alt={post.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : null}
      </div>
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
