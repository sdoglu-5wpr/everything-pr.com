import { Link } from "@tanstack/react-router";
import { ArrowRight, BadgeCheck, Linkedin, Twitter, Globe, Facebook, Instagram, Search, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { SiteLayout } from "./SiteLayout";
import type { AuthorListItem } from "@/serverFns/authors.functions";

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function hasRealAvatar(a: AuthorListItem) {
  return !!a.avatar_url && !/d=blank/i.test(a.avatar_url);
}

function SocialIcons({ author }: { author: AuthorListItem }) {
  const s = author.social || {};
  const items: { icon: typeof Linkedin; href: string; label: string }[] = [];
  if (s.linkedin) items.push({ icon: Linkedin, href: s.linkedin, label: "LinkedIn" });
  if (s.twitter) items.push({ icon: Twitter, href: s.twitter, label: "Twitter" });
  if (s.facebook) items.push({ icon: Facebook, href: s.facebook, label: "Facebook" });
  if (s.instagram) items.push({ icon: Instagram, href: s.instagram, label: "Instagram" });
  if (author.website) items.push({ icon: Globe, href: author.website, label: "Website" });
  if (items.length === 0) return null;
  return (
    <div className="flex items-center gap-1.5">
      {items.slice(0, 4).map((it) => (
        <a
          key={it.label}
          href={it.href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={it.label}
          onClick={(e) => e.stopPropagation()}
          className="p-1.5 rounded-md text-muted-foreground hover:text-[color:var(--brand-blue)] hover:bg-[color:var(--brand-blue)]/10 transition-colors"
        >
          <it.icon className="h-3.5 w-3.5" />
        </a>
      ))}
    </div>
  );
}

function AuthorCard({ author, featured }: { author: AuthorListItem; featured?: boolean }) {
  const role = author.tags?.[0] || "Publisher";
  return (
    <Link
      to="/author/$slug"
      params={{ slug: author.slug }}
      className={`group relative bg-white border border-black/5 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all flex flex-col ${
        featured ? "ring-1 ring-[color:var(--brand-blue)]/20" : ""
      }`}
    >
      <div className="h-20 bg-gradient-to-br from-[color:var(--ink)] via-[color:var(--ink)] to-[oklch(0.32_0.18_270)]" />
      <div className="px-6 pb-6 -mt-12 flex flex-col flex-1">
        <div className="relative self-start">
          {author.avatar_url ? (
            <img
              src={author.avatar_url}
              alt={author.display_name}
              loading="lazy"
              className="w-24 h-24 rounded-full object-cover ring-4 ring-white bg-muted"
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[color:var(--brand-blue)] to-[color:var(--ink)] text-white flex items-center justify-center text-2xl font-bold ring-4 ring-white">
              {initials(author.display_name)}
            </div>
          )}
          <div className="absolute -bottom-0.5 -right-0.5 bg-[color:var(--brand-blue)] text-white rounded-full p-1 ring-2 ring-white">
            <BadgeCheck className="h-3.5 w-3.5" />
          </div>
        </div>

        <div className="mt-4 flex-1 flex flex-col">
          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[color:var(--brand-blue)]">
            {role}
          </span>
          <h3 className="mt-1 font-serif text-xl font-bold leading-tight text-foreground group-hover:text-[color:var(--brand-blue)] transition-colors">
            {author.display_name}
          </h3>
          {author.job_title ? (
            <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{author.job_title}</p>
          ) : null}
          {author.bio ? (
            <p className="mt-3 text-sm text-muted-foreground line-clamp-3 leading-relaxed">{author.bio}</p>
          ) : null}

          <div className="mt-auto pt-4 flex items-center justify-between border-t border-black/5">
            <div className="text-xs">
              <span className="font-bold text-foreground">{author.post_count}</span>
              <span className="text-muted-foreground"> article{author.post_count === 1 ? "" : "s"}</span>
            </div>
            <SocialIcons author={author} />
          </div>
          <div className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[color:var(--brand-blue)] opacity-0 group-hover:opacity-100 group-hover:gap-2 transition-all">
            View profile <ArrowRight className="h-3.5 w-3.5" />
          </div>
        </div>
      </div>
    </Link>
  );
}

// Curated display order — by author id
const PRIORITY_IDS: number[] = [
  1052,  // EPR Editorial Team
  6,     // Ronn Torossian
  4750,  // EPR Staff
  20548, // Seth Semilof
  20559, // Kyle Porter
  20560, // Kevin Mercuri
  20564, // Alex Shvarts
  5,     // David A. Steinberg
];
const FEATURED_IDS: number[] = [6, 20548, 20560]; // Ronn, Seth, Kevin
const PRIORITY_SET = new Set(PRIORITY_IDS);
const FEATURED_SET = new Set(FEATURED_IDS);

export function AuthorsIndex({ authors }: { authors: AuthorListItem[] }) {
  const [q, setQ] = useState("");

  const { withAvatar, withoutAvatar, featured, total } = useMemo(() => {
    const needle = q.trim().toLowerCase();
    // Hide authors with 0 articles unless they're in the curated priority list
    const visible = authors.filter((a) => a.post_count > 0 || PRIORITY_SET.has(a.id));
    const filtered = needle
      ? visible.filter(
          (a) =>
            a.display_name.toLowerCase().includes(needle) ||
            (a.job_title ?? "").toLowerCase().includes(needle) ||
            (a.bio ?? "").toLowerCase().includes(needle),
        )
      : visible;

    const byId = new Map(filtered.map((a) => [a.id, a]));
    const priorityOrdered = PRIORITY_IDS.map((id) => byId.get(id)).filter(Boolean) as AuthorListItem[];
    const rest = filtered.filter((a) => !PRIORITY_SET.has(a.id));

    const featuredList = FEATURED_IDS
      .map((id) => byId.get(id))
      .filter(Boolean) as AuthorListItem[];

    // All cards (priority first, then the rest with avatars), excluding featured from main grid when not searching
    const mainPriority = q ? priorityOrdered : priorityOrdered.filter((a) => !FEATURED_SET.has(a.id));
    const restWithAvatar = rest.filter(hasRealAvatar);
    const allWithAvatar = [...mainPriority, ...restWithAvatar];

    return {
      withAvatar: allWithAvatar,
      withoutAvatar: rest.filter((a) => !hasRealAvatar(a)),
      featured: featuredList,
      total: visible.length,
    };
  }, [authors, q]);

  const restWithAvatar = withAvatar;

  return (
    <SiteLayout>
      {/* Hero */}
      <section className="relative bg-gradient-to-br from-[color:var(--ink)] via-[color:var(--ink)] to-[oklch(0.32_0.18_270)] text-white overflow-hidden">
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_20%_20%,white,transparent_40%),radial-gradient(circle_at_80%_60%,var(--brand-blue),transparent_45%)]" />
        <div className="relative mx-auto max-w-7xl px-6 pt-16 pb-20">
          <nav className="text-xs text-white/60 mb-6 flex items-center gap-2">
            <Link to="/" className="hover:text-white">HOME</Link>
            <span>/</span>
            <span className="text-white uppercase tracking-wider">Contributors</span>
          </nav>
          <div className="flex items-center gap-3 mb-4">
            <span className="inline-flex items-center gap-1.5 bg-white/10 backdrop-blur-sm border border-white/15 text-white/90 text-[10px] font-bold uppercase tracking-[0.18em] px-3 py-1.5 rounded-full">
              <Users className="h-3.5 w-3.5" /> {total} Contributors
            </span>
          </div>
          <h1 className="font-serif text-5xl md:text-6xl font-bold tracking-tight max-w-3xl">
            The voices behind <span className="text-[color:var(--brand-blue)]">Everything-PR</span>
          </h1>
          <p className="mt-5 text-lg text-white/70 max-w-2xl">
            Reporters, analysts, and industry leaders covering communications, reputation, AI visibility, public
            affairs, and the answer-engine era.
          </p>

          <div className="mt-8 max-w-xl relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50" />
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by name, title, or topic…"
              className="w-full bg-white/10 backdrop-blur-sm border border-white/15 rounded-full pl-11 pr-4 py-3 text-sm text-white placeholder-white/50 focus:outline-none focus:border-white/40 focus:bg-white/15"
            />
          </div>
        </div>
        <div className="h-1 bg-[color:var(--brand-blue)]" />
      </section>

      {/* Featured publishers (top 3 with avatars) */}
      {featured.length > 0 && !q ? (
        <section className="bg-surface-soft border-b border-black/5">
          <div className="mx-auto max-w-7xl px-6 py-12">
            <div className="flex items-end justify-between mb-6">
              <div>
                <div className="w-10 h-1 bg-[color:var(--brand-blue)] mb-3" />
                <h2 className="font-serif text-2xl md:text-3xl font-bold">Featured</h2>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {featured.map((a) => (
                <AuthorCard key={a.id} author={a} featured />
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* All contributors */}
      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-6 py-12">
          <div className="flex items-end justify-between mb-6 border-b border-black/10 pb-4">
            <div>
              <div className="w-10 h-1 bg-[color:var(--brand-blue)] mb-3" />
              <h2 className="font-serif text-2xl md:text-3xl font-bold">
                {q ? "Search results" : "All contributors"}
              </h2>
            </div>
            <div className="text-sm text-muted-foreground hidden md:block">
              {withAvatar.length + withoutAvatar.length} result{withAvatar.length + withoutAvatar.length === 1 ? "" : "s"}
            </div>
          </div>

          {restWithAvatar.length === 0 && withoutAvatar.length === 0 ? (
            <div className="py-20 text-center text-muted-foreground">No contributors match your search.</div>
          ) : (
            <>
              {(q ? withAvatar : restWithAvatar).length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {(q ? withAvatar : restWithAvatar).map((a) => (
                    <AuthorCard key={a.id} author={a} />
                  ))}
                </div>
              ) : null}

              {withoutAvatar.length > 0 ? (
                <div className="mt-12">
                  <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground mb-4">
                    More contributors
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                    {withoutAvatar.map((a) => (
                      <Link
                        key={a.id}
                        to="/author/$slug"
                        params={{ slug: a.slug }}
                        className="group flex items-center gap-3 p-3 rounded-lg border border-black/5 hover:border-[color:var(--brand-blue)]/40 hover:bg-[color:var(--brand-blue)]/5 transition-colors"
                      >
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[color:var(--brand-blue)] to-[color:var(--ink)] text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                          {initials(a.display_name)}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-foreground truncate group-hover:text-[color:var(--brand-blue)]">
                            {a.display_name}
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            {a.post_count} article{a.post_count === 1 ? "" : "s"}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              ) : null}
            </>
          )}
        </div>
      </section>
    </SiteLayout>
  );
}
