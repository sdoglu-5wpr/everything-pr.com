import { ArrowRight } from "lucide-react";

export function About5WBoilerplate() {
  return (
    <aside className="mt-10 rounded-xl border bg-surface-soft p-6 md:p-7">
      <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-brand-blue mb-2">About 5W</h3>
      <p className="text-sm md:text-[15px] text-foreground/85 leading-relaxed">
        5W is the AI Communications Firm, building brand authority across the platforms where decisions now happen — ChatGPT, Claude, Perplexity, Gemini, and Google AI Overviews — alongside earned media, digital, GEO, and influencer channels.{" "}
        <a
          href="https://www.5wpr.com/?utm_source=epr&utm_medium=article_boilerplate&utm_campaign=about_5w"
          target="_blank"
          rel="noopener noreferrer sponsored"
          className="underline font-semibold hover:text-brand-blue"
        >
          www.5wpr.com
        </a>
      </p>
    </aside>
  );
}

export function Work5WCTA() {
  return (
    <div className="mt-8 rounded-xl bg-ink text-ink-foreground p-6 md:p-7 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
      <p className="font-serif text-lg md:text-xl font-bold text-white">
        Want this for your brand?
      </p>
      <a
        href="https://www.5wpr.com/contact/?utm_source=epr&utm_medium=article_cta&utm_campaign=work_with_5w"
        target="_blank"
        rel="noopener noreferrer sponsored"
        className="inline-flex items-center gap-2 rounded-md bg-brand-red px-5 py-3 text-sm font-semibold text-white hover:opacity-90 transition-opacity self-start md:self-auto"
      >
        Work with 5W <ArrowRight className="w-4 h-4" />
      </a>
    </div>
  );
}

const RESEARCH_ITEMS = [
  {
    title: "AI Visibility Index",
    desc: "Where brands rank inside ChatGPT, Claude, Perplexity and Gemini answers.",
    href: "https://www.5wpr.com/new/research/ai-visibility-index/?utm_source=epr&utm_medium=article_research&utm_campaign=ai_visibility_index",
  },
  {
    title: "The GEO Reckoning",
    desc: "Why generative engine optimization is rewriting the rules of earned media.",
    href: "https://www.5wpr.com/new/research/geo-reckoning/?utm_source=epr&utm_medium=article_research&utm_campaign=geo_reckoning",
  },
  {
    title: "The Missing Rung Report",
    desc: "Where today's brands disappear from the AI buyer journey — and how to recover.",
    href: "https://www.5wpr.com/new/research/missing-rung-report/?utm_source=epr&utm_medium=article_research&utm_campaign=missing_rung_report",
  },
];

export function Related5WResearch({ slug }: { slug?: string }) {
  // Pick the closest research drop based on simple keyword matching
  const s = (slug ?? "").toLowerCase();
  let primary = RESEARCH_ITEMS[0];
  if (/(geo|generative|search)/.test(s)) primary = RESEARCH_ITEMS[1];
  else if (/(missing|funnel|buyer|journey|invisible)/.test(s)) primary = RESEARCH_ITEMS[2];
  const others = RESEARCH_ITEMS.filter((r) => r !== primary);

  return (
    <section className="mt-10 rounded-xl border bg-white p-6 md:p-7">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-brand-red">Related 5W Research</h3>
        <a
          href="https://www.5wpr.com/new/research/?utm_source=epr&utm_medium=article_research&utm_campaign=research_index"
          target="_blank"
          rel="noopener noreferrer sponsored"
          className="text-xs font-semibold text-brand-blue hover:underline inline-flex items-center gap-1"
        >
          All research <ArrowRight className="w-3.5 h-3.5" />
        </a>
      </div>
      <a
        href={primary.href}
        target="_blank"
        rel="noopener noreferrer sponsored"
        className="block rounded-lg border bg-surface-soft p-5 hover:border-brand-blue transition-colors"
      >
        <p className="font-serif font-bold text-lg">{primary.title}</p>
        <p className="mt-1 text-sm text-muted-foreground">{primary.desc}</p>
      </a>
      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
        {others.map((r) => (
          <a
            key={r.title}
            href={r.href}
            target="_blank"
            rel="noopener noreferrer sponsored"
            className="block rounded-lg border p-4 hover:border-brand-blue transition-colors"
          >
            <p className="font-semibold text-sm">{r.title}</p>
            <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{r.desc}</p>
          </a>
        ))}
      </div>
    </section>
  );
}
