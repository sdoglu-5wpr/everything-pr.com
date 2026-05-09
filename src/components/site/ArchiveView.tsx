import { Link } from "@tanstack/react-router";
import type { ArchiveItem, ArchivePayload } from "@/serverFns/archives.functions";
import { SiteLayout } from "./SiteLayout";
import { PostImage } from "./PostImage";
import { htmlToPlainText, decodeHtmlEntities } from "@/lib/text";
import { formatDate } from "@/lib/date";

export function ArticleListItem({ post }: { post: ArchiveItem }) {
  return (
    <article className="grid grid-cols-12 gap-5 py-6 border-b">
      <Link
        to="/$slug"
        params={{ slug: post.slug }}
        className="col-span-12 sm:col-span-4 md:col-span-3 group"
      >
        <PostImage
          src={post.featured_image_url}
          alt={post.title}
          className="aspect-[4/3] overflow-hidden rounded-md bg-muted"
          imgClassName="w-full h-full object-cover group-hover:scale-105 transition-transform"
        />
      </Link>
      <div className="col-span-12 sm:col-span-8 md:col-span-9 min-w-0">
        {post.category ? (
          <Link
            to="/$slug"
            params={{ slug: post.category.slug }}
            className="text-[11px] font-bold uppercase tracking-[0.18em] text-ticker hover:text-brand-blue inline-flex items-center gap-1.5"
          >
            <span className="inline-block w-2 h-2 bg-ticker" aria-hidden />
            {post.category.name}
          </Link>
        ) : null}
        <h2 className="mt-1.5">
          <Link
            to="/$slug"
            params={{ slug: post.slug }}
            className="font-serif text-xl md:text-2xl font-bold leading-snug text-foreground hover:text-brand-blue line-clamp-3"
          >
            {decodeHtmlEntities(post.title)}
          </Link>
        </h2>
        {post.excerpt ? (
          <p className="mt-2 text-sm md:text-base text-muted-foreground line-clamp-2">
            {htmlToPlainText(post.excerpt)}
          </p>
        ) : null}
        <div className="mt-3 text-xs text-muted-foreground">
          {post.author ? (
            <>
              <Link
                to="/author/$slug"
                params={{ slug: post.author.slug }}
                className="font-medium text-foreground hover:text-brand-blue"
              >
                {post.author.display_name}
              </Link>
              {" · "}
            </>
          ) : null}
          <time dateTime={post.published_at ?? undefined}>{formatDate(post.published_at)}</time>
        </div>
      </div>
    </article>
  );
}

export type PageHref = { to: string; params?: Record<string, string>; search?: Record<string, unknown>; hash?: string };

type PaginationProps = {
  page: number;
  totalPages: number;
  buildHref: (page: number) => PageHref;
};

function buildPageList(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "…")[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  if (start > 2) pages.push("…");
  for (let i = start; i <= end; i++) pages.push(i);
  if (end < total - 1) pages.push("…");
  pages.push(total);
  return pages;
}

export function Pagination({ page, totalPages, buildHref }: PaginationProps) {
  if (totalPages <= 1) return null;
  const prev = page > 1 ? buildHref(page - 1) : null;
  const next = page < totalPages ? buildHref(page + 1) : null;
  const pages = buildPageList(page, totalPages);
  return (
    <nav className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-10" aria-label="Pagination">
      <div className="text-sm text-muted-foreground">
        Page {page} of {totalPages}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {prev ? (
          <Link
            to={prev.to as any}
            params={prev.params as any}
            search={prev.search as any}
            hash={prev.hash as any}
            className="inline-flex items-center px-3 py-2 rounded-md border text-sm font-medium hover:bg-surface-soft"
          >
            ← Previous
          </Link>
        ) : (
          <span className="inline-flex items-center px-3 py-2 rounded-md border text-sm font-medium opacity-40">
            ← Previous
          </span>
        )}
        {pages.map((p, i) =>
          p === "…" ? (
            <span key={`e-${i}`} className="px-2 text-sm text-muted-foreground">…</span>
          ) : p === page ? (
            <span
              key={p}
              aria-current="page"
              className="inline-flex items-center px-3 py-2 rounded-md border text-sm font-semibold bg-foreground text-background"
            >
              {p}
            </span>
          ) : (
            <Link
              key={p}
              to={buildHref(p).to as any}
              params={buildHref(p).params as any}
              search={buildHref(p).search as any}
              hash={buildHref(p).hash as any}
              className="inline-flex items-center px-3 py-2 rounded-md border text-sm font-medium hover:bg-surface-soft"
            >
              {p}
            </Link>
          ),
        )}
        {next ? (
          <Link
            to={next.to as any}
            params={next.params as any}
            search={next.search as any}
            hash={next.hash as any}
            className="inline-flex items-center px-3 py-2 rounded-md border text-sm font-medium hover:bg-surface-soft"
          >
            Next →
          </Link>
        ) : (
          <span className="inline-flex items-center px-3 py-2 rounded-md border text-sm font-medium opacity-40">
            Next →
          </span>
        )}
      </div>
    </nav>
  );
}

type ArchiveViewProps = {
  data: ArchivePayload;
  buildHref: (page: number) => { to: string; params?: Record<string, string>; search?: Record<string, unknown> };
  eyebrow: string;
};

export function ArchiveView({ data, buildHref, eyebrow }: ArchiveViewProps) {
  const { header, items, page, totalPages } = data;
  return (
    <SiteLayout>
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="border-b pb-6 mb-2">
          <div className="text-xs font-bold uppercase tracking-[0.2em] text-ticker mb-2">
            {eyebrow}
          </div>
          {header.kind === "author" && header.author ? (
            <div className="flex items-center gap-4">
              {header.author.avatar_url ? (
                <img
                  src={header.author.avatar_url}
                  alt={header.author.display_name}
                  className="w-16 h-16 rounded-full object-cover"
                />
              ) : (
                <span className="w-16 h-16 rounded-full bg-muted inline-flex items-center justify-center text-base font-semibold">
                  {header.author.display_name.slice(0, 2).toUpperCase()}
                </span>
              )}
              <div>
                <h1 className="font-serif text-3xl md:text-4xl font-bold">{header.title}</h1>
                {header.subtitle ? (
                  <p className="mt-1 text-muted-foreground max-w-2xl line-clamp-2">{header.subtitle}</p>
                ) : null}
              </div>
            </div>
          ) : (
            <>
              <h1 className="font-serif text-3xl md:text-4xl font-bold">{header.title}</h1>
              {header.subtitle ? (
                <p className="mt-2 text-muted-foreground max-w-2xl">{header.subtitle}</p>
              ) : null}
            </>
          )}
        </div>

        {items.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">No articles found.</div>
        ) : (
          <div>
            {items.map((p) => (
              <ArticleListItem key={p.id} post={p} />
            ))}
          </div>
        )}

        <Pagination page={page} totalPages={totalPages} buildHref={buildHref} />
      </div>
    </SiteLayout>
  );
}
