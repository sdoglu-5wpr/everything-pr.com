import { Link } from "@tanstack/react-router";
import { ArrowRight, ShieldCheck, Linkedin, Twitter, Globe, Mail, Facebook, Instagram, BadgeCheck, Clock } from "lucide-react";
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

function hostname(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url.startsWith("http") ? url : `https://${url}`).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function handleFromUrl(url: string, base: string): string {
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    const path = u.pathname.replace(/\/$/, "").split("/").filter(Boolean);
    return path.length ? `${base}${path[path.length - 1]}` : hostname(url) || url;
  } catch {
    return url;
  }
}

function ArticleCard({ post }: { post: ArchiveItem }) {
  return (
    <article className="bg-white border border-black/5 rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow flex flex-col group">
      <Link to="/$slug" params={{ slug: post.slug }} className="block">
        <PostImage
          src={post.featured_image_url}
          alt={post.title}
          className="aspect-[16/9] overflow-hidden bg-muted"
          imgClassName="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
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
        <div className="text-xs text-muted-foreground mb-2 flex items-center gap-2">
          <Clock className="h-3 w-3" /> {formatDate(post.published_at)}
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

function ProfileLink({
  icon: Icon,
  label,
  sub,
  href,
}: {
  icon: typeof Linkedin;
  label: string;
  sub: string;
  href: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 p-3 rounded-lg border border-black/5 hover:border-[color:var(--brand-blue)]/40 hover:bg-[color:var(--brand-blue)]/5 transition-colors group"
    >
      <span className="bg-[color:var(--brand-blue)] text-white p-2 rounded-md flex-shrink-0">
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-foreground">{label}</span>
        <span className="block text-xs text-muted-foreground truncate">{sub}</span>
      </span>
      <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-[color:var(--brand-blue)] flex-shrink-0" />
    </a>
  );
}

export function AuthorPage({ data }: { data: ArchivePayload }) {
  const { header, items, totalItems } = data;
  const author = header.author!;
  const display = header.title;
  const bio = author.bio;
  const social = author.social || {};
  const website = author.website;
  const email = author.email;

  const profiles: { icon: typeof Linkedin; label: string; sub: string; href: string }[] = [];
  if (social.linkedin) profiles.push({ icon: Linkedin, label: "LinkedIn", sub: handleFromUrl(social.linkedin, "/in/"), href: social.linkedin });
  if (social.twitter) profiles.push({ icon: Twitter, label: "X (Twitter)", sub: handleFromUrl(social.twitter, "@"), href: social.twitter });
  if (social.facebook) profiles.push({ icon: Facebook, label: "Facebook", sub: handleFromUrl(social.facebook, "/"), href: social.facebook });
  if (social.instagram) profiles.push({ icon: Instagram, label: "Instagram", sub: handleFromUrl(social.instagram, "@"), href: social.instagram });
  if (website) profiles.push({ icon: Globe, label: "Website", sub: hostname(website) || website, href: website });

  const hasSidebar = profiles.length > 0 || !!email;

  return (
    <SiteLayout>
      {/* Hero with overlapping profile card — name only, no bio duplication */}
      <section className="relative bg-gradient-to-br from-[color:var(--ink)] via-[color:var(--ink)] to-[oklch(0.32_0.18_270)] text-white">
        <div className="mx-auto max-w-7xl px-6 pt-10 pb-32 md:pb-40">
          <nav className="text-xs text-white/60 mb-6 flex items-center gap-2">
            <Link to="/" className="hover:text-white">HOME</Link>
            <span>/</span>
            <span className="text-white/80">CONTRIBUTORS</span>
            <span>/</span>
            <span className="text-white uppercase tracking-wider">{display}</span>
          </nav>
          <h1 className="font-serif text-5xl md:text-6xl font-bold tracking-tight">
            {display}
          </h1>
        </div>
        <div className="h-1 bg-[color:var(--brand-blue)]" />
      </section>

      <section className="bg-surface-soft">
        <div className="mx-auto max-w-7xl px-6 -mt-24 md:-mt-28 relative z-10 pb-10">
          <div className="bg-white rounded-2xl shadow-2xl border border-black/5 p-6 md:p-8 grid grid-cols-1 md:grid-cols-[auto_1fr_auto] gap-6 md:gap-10 items-center">
            <div className="relative">
              {author.avatar_url ? (
                <img
                  src={author.avatar_url}
                  alt={display}
                  className="w-32 h-32 md:w-40 md:h-40 rounded-full object-cover ring-4 ring-[color:var(--brand-blue)]/15"
                />
              ) : (
                <div className="w-32 h-32 md:w-40 md:h-40 rounded-full bg-gradient-to-br from-[color:var(--brand-blue)] to-[color:var(--ink)] text-white flex items-center justify-center text-4xl font-bold ring-4 ring-[color:var(--brand-blue)]/15">
                  {initials(display)}
                </div>
              )}
              <div className="absolute -bottom-1 -right-1 bg-[color:var(--brand-blue)] text-white rounded-full p-1.5 ring-4 ring-white">
                <BadgeCheck className="h-5 w-5" />
              </div>
            </div>

            <div className="min-w-0">
              <p className="text-sm text-muted-foreground">
                Contributor · <span className="text-[color:var(--brand-blue)] font-semibold">Everything-PR</span>
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                <span className="text-[11px] font-semibold uppercase tracking-wider bg-[color:var(--brand-blue)] text-white px-3 py-1.5 rounded">
                  Contributor
                </span>
                <span className="text-[11px] font-semibold uppercase tracking-wider bg-black/5 text-foreground px-3 py-1.5 rounded">
                  PR
                </span>
                <span className="text-[11px] font-semibold uppercase tracking-wider bg-black/5 text-foreground px-3 py-1.5 rounded">
                  Editorial
                </span>
                <span className="text-[11px] font-semibold uppercase tracking-wider bg-black/5 text-foreground px-3 py-1.5 rounded">
                  Communications
                </span>
              </div>
            </div>

            <div className="border-l border-black/10 pl-6 hidden md:block">
              <div className="text-4xl font-bold text-[color:var(--brand-blue)]">{totalItems}+</div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground mt-1">
                Articles Published
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Bio + sidebar */}
      <section className={`mx-auto max-w-7xl px-6 grid grid-cols-1 ${hasSidebar ? "lg:grid-cols-3" : ""} gap-8 pb-12`}>
        <div className={hasSidebar ? "lg:col-span-2" : ""}>
          {bio ? (
            <div className="border-l-4 border-[color:var(--brand-blue)] pl-5">
              <h3 className="font-serif text-2xl font-bold mb-4">About {display.split(" ")[0]}</h3>
              <div
                className="prose-article text-foreground"
                dangerouslySetInnerHTML={{ __html: bio }}
              />
            </div>
          ) : (
            <div className="border-l-4 border-[color:var(--brand-blue)] pl-5">
              <h3 className="font-serif text-2xl font-bold mb-3">About {display.split(" ")[0]}</h3>
              <p className="text-muted-foreground">
                {display} is a contributing writer at Everything-PR, covering the latest in
                public relations, marketing, and communications across industries.
              </p>
            </div>
          )}
        </div>
        {hasSidebar ? (
          <aside className="lg:col-span-1">
            <div className="bg-white rounded-xl border border-black/5 shadow-card p-6">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] border-b border-black/10 pb-3 mb-4">
                <BadgeCheck className="h-4 w-4 text-[color:var(--brand-blue)]" />
                <span>Verified Profiles</span>
              </div>
              {profiles.length > 0 ? (
                <div className="space-y-2">
                  {profiles.map((p) => (
                    <ProfileLink key={p.label} {...p} />
                  ))}
                </div>
              ) : null}
              {email ? (
                <a
                  href={`mailto:${email}`}
                  className="flex items-center gap-3 p-3 mt-2 rounded-lg border border-black/5 hover:border-[color:var(--brand-blue)]/40 hover:bg-[color:var(--brand-blue)]/5 transition-colors"
                >
                  <span className="bg-[color:var(--ink)] text-white p-2 rounded-md flex-shrink-0">
                    <Mail className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-foreground">Email</span>
                    <span className="block text-xs text-muted-foreground truncate">{email}</span>
                  </span>
                </a>
              ) : null}
            </div>
          </aside>
        ) : null}
      </section>

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
