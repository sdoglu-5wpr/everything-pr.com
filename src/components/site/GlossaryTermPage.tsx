import { Link } from "@tanstack/react-router";
import type { GlossaryTerm } from "@/lib/glossary.shared";

export function GlossaryTermPage({ term }: { term: GlossaryTerm }) {
  return (
    <article className="bg-background">
      <div className="mx-auto max-w-3xl px-6 py-16 md:py-20">
        <header>
          <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
            <Link to="/" className="hover:underline">Home</Link>
            <span className="mx-2">›</span>
            <Link to="/glossary" className="hover:underline">Glossary</Link>
            <span className="mx-2">›</span>
            <span className="text-foreground">{term.title}</span>
          </nav>
          <h1 className="mt-4 font-serif text-4xl md:text-5xl font-bold tracking-tight leading-tight">
            {term.title}
          </h1>
        </header>

        <section className="mt-8 text-xl md:text-2xl font-serif text-foreground leading-snug">
          {term.short_definition}
        </section>

        {term.extended_html ? (
          <section
            className="mt-6 prose prose-neutral max-w-none text-[1.0625rem] leading-[1.75]"
            dangerouslySetInnerHTML={{ __html: term.extended_html }}
          />
        ) : null}

        {(term.where_used?.length ?? 0) > 0 ? (
          <section className="mt-12">
            <h2 className="font-serif text-2xl font-bold tracking-tight">Where it's used</h2>
            <ul className="mt-3 list-disc pl-6 space-y-1 text-[1.0625rem]">
              {term.where_used.map((l, i) => (
                <li key={`${l.url || l.slug}-${i}`}>
                  {l.url ? (
                    <a href={l.url} className="text-brand-blue hover:underline">{l.label}</a>
                  ) : (
                    <span>{l.label}</span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {(term.related_terms?.length ?? 0) > 0 ? (
          <section className="mt-10">
            <h2 className="font-serif text-2xl font-bold tracking-tight">Related terms</h2>
            <ul className="mt-3 list-disc pl-6 space-y-1 text-[1.0625rem]">
              {term.related_terms.map((l, i) => (
                <li key={`${l.slug || l.url}-${i}`}>
                  {l.slug ? (
                    <Link to="/glossary/$slug" params={{ slug: l.slug }} className="text-brand-blue hover:underline">
                      {l.label}
                    </Link>
                  ) : l.url ? (
                    <a href={l.url} className="text-brand-blue hover:underline">{l.label}</a>
                  ) : (
                    <span>{l.label}</span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <div className="mt-12 pt-6 border-t border-border text-sm">
          <Link to="/glossary" className="text-brand-blue hover:underline">← Back to Glossary</Link>
        </div>
      </div>
    </article>
  );
}
