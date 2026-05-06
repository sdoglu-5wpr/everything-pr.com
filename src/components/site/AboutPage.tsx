import { Link } from "@tanstack/react-router";
import { Award, Newspaper, Search, Mail, BookOpen, BarChart3, Megaphone, Globe2 } from "lucide-react";
import teamPhoto from "@/assets/about-team.jpg";

const COVERAGE = [
  { icon: <Newspaper className="w-5 h-5" />, title: "PR Industry News", desc: "Agency wins, leadership changes, M&A, and major campaigns." },
  { icon: <Megaphone className="w-5 h-5" />, title: "Practice Areas", desc: "Corporate, crisis, consumer, technology, healthcare, financial services and entertainment PR." },
  { icon: <Globe2 className="w-5 h-5" />, title: "Digital & Social", desc: "Social media, influencer marketing, content marketing, SEO and Generative Engine Optimization." },
  { icon: <BarChart3 className="w-5 h-5" />, title: "Original Research", desc: "Annual studies on industry spend, salary benchmarks, and category-specific gaps." },
  { icon: <Search className="w-5 h-5" />, title: "RFPs", desc: "Daily-updated coverage of PR, marketing and social media Requests for Proposals." },
  { icon: <BookOpen className="w-5 h-5" />, title: "Editorials & Opinion", desc: "Analysis of emerging PR and marketing trends from industry practitioners." },
];

export function AboutPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative bg-gradient-to-b from-foreground to-foreground/95 text-white">
        <div className="mx-auto max-w-7xl px-6 py-20 md:py-28">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-white/60 mb-5">
              <span className="w-8 h-px bg-white/40" /> About Us
            </div>
            <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.05]">
              The leading independent publication covering the public relations industry.
            </h1>
            <p className="mt-6 text-lg md:text-xl text-white/75 leading-relaxed">
              Founded in January 2009, Everything-PR reports daily on the news, trends, research and people shaping public relations and marketing communications.
            </p>
          </div>
        </div>
      </section>

      {/* Team photo */}
      <section className="bg-background">
        <div className="mx-auto max-w-7xl px-6 -mt-12 md:-mt-16">
          <div className="overflow-hidden rounded-xl shadow-2xl ring-1 ring-black/5">
            <img
              src={teamPhoto}
              alt="The Everything-PR editorial team collaborating in a New York newsroom — diverse PR journalists and editors covering public relations industry news"
              width={1600}
              height={1024}
              className="w-full h-auto object-cover"
              loading="eager"
            />
          </div>
        </div>
      </section>

      {/* Intro */}
      <section className="bg-background">
        <div className="mx-auto max-w-4xl px-6 py-16 md:py-20">
          <div className="prose prose-lg max-w-none text-foreground">
            <p className="text-lg leading-relaxed text-muted-foreground">
              Everything-PR is the leading public relations industry news publication, covering PR news, trends, opinions, interviews, insights, research, features, and analysis across every major sector of the communications business.
            </p>
            <p className="text-lg leading-relaxed text-muted-foreground mt-5">
              Everything-PR is operated by{" "}
              <a href="https://www.5wpr.com/" target="_blank" rel="noopener noreferrer" className="text-brand-blue underline">
                5W Public Relations (5WPR)
              </a>
              , one of the largest independently owned public relations and digital marketing firms in the United States.
            </p>
          </div>
        </div>
      </section>

      {/* What we cover */}
      <section className="bg-surface-soft border-y">
        <div className="mx-auto max-w-7xl px-6 py-16 md:py-20">
          <div className="flex items-center gap-3 mb-10">
            <span className="inline-block w-3 h-3 bg-ticker" aria-hidden />
            <h2 className="font-serif text-3xl md:text-4xl font-bold">What we cover</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {COVERAGE.map((c) => (
              <div key={c.title} className="rounded-lg border bg-background p-6 hover:shadow-md transition-shadow">
                <div className="text-ticker mb-3">{c.icon}</div>
                <h3 className="font-serif text-lg font-bold text-foreground">{c.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{c.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Recognition */}
      <section className="bg-background">
        <div className="mx-auto max-w-4xl px-6 py-16 md:py-20 text-center">
          <Award className="w-10 h-10 text-ticker mx-auto" />
          <h2 className="mt-4 font-serif text-3xl md:text-4xl font-bold">Industry Recognition</h2>
          <p className="mt-5 text-lg text-muted-foreground leading-relaxed">
            Everything-PR has been recognized as a{" "}
            <a href="https://www.cision.com/" target="_blank" rel="noopener noreferrer" className="underline text-brand-blue">Cision Top 50 PR site</a>{" "}
            and an{" "}
            <a href="http://www.inkybee.com/top-60-pr-blogs/" target="_blank" rel="noopener noreferrer" className="underline text-brand-blue">InkyBee Top 60 PR blog</a>.
          </p>
        </div>
      </section>

      {/* Editorial submissions */}
      <section className="bg-foreground text-white">
        <div className="mx-auto max-w-5xl px-6 py-16 md:py-20 grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
          <div>
            <h2 className="font-serif text-3xl md:text-4xl font-bold">Editorial Submissions</h2>
            <p className="mt-5 text-white/75 leading-relaxed">
              Everything-PR welcomes original press releases and op-eds from public relations professionals, agency leaders, and communications executives. Submissions are reviewed on a rolling basis and published based on relevance, originality, and industry value.
            </p>
          </div>
          <div className="rounded-lg border border-white/15 bg-white/5 p-8">
            <Mail className="w-6 h-6 text-white/70" />
            <div className="mt-3 text-[11px] font-bold uppercase tracking-[0.2em] text-white/60">Editorial team</div>
            <a href="mailto:info@everything-pr.com" className="mt-1 block font-serif text-xl font-bold hover:underline">
              info@everything-pr.com
            </a>
            <Link
              to="/contact"
              className="mt-6 inline-flex items-center justify-center w-full rounded-md bg-white text-foreground font-semibold py-3 hover:opacity-90"
            >
              Get in touch
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
