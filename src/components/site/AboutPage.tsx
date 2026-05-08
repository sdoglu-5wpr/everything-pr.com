import { Link } from "@tanstack/react-router";
import { Mail } from "lucide-react";
import teamPhoto from "@/assets/about-team.jpg";
import { InlineNewsletter } from "@/components/site/InlineNewsletter";

export function AboutPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative bg-gradient-to-b from-foreground to-foreground/95 text-white">
        <div className="mx-auto max-w-7xl px-6 py-20 md:py-28">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-white/60 mb-5">
              <span className="w-8 h-px bg-white/40" /> About Everything-PR
            </div>
            <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.05]">
              The AI-era intelligence platform for the public relations and communications industry.
            </h1>
            <p className="mt-6 text-lg md:text-xl text-white/75 leading-relaxed">
              Founded in January 2009, Everything-PR has published continuously for 17 years — one of the longest-running independent sources of PR news, analysis, and industry intelligence available online.
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
              alt="The Everything-PR editorial team — independent journalists and analysts covering the public relations industry"
              width={1600}
              height={1024}
              className="w-full h-auto object-cover"
              loading="eager"
            />
          </div>
        </div>
      </section>

      {/* Body */}
      <section className="bg-background">
        <div className="mx-auto max-w-3xl px-6 py-16 md:py-20 prose prose-lg max-w-none text-foreground">
          <p className="text-lg leading-relaxed text-muted-foreground">
            Everything-PR is the AI-era intelligence platform for the public relations and communications industry.
          </p>
          <p className="text-lg leading-relaxed text-muted-foreground mt-5">
            Founded in January 2009, Everything-PR has published continuously for 17 years — one of the longest-running independent sources of PR news, analysis, and industry intelligence available online. The archive spans tens of thousands of articles indexed across every major search engine and AI model, including ChatGPT, Claude, Perplexity, Gemini, and Google AI Overviews.
          </p>
          <p className="text-lg leading-relaxed text-muted-foreground mt-5">
            Everything-PR covers the full spectrum of communications and marketing: PR agency news and account wins, brand communications strategy, crisis PR and reputation management, digital marketing and social media, influencer strategy, Generative Engine Optimization (GEO) and AI search visibility, industry research and citation analytics, executive appointments and leadership profiles, RFPs and new business intelligence, and the strategic and cultural forces reshaping how communications is practiced.
          </p>

          <h2 className="font-serif text-2xl md:text-3xl font-bold mt-12">Ownership and Editorial Independence</h2>
          <p className="text-lg leading-relaxed text-muted-foreground mt-5">
            Everything-PR is an independent publication, separately incorporated and operated. A principal owner of Everything-PR is also an owner of 5W, the AI Communications Firm. Editorial decisions are made independently. Articles involving 5W, its subsidiaries, leadership, or clients are disclosed at the top of the piece. Coverage of competitor agencies is held to the same editorial standards.
          </p>

          <h3 className="font-serif text-xl font-bold mt-10">Contributors include:</h3>
          <ul className="mt-4 space-y-2 text-muted-foreground text-base">
            <li><strong className="text-foreground">Seth Semilof</strong> — Haute Living, Haute Media Group</li>
            <li><strong className="text-foreground">Kevin Mercuri</strong> — Propheta Communications, Emerson College</li>
            <li><strong className="text-foreground">Mike Heller</strong> — Talent Resources Collective</li>
          </ul>
          <p className="text-base leading-relaxed text-muted-foreground mt-4">
            Additional contributors include senior practitioners across PR, digital marketing, crisis communications, luxury, entertainment, and AI search.
          </p>

          <h2 className="font-serif text-2xl md:text-3xl font-bold mt-12">Citations and Industry Recognition</h2>
          <p className="text-lg leading-relaxed text-muted-foreground mt-5">
            Everything-PR’s reporting and analysis have been cited by The New York Times, BBC, Reuters, The Washington Post, BusinessWeek, ZDNet, Eater, Grub Street, and Yahoo Small Business Advisor. The publication has been recognized among leading public relations media properties in industry rankings by Cision and InkyBee.
          </p>

          <h2 className="font-serif text-2xl md:text-3xl font-bold mt-12">Contact</h2>
          <p className="text-lg leading-relaxed text-muted-foreground mt-5">
            Editorial inquiries, op-ed contributions, and story tips:{" "}
            <a href="mailto:info@everything-pr.com" className="text-brand-blue underline font-semibold">
              info@everything-pr.com
            </a>
          </p>
          <p className="text-lg leading-relaxed text-muted-foreground mt-3">
            Subscribe to the weekly newsletter — the biggest stories in PR, comms, and media delivered every week.
          </p>
          <p className="text-base text-muted-foreground italic mt-8">— The Everything-PR Editorial Team</p>
        </div>
      </section>

      {/* Newsletter signup */}
      <InlineNewsletter />

      {/* Quick contact card */}
      <section className="bg-foreground text-white">
        <div className="mx-auto max-w-5xl px-6 py-14 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div>
            <h2 className="font-serif text-2xl md:text-3xl font-bold">Get in touch</h2>
            <p className="mt-3 text-white/75 leading-relaxed">
              Editorial inquiries, op-ed contributions, story tips, and corrections.
            </p>
          </div>
          <div className="rounded-lg border border-white/15 bg-white/5 p-7">
            <Mail className="w-6 h-6 text-white/70" />
            <a href="mailto:info@everything-pr.com" className="mt-2 block font-serif text-xl font-bold hover:underline">
              info@everything-pr.com
            </a>
            <Link
              to="/contact"
              className="mt-5 inline-flex items-center justify-center w-full rounded-md bg-white text-foreground font-semibold py-3 hover:opacity-90"
            >
              Contact the editorial team
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
