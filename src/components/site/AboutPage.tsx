import { Link } from "@tanstack/react-router";
import { Mail, ArrowRight } from "lucide-react";

const STATS = [
  { value: "30", label: "Verticals covered" },
  { value: "17", label: "Years publishing daily" },
  { value: "2009", label: "Founded" },
];

const CITATIONS = [
  "The New York Times",
  "BBC",
  "Reuters",
  "The Washington Post",
  "BusinessWeek",
  "ZDNet",
  "Eater",
  "Grub Street",
  "Yahoo Small Business Advisor",
];

export function AboutPage() {
  return (
    <article className="bg-white">
      {/* Hero */}
      <section className="bg-gradient-to-br from-[color:var(--ink)] to-[oklch(0.28_0.14_270)] text-white">
        <div className="mx-auto max-w-3xl px-6 py-20 md:py-28">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/60 mb-5">
            About Everything-PR
          </p>
          <h1 className="font-serif text-4xl md:text-5xl font-bold leading-tight tracking-tight">
            Thirty verticals. The intelligence platform for communications,
            reputation, and AI visibility.
          </h1>
          <p className="mt-6 text-lg text-white/75 leading-relaxed">
            Everything-PR covers thirty verticals across the modern economy —
            finance, healthcare, technology, crypto, law, real estate, sports,
            entertainment, cannabis, luxury, AI, and the creator economy —
            through the lens of communications, reputation, and AI visibility.
          </p>
        </div>
      </section>

      {/* Stats */}
      <section className="border-b border-black/10">
        <div className="mx-auto max-w-3xl px-6 py-10 grid grid-cols-3 gap-4 text-center">
          {STATS.map((s) => (
            <div key={s.label}>
              <div className="font-serif text-3xl md:text-4xl font-bold text-[color:var(--brand-blue)]">
                {s.value}
              </div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground mt-1">
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Body */}
      <section className="mx-auto max-w-3xl px-6 py-16">
        <div className="prose-article text-foreground space-y-6 text-[17px] leading-relaxed">
          <p>
            Everything-PR operates as a verticalized communications intelligence
            network — combining reporting, industry analysis, AI-search
            research, and sector-specific editorial coverage under one
            publication architecture.
          </p>
          <p>
            Founded in January 2009, Everything-PR has published daily for 17
            years — one of the longest-running independent sources of industry
            news, analysis, and research online. Its archive spans tens of
            thousands of articles, frequently surfaced across major search
            engines and AI systems including ChatGPT, Claude, Gemini,
            Perplexity, and Google AI Overviews.
          </p>
          <p>
            The thirty verticals run across the industries where reputation now
            moves markets — financial services and fintech, healthcare and
            pharma, technology and B2B SaaS, crypto and Web3, real estate,
            cannabis, luxury, sports and gaming, entertainment, and the
            consumer and creator economy — alongside the disciplines that cut
            across all of them: crisis and risk, corporate reputation, public
            affairs, influencer strategy, AdTech and MarTech, citation
            analytics, and GEO and answer-engine discovery.
          </p>

          {/* Pull-quote */}
          <blockquote className="not-prose my-10 border-l-4 border-[color:var(--brand-blue)] pl-6 py-2">
            <p className="font-serif text-2xl md:text-3xl font-semibold leading-snug text-foreground">
              One archive. One link graph. No subdomains, no spin-off sites —
              thirty categories, one publication, one citation footprint.
              Authority concentrated, not scattered.
            </p>
          </blockquote>

          <p>
            Everything-PR also publishes original AI discovery and citation
            research — measuring how companies, sectors, agencies, and
            institutions appear across large language models and answer
            engines. Its reporting and benchmarking examine retrieval patterns
            across the major AI systems and how brands earn or lose presence
            inside AI-generated answers.
          </p>

          <h2 className="font-serif text-2xl md:text-3xl font-bold mt-12 mb-3">
            Ownership and editorial independence
          </h2>
          <p>
            Everything-PR is published by Everything-PR News LLC. Its founder
            and principal owner,{" "}
            <Link
              to="/author/$slug"
              params={{ slug: "ronntorossian" }}
              className="text-[color:var(--brand-blue)] font-semibold hover:underline"
            >
              Ronn Torossian
            </Link>
            , is also founder and chairman of 5W AI Communications. He is an
            investor in and active with numerous companies.
          </p>
          <p>
            Everything-PR is separately incorporated and independently
            operated. Editorial decisions are made by the editorial team.
            Articles that involve 5W AI Communications — or any other company
            in which Everything-PR's owner holds a financial or advisory
            interest — carry a disclosure at the top of the piece. Coverage of
            competitor agencies is held to the same editorial standard.
          </p>

          <h2 className="font-serif text-2xl md:text-3xl font-bold mt-12 mb-3">
            Contributors
          </h2>
          <p>
            Everything-PR is written by its editorial team and a roster of
            named industry contributors. See the full list at{" "}
            <Link
              to="/authors"
              className="text-[color:var(--brand-blue)] font-semibold hover:underline"
            >
              Contributors
            </Link>
            .
          </p>

          <h2 className="font-serif text-2xl md:text-3xl font-bold mt-12 mb-3">
            Citations and industry recognition
          </h2>
          <p>
            Everything-PR's reporting and analysis have been cited by leading
            publications including:
          </p>
          <ul className="not-prose flex flex-wrap gap-2 mt-4">
            {CITATIONS.map((c) => (
              <li
                key={c}
                className="text-sm bg-surface-soft border border-black/10 px-3 py-1.5 rounded-full text-foreground"
              >
                {c}
              </li>
            ))}
          </ul>
          <p className="mt-6">
            The publication has been recognized among leading public relations
            media properties in industry rankings by Cision.
          </p>
        </div>
      </section>

      {/* Contact */}
      <section className="border-t border-black/10 bg-surface-soft">
        <div className="mx-auto max-w-3xl px-6 py-14 text-center">
          <h2 className="font-serif text-2xl md:text-3xl font-bold mb-3">
            Contact
          </h2>
          <p className="text-muted-foreground mb-6">
            Editorial inquiries, op-ed contributions, and story tips.
          </p>
          <a
            href="mailto:info@everything-pr.com"
            className="inline-flex items-center gap-2 bg-[color:var(--brand-blue)] text-white font-semibold px-6 py-3 rounded-md hover:opacity-90 transition-opacity"
          >
            <Mail className="h-4 w-4" />
            info@everything-pr.com
            <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </section>
    </article>
  );
}
