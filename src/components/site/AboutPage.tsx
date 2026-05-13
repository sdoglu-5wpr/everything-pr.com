import { Link } from "@tanstack/react-router";
import { Mail, Award, Users, BookOpen, Shield } from "lucide-react";
import teamPhoto from "@/assets/about-team.jpg";
import { InlineNewsletter } from "@/components/site/InlineNewsletter";

export function AboutPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative bg-gradient-to-b from-foreground to-foreground/95 text-white overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--brand-blue)_0%,_transparent_50%)] opacity-20" />
        <div className="relative mx-auto max-w-4xl px-6 py-20 md:py-28">
          <div className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-white/60 mb-6">
            <span className="w-8 h-px bg-white/40" /> About Everything-PR
          </div>
          <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.05]">
            The AI-era intelligence platform for public relations and communications.
          </h1>
          <p className="mt-6 text-lg md:text-xl text-white/75 leading-relaxed max-w-2xl">
            Founded in January 2009. Published continuously for 17 years — one of the longest-running independent sources of PR news, analysis, and industry intelligence available online.
          </p>

          {/* Stats strip */}
          <dl className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl">
            {[
              { k: "17+", v: "Years publishing" },
              { k: "10K+", v: "Articles indexed" },
              { k: "Daily", v: "Editorial cadence" },
              { k: "Global", v: "AI search reach" },
            ].map((s) => (
              <div key={s.v}>
                <dt className="font-serif text-3xl md:text-4xl font-bold text-white">{s.k}</dt>
                <dd className="mt-1 text-xs uppercase tracking-wider text-white/60">{s.v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Team photo */}
      <section className="bg-background">
        <div className="mx-auto max-w-4xl px-6 -mt-12 md:-mt-16">
          <figure className="overflow-hidden rounded-xl shadow-2xl ring-1 ring-black/5">
            <img
              src={teamPhoto}
              alt="The Everything-PR editorial team"
              width={1600}
              height={1024}
              className="w-full h-auto object-cover"
              loading="eager"
            />
          </figure>
        </div>
      </section>

      {/* Intro / mission */}
      <section className="bg-background">
        <div className="mx-auto max-w-3xl px-6 py-16 md:py-20">
          <p className="font-serif text-2xl md:text-3xl leading-snug text-foreground tracking-tight">
            Everything-PR covers the full spectrum of communications and marketing — from agency news and crisis PR to AI search visibility and the strategic forces reshaping how the industry is practiced.
          </p>

          <div className="mt-10 space-y-5 text-[1.0625rem] leading-[1.75] text-muted-foreground">
            <p>
              The archive spans tens of thousands of articles indexed across every major search engine and AI model — including ChatGPT, Claude, Perplexity, Gemini, and Google AI Overviews.
            </p>
            <p>
              Our coverage areas include PR agency news and account wins, brand communications strategy, crisis PR and reputation management, digital marketing and social media, influencer strategy, Generative Engine Optimization (GEO), industry research and citation analytics, executive appointments, RFPs and new business intelligence.
            </p>
          </div>
        </div>
      </section>

      {/* Pillars */}
      <section className="bg-surface-soft border-y">
        <div className="mx-auto max-w-5xl px-6 py-16 md:py-20">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <div className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-brand-blue mb-3">
              <span className="w-8 h-px bg-brand-blue/40" /> What we stand for
            </div>
            <h2 className="font-serif text-3xl md:text-4xl font-bold tracking-tight">
              Independent. Industry-native. Built for the AI era.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                Icon: Shield,
                title: "Editorial Independence",
                body: "Separately incorporated and operated. Disclosures published at the top of any article involving related entities.",
              },
              {
                Icon: BookOpen,
                title: "17 Years of Archive",
                body: "Continuous daily publishing since 2009 — one of the deepest editorial archives in the PR industry.",
              },
              {
                Icon: Award,
                title: "Cited & Recognized",
                body: "Cited by The New York Times, BBC, Reuters, The Washington Post, BusinessWeek, and ZDNet.",
              },
            ].map(({ Icon, title, body }) => (
              <div key={title} className="rounded-xl bg-background p-6 shadow-sm ring-1 ring-black/5">
                <div className="w-10 h-10 rounded-lg bg-brand-blue/10 flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5 text-brand-blue" />
                </div>
                <h3 className="font-serif text-lg font-bold text-foreground">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Ownership disclosure */}
      <section className="bg-background">
        <div className="mx-auto max-w-3xl px-6 py-16 md:py-20">
          <div className="rounded-xl border-l-4 border-brand-blue bg-surface-soft p-6 md:p-8">
            <h2 className="font-serif text-xl md:text-2xl font-bold text-foreground">
              Ownership and Editorial Independence
            </h2>
            <p className="mt-4 text-[1.0625rem] leading-[1.75] text-muted-foreground">
              Everything-PR is an independent publication, separately incorporated and operated. A principal owner of Everything-PR is also an owner of <strong className="text-foreground">5W, the AI Communications Firm</strong>. Editorial decisions are made independently. Articles involving 5W, its subsidiaries, leadership, or clients are disclosed at the top of the piece. Coverage of competitor agencies is held to the same editorial standards.
            </p>
          </div>
        </div>
      </section>

      {/* Contributors */}
      <section className="bg-background border-t">
        <div className="mx-auto max-w-3xl px-6 py-16 md:py-20">
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-brand-blue mb-3">
            <Users className="w-4 h-4" /> Contributors
          </div>
          <h2 className="font-serif text-3xl md:text-4xl font-bold tracking-tight">
            Senior practitioners. Industry voices.
          </h2>
          <p className="mt-4 text-base text-muted-foreground leading-relaxed">
            Featured contributors include senior leaders across PR, digital marketing, crisis communications, luxury, entertainment, and AI search.
          </p>

          <ul className="mt-8 divide-y divide-black/10 border-y border-black/10">
            {[
              { name: "Seth Semilof", aff: "Haute Living, Haute Media Group" },
              { name: "Kevin Mercuri", aff: "Propheta Communications, Emerson College" },
              { name: "Mike Heller", aff: "Talent Resources Collective" },
            ].map((c) => (
              <li key={c.name} className="py-4 flex items-baseline justify-between gap-6">
                <span className="font-serif text-lg font-bold text-foreground">{c.name}</span>
                <span className="text-sm text-muted-foreground text-right">{c.aff}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Citations */}
      <section className="bg-foreground text-white">
        <div className="mx-auto max-w-4xl px-6 py-16 md:py-20 text-center">
          <div className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-white/60 mb-4">
            <span className="w-8 h-px bg-white/40" /> As cited by
          </div>
          <h2 className="font-serif text-2xl md:text-3xl font-bold mb-8">Industry Recognition</h2>
          <div className="flex flex-wrap justify-center gap-x-8 gap-y-4 text-white/70 font-serif text-lg md:text-xl">
            {["The New York Times", "BBC", "Reuters", "The Washington Post", "BusinessWeek", "ZDNet", "Eater", "Yahoo"].map((p) => (
              <span key={p} className="border-b border-white/10 pb-1">{p}</span>
            ))}
          </div>
          <p className="mt-8 text-sm text-white/60 max-w-xl mx-auto">
            Recognized among leading public relations media properties in industry rankings by Cision and InkyBee.
          </p>
        </div>
      </section>

      {/* Newsletter signup */}
      <InlineNewsletter />

      {/* Contact card */}
      <section className="bg-surface-soft">
        <div className="mx-auto max-w-4xl px-6 py-16 md:py-20">
          <div className="rounded-2xl bg-foreground text-white p-8 md:p-12 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div>
              <h2 className="font-serif text-2xl md:text-3xl font-bold tracking-tight">Get in touch</h2>
              <p className="mt-3 text-white/75 leading-relaxed">
                Editorial inquiries, op-ed contributions, story tips, and corrections.
              </p>
            </div>
            <div className="rounded-xl border border-white/15 bg-white/5 p-6">
              <Mail className="w-6 h-6 text-white/70" />
              <a href="mailto:info@everything-pr.com" className="mt-2 block font-serif text-lg md:text-xl font-bold hover:underline break-all">
                info@everything-pr.com
              </a>
              <Link
                to="/contact"
                className="mt-5 inline-flex items-center justify-center w-full rounded-md bg-white text-foreground font-semibold py-3 hover:opacity-90 transition"
              >
                Contact the editorial team
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
