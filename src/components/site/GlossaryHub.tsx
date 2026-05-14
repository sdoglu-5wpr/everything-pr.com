import { Link } from "@tanstack/react-router";
import {
  GLOSSARY_CATEGORIES,
  GLOSSARY_LETTERS,
  FEATURED_SLUGS,
  firstLetter,
  type GlossaryTerm,
} from "@/lib/glossary.shared";

export function GlossaryHub({ terms }: { terms: GlossaryTerm[] }) {
  const bySlug = new Map(terms.map((t) => [t.slug, t]));
  const byCategory = new Map<string, GlossaryTerm[]>();
  for (const t of terms) {
    const k = t.category || "other";
    const arr = byCategory.get(k) ?? [];
    arr.push(t);
    byCategory.set(k, arr);
  }
  for (const arr of byCategory.values()) arr.sort((a, b) => a.title.localeCompare(b.title));

  const byLetter = new Map<string, GlossaryTerm[]>();
  for (const t of terms) {
    const l = firstLetter(t.title);
    const arr = byLetter.get(l) ?? [];
    arr.push(t);
    byLetter.set(l, arr);
  }
  for (const arr of byLetter.values()) arr.sort((a, b) => a.title.localeCompare(b.title));

  const featured = FEATURED_SLUGS.map((s) => bySlug.get(s)).filter((t): t is GlossaryTerm => Boolean(t));

  return (
    <article className="bg-background">
      <div className="mx-auto max-w-5xl px-6 py-16 md:py-20">
        <header>
          <h1 className="font-serif text-4xl md:text-5xl font-bold tracking-tight leading-tight">Glossary</h1>
          <p className="mt-6 text-lg md:text-xl font-serif text-foreground leading-snug">
            The communications and marketing industry runs on its own vocabulary — and that vocabulary is changing
            faster than the textbooks can keep up.
          </p>
          <p className="mt-4 text-[1.0625rem] leading-[1.75] text-muted-foreground">
            This glossary is Everything-PR's reference index for the terms that define how reputation, visibility,
            disclosure, and authority work in 2026. Each entry is short enough to scan and structured enough to cite.
          </p>
        </header>

        {/* Browse by Letter */}
        <section className="mt-12">
          <h2 className="font-serif text-2xl md:text-3xl font-bold tracking-tight">Browse by Letter</h2>
          <nav aria-label="Browse by letter" className="mt-4 flex flex-wrap gap-2">
            {GLOSSARY_LETTERS.map((l) => {
              const has = byLetter.has(l);
              return (
                <a
                  key={l}
                  href={has ? `#letter-${l}` : undefined}
                  aria-disabled={!has}
                  className={
                    has
                      ? "px-3 py-1.5 rounded border border-border text-sm font-semibold text-brand-blue hover:bg-muted"
                      : "px-3 py-1.5 rounded border border-border text-sm text-muted-foreground/50 pointer-events-none"
                  }
                >
                  {l}
                </a>
              );
            })}
          </nav>
        </section>

        {/* Browse by Category */}
        <section className="mt-12">
          <h2 className="font-serif text-2xl md:text-3xl font-bold tracking-tight">Browse by Category</h2>
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8">
            {GLOSSARY_CATEGORIES.map((c) => {
              const items = byCategory.get(c.key) ?? [];
              if (!items.length) return null;
              return (
                <div key={c.key}>
                  <h3 className="font-serif text-xl font-bold">{c.label}</h3>
                  <ul className="mt-2 text-[0.95rem] leading-[1.7]">
                    {items.map((t, i) => (
                      <li key={t.slug} className="inline">
                        <Link to="/glossary/$slug" params={{ slug: t.slug }} className="text-brand-blue hover:underline">
                          {t.title}
                        </Link>
                        {i < items.length - 1 ? <span className="text-muted-foreground">, </span> : null}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </section>

        {/* Featured Terms */}
        {featured.length > 0 ? (
          <section className="mt-12">
            <h2 className="font-serif text-2xl md:text-3xl font-bold tracking-tight">Featured Terms</h2>
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {featured.map((t) => (
                <Link
                  key={t.slug}
                  to="/glossary/$slug"
                  params={{ slug: t.slug }}
                  className="block rounded border border-border bg-card p-4 hover:border-brand-blue transition-colors"
                >
                  <div className="font-serif text-lg font-bold leading-tight">{t.title}</div>
                  <p className="mt-2 text-sm text-muted-foreground leading-snug line-clamp-4">{t.short_definition}</p>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        {/* All Entries — Alphabetical */}
        <section className="mt-12">
          <h2 className="font-serif text-2xl md:text-3xl font-bold tracking-tight">All Entries</h2>
          <div className="mt-6 space-y-8">
            {GLOSSARY_LETTERS.filter((l) => byLetter.has(l)).map((l) => (
              <div key={l} id={`letter-${l}`}>
                <h3 className="font-serif text-2xl font-bold border-b border-border pb-2">{l}</h3>
                <ul className="mt-3 space-y-2">
                  {(byLetter.get(l) ?? []).map((t) => (
                    <li key={t.slug} className="text-[1.0625rem]">
                      <Link to="/glossary/$slug" params={{ slug: t.slug }} className="font-semibold text-brand-blue hover:underline">
                        {t.title}
                      </Link>
                      <span className="text-muted-foreground"> — {t.short_definition}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      </div>
    </article>
  );
}
