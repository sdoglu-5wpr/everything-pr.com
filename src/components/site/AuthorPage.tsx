import { Link } from "@tanstack/react-router";
import { ArrowRight, ShieldCheck, Linkedin, Twitter, Globe, Mail } from "lucide-react";
import type { ArchivePayload, ArchiveItem } from "@/serverFns/archives.functions";
import { SiteLayout } from "./SiteLayout";
import { PostImage } from "./PostImage";
import { htmlToPlainText, decodeHtmlEntities } from "@/lib/text";

function formatDate(iso: string | null | undefined) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function readingTime(text: string | null | undefined): number {
  if (!text) return 4;
  const words = text.split(/\s+/).length;
  return Math.max(3, Math.round(words / 220));
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function ArticleCard({ post }: { post: ArchiveItem }) {
  return (
    <article className="bg-white border border-black/5 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col">
      <Link to="/$slug" params={{ slug: post.slug }} className="block">
        <PostImage
          src={post.featured_image_url}
          alt={post.title}
          className="aspect-[16/9] overflow-hidden bg-muted"
          imgClassName="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
        />
      </Link>
      <div className="p-5 flex flex-col flex-1">
        {post.category ? (
          <Link
            to="/$slug"
            params={{ slug: post.category.slug }}
            className="self-start inline-block text-[10px] font-bold uppercase tracking-[0.18em] text-white bg-[color:var(--brand-blue)] px-2.5 py-1 rounded mb-3"
          >
            {post.category.name}
          </Link>
        ) : null}
        <div className="text-xs text-muted-foreground mb-2">
          {formatDate(post.published_at)}
        </div>
        <h3 className="font-serif text-lg font-bold leading-snug">
          <Link
            to="/$slug"
            params={{ slug: post.slug }}
            className="text-foreground hover:text-[color:var(--brand-blue)]"
          >
            {decodeHtmlEntities(post.title)}
          </Link>
        </h3>
        {post.excerpt ? (
          <p className="mt-2 text-sm text-muted-foreground line-clamp-3">{htmlToPlainText(post.excerpt)}</p>
        ) : null}
        <div className="mt-auto pt-4 flex items-center justify-between text-xs text-muted-foreground border-t border-black/5">
          <span>{readingTime(post.excerpt)} min read</span>
          <Link
            to="/$slug"
            params={{ slug: post.slug }}
            className="inline-flex items-center gap-1 font-semibold text-[color:var(--brand-blue)] hover:gap-2 transition-all"
          >
            Read more <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </article>
  );
}

export function AuthorPage({ data }: { data: ArchivePayload }) {
  const { header, items, totalItems } = data;
  const author = header.author!;
  const display = header.title;
  const bio = header.subtitle;

  return (
    <SiteLayout>
      {/* Hero */}
      <section className="relative bg-gradient-to-br from-[color:var(--ink)] via-[color:var(--ink)] to-[oklch(0.32_0.18_270)] text-white">
        <div className="mx-auto max-w-7xl px-6 pt-12 pb-10">
          <nav className="text-xs text-white/60 mb-6 flex items-center gap-2">
            <Link to="/" className="hover:text-white">HOME</Link>
            <span>/</span>
            <span className="text-white/80">CONTRIBUTORS</span>
            <span>/</span>
            <span className="text-white uppercase tracking-wider">{display}</span>
          </nav>
          <h1 className="font-serif text-4xl md:text-5xl font-bold tracking-tight mb-3">
            {display}
          </h1>
          {bio ? (
            <p className="text-white/80 max-w-2xl text-base md:text-lg leading-relaxed line-clamp-3">
              {bio}
            </p>
          ) : null}
        </div>
        <div className="h-1 bg-[color:var(--brand-blue)]" />
      </section>

      {/* Profile card overlapping hero */}
      <section className="bg-surface-soft">
        <div className="mx-auto max-w-7xl px-6 -mt-6 pb-10">
          <div className="bg-white rounded-xl shadow-card border border-black/5 p-6 md:p-8 grid grid-cols-1 md:grid-cols-[auto_1fr_auto] gap-6 md:gap-10 items-center">
            <div className="relative">
              {author.avatar_url ? (
                <img
                  src={author.avatar_url}
                  alt={display}
                  className="w-28 h-28 md:w-32 md:h-32 rounded-full object-cover ring-4 ring-[color:var(--brand-blue)]/15"
                />
              ) : (
                <div className="w-28 h-28 md:w-32 md:h-32 rounded-full bg-gradient-to-br from-[color:var(--brand-blue)] to-[color:var(--ink)] text-white flex items-center justify-center text-3xl font-bold ring-4 ring-[color:var(--brand-blue)]/15">
                  {initials(display)}
                </div>
              )}
              <div className="absolute -bottom-1 -right-1 bg-[color:var(--brand-blue)] text-white rounded-full p-1.5">
                <ShieldCheck className="h-4 w-4" />
              </div>
            </div>

            <div className="min-w-0">
              <h2 className="font-serif text-2xl md:text-3xl font-bold">{display}</h2>
              <p className="text-sm text-muted-foreground mt-1">Contributor · Everything-PR</p>
              <div className="flex flex-wrap gap-2 mt-4">
                <span className="text-[11px] font-semibold uppercase tracking-wider bg-[color:var(--brand-blue)] text-white px-2.5 py-1 rounded">
                  Contributor
                </span>
                <span className="text-[11px] font-semibold uppercase tracking-wider bg-black/5 text-foreground px-2.5 py-1 rounded">
                  PR
                </span>
                <span className="text-[11px] font-semibold uppercase tracking-wider bg-black/5 text-foreground px-2.5 py-1 rounded">
                  Editorial
                </span>
              </div>
            </div>

            <div className="border-l border-black/10 pl-6 hidden md:block">
              <div className="text-3xl font-bold text-[color:var(--brand-blue)]">{totalItems}+</div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground mt-1">
                Articles Published
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Bio + sidebar */}
      {bio ? (
        <section className="mx-auto max-w-7xl px-6 grid grid-cols-1 lg:grid-cols-3 gap-8 pb-12">
          <div className="lg:col-span-2">
            <div className="border-l-4 border-[color:var(--brand-blue)] pl-5">
              <h3 className="font-serif text-2xl font-bold mb-3">About {display.split(" ")[0]}</h3>
              <div className="prose-article text-foreground">
                <p>{bio}</p>
              </div>
            </div>
          </div>
          <aside className="lg:col-span-1">
            <div className="bg-[color:var(--ink)] text-white rounded-lg p-6">
              <div className="text-xs font-bold uppercase tracking-[0.18em] border-b border-white/15 pb-3 mb-4">
                Connect
              </div>
              <ul className="space-y-3 text-sm">
                <li className="flex items-center gap-3">
                  <span className="bg-white/10 p-2 rounded"><Linkedin className="h-4 w-4" /></span>
                  <span className="text-white/80">LinkedIn profile</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="bg-white/10 p-2 rounded"><Twitter className="h-4 w-4" /></span>
                  <span className="text-white/80">X / Twitter</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="bg-white/10 p-2 rounded"><Globe className="h-4 w-4" /></span>
                  <span className="text-white/80">Website</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="bg-white/10 p-2 rounded"><Mail className="h-4 w-4" /></span>
                  <a href="mailto:info@everything-pr.com" className="text-white/80 hover:text-white">
                    info@everything-pr.com
                  </a>
                </li>
              </ul>
            </div>
          </aside>
        </section>
      ) : null}

      {/* Latest articles */}
      <section className="bg-surface-soft py-12">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex items-end justify-between mb-8 border-b border-black/10 pb-4">
            <div>
              <div className="w-12 h-1 bg-[color:var(--brand-blue)] mb-3" />
              <h2 className="font-serif text-3xl md:text-4xl font-bold">
                Latest by <span className="text-[color:var(--brand-blue)]">{display}</span>
              </h2>
            </div>
            <div className="text-sm text-muted-foreground hidden md:block">
              {totalItems} article{totalItems === 1 ? "" : "s"}
            </div>
          </div>

          {items.length === 0 ? (
            <div className="py-20 text-center text-muted-foreground">
              No articles published yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {items.map((p) => (
                <ArticleCard key={p.id} post={p} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Editorial standards strip */}
      <section className="bg-[color:var(--ink)] text-white">
        <div className="mx-auto max-w-7xl px-6 py-6 flex flex-col md:flex-row items-center gap-4 text-sm">
          <div className="bg-white/10 p-2 rounded-full">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <p className="text-white/80 text-center md:text-left">
            All articles by this author follow Everything-PR's{" "}
            <Link
              to="/$slug"
              params={{ slug: "editorial-policy" }}
              className="text-white underline font-semibold"
            >
              Editorial Standards
            </Link>
            , including disclosure of client relationships and corrections policy.
          </p>
        </div>
      </section>
    </SiteLayout>
  );
}
