import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Award,
  BadgeCheck,
  BookOpen,
  Calendar,
  FileText,
  Globe,
  Layers,
  Mail,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from "lucide-react";

type Sector = { name: string; href: string };
type Discipline = { name: string; href: string };

const SECTORS: Sector[] = [
  { name: "Beauty & Fashion", href: "/beauty-fashion/" },
  { name: "Consumer Brands", href: "/consumer-brands/" },
  { name: "Entertainment", href: "/entertainment-media/" },
  { name: "Financial Services", href: "/financial-services/" },
  { name: "Food & Beverage", href: "/food-beverage/" },
  { name: "Healthcare", href: "/healthcare/" },
  { name: "Hospitality", href: "/hospitality/" },
  { name: "Nonprofit", href: "/nonprofit/" },
  { name: "Real Estate", href: "/real-estate/" },
  { name: "Retail", href: "/retail/" },
  { name: "Sports", href: "/sports/" },
  { name: "Technology", href: "/technology/" },
  { name: "Travel", href: "/travel/" },
  { name: "Automotive", href: "/automotive/" },
  { name: "Cannabis", href: "/cannabis/" },
  { name: "Crypto & Web3", href: "/crypto-web3/" },
  { name: "Education", href: "/education/" },
  { name: "Legal", href: "/legal/" },
  { name: "Public Affairs", href: "/public-affairs/" },
  { name: "Luxury", href: "/luxury/" },
];

const DISCIPLINES: Discipline[] = [
  { name: "Crisis Communications", href: "/crisis-communications/" },
  { name: "Corporate Communications", href: "/corporate-communications/" },
  { name: "Public Affairs", href: "/public-affairs/" },
  { name: "Digital Marketing", href: "/digital-marketing/" },
  { name: "Influencer Marketing", href: "/influencer-marketing/" },
  { name: "Paid Media", href: "/paid-media/" },
  { name: "Social Media", href: "/social-media/" },
  { name: "SEO", href: "/seo/" },
  { name: "Generative Engine Optimization", href: "/generative-engine-optimization/" },
  { name: "Reputation Management", href: "/reputation-management/" },
  { name: "Research", href: "/research/" },
  { name: "Media Training", href: "/media-training/" },
  { name: "Investor Relations", href: "/investor-relations/" },
  { name: "Internal Communications", href: "/internal-communications/" },
];

const RESEARCH = [
  {
    title: "PR Spend Transparency Study — 2026",
    desc: "Agency fees, scope, and disclosure across the U.S. PR market.",
  },
  {
    title: "Nonprofit PR Transparency Study — 2026",
    desc: "Communications spend and accountability inside the nonprofit sector.",
  },
  {
    title: "Municipal & State PR Spend Study — 2026",
    desc: "Public-sector communications spending across U.S. cities and states.",
  },
  {
    title: "AI Company Comms Study — 2026",
    desc: "How the leading AI companies communicate, position, and disclose.",
  },
  {
    title: "Foreign Influence PR Study — 2026",
    desc: "Sovereign and foreign-government communications activity in the U.S.",
  },
  {
    title: "Disclosure Audit Series™",
    desc: "Auditing transparency across PR firms, brands, and platforms — repeatable, comparable year-over-year.",
  },
  {
    title: "Vertical Brand Power Indexes",
    desc: "Category-level reputation benchmarks across the 20 sectors EPR covers.",
  },
];

const CONTRIBUTORS = [
  {
    slug: "ronntorossian",
    name: "Ronn Torossian",
    role: "Publisher, Everything-PR",
    blurb:
      "Founder and Chairman of 5W AI Communications. Author, operator, and a recognized authority on PR, crisis communications, and the AI-era reputation economy.",
    tag: "Publisher",
  },
  {
    slug: "ssemilof",
    name: "Seth Semilof",
    role: "Co-Founder & COO, Haute Media Group",
    blurb:
      "Writes on luxury marketing, UHNW audience strategy, and AI visibility in luxury categories.",
    tag: "Contributor",
  },
  {
    slug: "kmercuri",
    name: "Kevin Mercuri",
    role: "Founder & CEO, Propheta Communications",
    blurb:
      "Executive-in-Residence at Emerson College. Writes on startup PR, category creation, crisis, and the AI-era playbook for emerging companies.",
    tag: "Contributor",
  },
  {
    slug: "mheller",
    name: "Michael Heller",
    role: "Founder & CEO, Talent Resources",
    blurb:
      "Writes on celebrity and influencer brand partnerships, the AI-era talent economy, and the structural shift inside agency-side marketing.",
    tag: "Contributor",
  },
];

const CONTACT = [
  { label: "Pitch a story", email: "editorial@everything-pr.com" },
  { label: "Submit research", email: "research@everything-pr.com" },
  { label: "Press inquiries", email: "press@everything-pr.com" },
  { label: "Advertising & partnerships", email: "commercial@everything-pr.com" },
];

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function AboutPage() {
  return (
    <article className="bg-background">
      {/* HERO */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[color:var(--ink)] via-[color:var(--ink)] to-[oklch(0.32_0.18_270)] text-white">
        <div
          className="absolute inset-0 opacity-[0.12] pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, white 1px, transparent 1px), radial-gradient(circle at 80% 60%, white 1px, transparent 1px)",
            backgroundSize: "40px 40px, 60px 60px",
          }}
        />
        <div className="relative mx-auto max-w-7xl px-6 pt-16 pb-24 md:pt-24 md:pb-32">
          <nav className="text-xs text-white/60 mb-8 flex items-center gap-2 uppercase tracking-[0.2em]">
            <Link to="/" className="hover:text-white">
              Home
            </Link>
            <span>/</span>
            <span className="text-white">About</span>
          </nav>

          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/15 rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] mb-6">
            <Sparkles className="h-3.5 w-3.5 text-[color:var(--brand-blue)]" />
            Publishing since 2009
          </div>

          <h1 className="font-serif text-5xl md:text-7xl font-bold tracking-tight leading-[1.05] max-w-5xl">
            The intelligence platform for the{" "}
            <span className="text-[color:var(--brand-blue)]">AI-era</span> communications industry.
          </h1>

          <p className="mt-8 text-lg md:text-xl text-white/75 leading-relaxed max-w-3xl">
            Everything-PR is the independent record of public relations, marketing, and reputation — daily
            reporting, original research, and seventeen years of continuous publishing across the agencies,
            brands, leaders, campaigns, and structural forces that define how reputation is built, defended, and
            now retrieved.
          </p>

          <div className="mt-10 flex flex-wrap gap-3">
            <a
              href="#research"
              className="inline-flex items-center gap-2 bg-[color:var(--brand-blue)] text-white px-5 py-3 rounded-md font-semibold hover:opacity-90 transition"
            >
              Explore the research <ArrowRight className="h-4 w-4" />
            </a>
            <a
              href="#contact"
              className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 text-white px-5 py-3 rounded-md font-semibold hover:bg-white/15 transition"
            >
              Get in touch
            </a>
          </div>
        </div>
        <div className="h-1 bg-[color:var(--brand-blue)]" />
      </section>

      {/* STATS */}
      <section className="bg-surface-soft border-b border-black/5">
        <div className="mx-auto max-w-7xl px-6 -mt-12 relative z-10">
          <div className="bg-white rounded-2xl shadow-2xl border border-black/5 grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-black/5">
            {[
              { value: "17", label: "Years of publishing", icon: Calendar },
              { value: "20", label: "Sectors covered", icon: Layers },
              { value: "14", label: "Disciplines", icon: TrendingUp },
              { value: "10K+", label: "Articles archived", icon: BookOpen },
            ].map((s) => (
              <div key={s.label} className="p-6 md:p-8 flex items-start gap-4">
                <div className="bg-[color:var(--brand-blue)]/10 text-[color:var(--brand-blue)] p-2.5 rounded-lg">
                  <s.icon className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-serif text-3xl md:text-4xl font-bold text-foreground leading-none">
                    {s.value}
                  </div>
                  <div className="mt-1.5 text-xs uppercase tracking-wider text-muted-foreground">{s.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SEVENTEEN YEAR RECORD */}
      <section className="mx-auto max-w-7xl px-6 py-20 md:py-24 grid grid-cols-1 md:grid-cols-12 gap-10">
        <div className="md:col-span-4">
          <div className="w-12 h-1 bg-[color:var(--brand-blue)] mb-4" />
          <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--brand-blue)] font-bold mb-3">
            The Archive
          </p>
          <h2 className="font-serif text-4xl md:text-5xl font-bold leading-tight">
            A seventeen-year continuous record.
          </h2>
        </div>
        <div className="md:col-span-8 prose-article text-foreground space-y-5 text-[17px] leading-relaxed">
          <p>
            Everything-PR launched in January 2009 and has published continuously every business day since. The
            archive runs to tens of thousands of articles across every major story, agency move, campaign,
            crisis, and structural shift in the communications industry over the past seventeen years.
          </p>
          <p>
            Most industry coverage is episodic — a publication launches, rides a wave, and fades. EPR has
            covered every wave inside marketing, PR, and communications: the collapse of the press release, the
            rise of social-first PR, the influencer economy, the consolidation of holding companies, the
            fragmentation of trade media, the entry of GEO, and the structural shift to AI-mediated discovery
            through ChatGPT, Claude, Perplexity, Gemini, and Google AI Overviews.
          </p>
          <p className="font-semibold text-foreground">The record is searchable, citable, and continuous.</p>
        </div>
      </section>

      {/* SECTORS + DISCIPLINES */}
      <section className="bg-surface-soft border-y border-black/5 py-20 md:py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center mb-14 max-w-3xl mx-auto">
            <div className="w-12 h-1 bg-[color:var(--brand-blue)] mb-4 mx-auto" />
            <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--brand-blue)] font-bold mb-3">
              What We Cover
            </p>
            <h2 className="font-serif text-4xl md:text-5xl font-bold leading-tight">
              20 sectors. 14 disciplines. One network.
            </h2>
            <p className="mt-5 text-muted-foreground text-lg">
              The intersection of any sector and any discipline produces the practical communications work that
              defines the modern industry.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl border border-black/5 shadow-card p-8">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-black/10">
                <div className="bg-[color:var(--brand-blue)] text-white p-2 rounded-md">
                  <Layers className="h-4 w-4" />
                </div>
                <h3 className="font-serif text-xl font-bold">Sectors</h3>
                <span className="ml-auto text-xs uppercase tracking-wider text-muted-foreground">
                  {SECTORS.length} industries
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {SECTORS.map((s) => (
                  <a
                    key={s.name}
                    href={s.href}
                    className="text-sm bg-black/[0.03] hover:bg-[color:var(--brand-blue)] hover:text-white border border-black/5 text-foreground px-3 py-1.5 rounded-md transition-colors"
                  >
                    {s.name}
                  </a>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-black/5 shadow-card p-8">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-black/10">
                <div className="bg-[color:var(--brand-blue)] text-white p-2 rounded-md">
                  <TrendingUp className="h-4 w-4" />
                </div>
                <h3 className="font-serif text-xl font-bold">Disciplines</h3>
                <span className="ml-auto text-xs uppercase tracking-wider text-muted-foreground">
                  {DISCIPLINES.length} capabilities
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {DISCIPLINES.map((d) => (
                  <a
                    key={d.name}
                    href={d.href}
                    className="text-sm bg-black/[0.03] hover:bg-[color:var(--brand-blue)] hover:text-white border border-black/5 text-foreground px-3 py-1.5 rounded-md transition-colors"
                  >
                    {d.name}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* RESEARCH */}
      <section id="research" className="mx-auto max-w-7xl px-6 py-20 md:py-24">
        <div className="max-w-3xl mb-14">
          <div className="w-12 h-1 bg-[color:var(--brand-blue)] mb-4" />
          <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--brand-blue)] font-bold mb-3">
            Proprietary Research
          </p>
          <h2 className="font-serif text-4xl md:text-5xl font-bold leading-tight">
            Methodology-led studies, built to be cited.
          </h2>
          <p className="mt-5 text-muted-foreground text-lg leading-relaxed">
            Original research designed to be the primary source on the questions practitioners, journalists, and
            clients actually ask — and to be retrievable and citable inside the AI engines that increasingly
            mediate buyer research.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {RESEARCH.map((r, i) => (
            <div
              key={r.title}
              className="group bg-white rounded-xl border border-black/5 shadow-card p-6 hover:shadow-lg hover:border-[color:var(--brand-blue)]/30 transition"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="bg-[color:var(--brand-blue)]/10 text-[color:var(--brand-blue)] p-2 rounded-md">
                  <FileText className="h-4 w-4" />
                </div>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                  Study {String(i + 1).padStart(2, "0")}
                </span>
              </div>
              <h3 className="font-serif text-lg font-bold leading-snug mb-2 group-hover:text-[color:var(--brand-blue)]">
                {r.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{r.desc}</p>
            </div>
          ))}
        </div>

        <p className="mt-8 text-sm text-muted-foreground">
          Methodology is published with every study. Data is provided to journalists, analysts, and academic
          researchers on request.
        </p>
      </section>

      {/* BUILT FOR AI ERA */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[color:var(--ink)] to-[oklch(0.28_0.16_270)] text-white">
        <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(circle_at_top_right,white,transparent_60%)]" />
        <div className="relative mx-auto max-w-7xl px-6 py-20 md:py-24 grid grid-cols-1 md:grid-cols-2 gap-14 items-center">
          <div>
            <div className="inline-flex items-center gap-2 bg-white/10 border border-white/15 rounded-full px-3.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] mb-5">
              <Sparkles className="h-3 w-3 text-[color:var(--brand-blue)]" /> Answer-engine era
            </div>
            <h2 className="font-serif text-4xl md:text-5xl font-bold leading-tight">
              Built to be cited by the engines that now answer the question.
            </h2>
          </div>
          <div className="space-y-5 text-white/80 text-[17px] leading-relaxed">
            <p>
              The platforms where decisions now happen — ChatGPT, Claude, Perplexity, Gemini, Google AI Overviews —
              increasingly mediate how reputations form, how vendors get shortlisted, and how categories get
              defined. The discovery layer has moved.
            </p>
            <p>
              Everything-PR is structured to operate inside that shift. Coverage is entity-rich, schema-marked,
              and built for retrieval. Research is methodology-led so it can be cited as a primary source.
            </p>
            <p className="text-white font-semibold">
              EPR doesn't just cover the AI communications shift — the publication is built to be a permanent
              fixture inside it.
            </p>
          </div>
        </div>
      </section>

      {/* CONTRIBUTORS */}
      <section className="mx-auto max-w-7xl px-6 py-20 md:py-24">
        <div className="text-center mb-14 max-w-3xl mx-auto">
          <div className="w-12 h-1 bg-[color:var(--brand-blue)] mb-4 mx-auto" />
          <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--brand-blue)] font-bold mb-3">
            Publisher & Contributors
          </p>
          <h2 className="font-serif text-4xl md:text-5xl font-bold leading-tight">
            Reported by practitioners, not pundits.
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {CONTRIBUTORS.map((c) => (
            <Link
              key={c.slug}
              to="/author/$slug"
              params={{ slug: c.slug }}
              className="group bg-white rounded-xl border border-black/5 shadow-card p-6 flex flex-col hover:shadow-lg hover:border-[color:var(--brand-blue)]/30 transition"
            >
              <div className="relative w-20 h-20 mb-5">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[color:var(--brand-blue)] to-[color:var(--ink)] text-white flex items-center justify-center text-xl font-bold">
                  {initials(c.name)}
                </div>
                <div className="absolute -bottom-1 -right-1 bg-[color:var(--brand-blue)] text-white rounded-full p-1 ring-2 ring-white">
                  <BadgeCheck className="h-3.5 w-3.5" />
                </div>
              </div>
              <span
                className={`inline-block self-start text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded mb-2 ${
                  c.tag === "Publisher"
                    ? "bg-[color:var(--brand-blue)] text-white"
                    : "bg-black/5 text-foreground"
                }`}
              >
                {c.tag}
              </span>
              <h3 className="font-serif text-lg font-bold leading-tight group-hover:text-[color:var(--brand-blue)]">
                {c.name}
              </h3>
              <p className="text-xs text-muted-foreground mt-1 font-semibold">{c.role}</p>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed flex-1">{c.blurb}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-[color:var(--brand-blue)] group-hover:gap-2 transition-all">
                View profile <ArrowRight className="h-3 w-3" />
              </span>
            </Link>
          ))}
        </div>

        <p className="mt-8 text-sm text-muted-foreground text-center">
          Contributing practitioners file regular coverage across sectors and disciplines.{" "}
          <Link to="/authors" className="text-[color:var(--brand-blue)] font-semibold underline">
            See all authors
          </Link>
          .
        </p>
      </section>

      {/* STANDARDS + OWNERSHIP */}
      <section className="bg-surface-soft border-y border-black/5 py-20 md:py-24">
        <div className="mx-auto max-w-7xl px-6 grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white rounded-2xl border border-black/5 shadow-card p-8">
            <div className="flex items-center gap-3 mb-5">
              <div className="bg-[color:var(--brand-blue)] text-white p-2.5 rounded-lg">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <h3 className="font-serif text-2xl font-bold">Editorial Standards</h3>
            </div>
            <p className="text-muted-foreground leading-relaxed mb-6">
              EPR is published with editorial independence and the practitioner authority that seventeen years
              of continuous coverage provides. Corrections are published transparently. Sourcing is named where
              possible. Conflicts are disclosed on the article.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Editorial Policy", href: "/editorial-policy/" },
                { label: "Ethics Policy", href: "/ethics-policy/" },
                { label: "Corrections Policy", href: "/corrections-policy/" },
                { label: "Comments Policy", href: "/comments-policy/" },
              ].map((p) => (
                <a
                  key={p.label}
                  href={p.href}
                  className="flex items-center justify-between gap-2 text-sm font-semibold text-foreground border border-black/10 rounded-md px-3 py-2.5 hover:border-[color:var(--brand-blue)] hover:text-[color:var(--brand-blue)] transition"
                >
                  {p.label}
                  <ArrowRight className="h-3.5 w-3.5" />
                </a>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-black/5 shadow-card p-8">
            <div className="flex items-center gap-3 mb-5">
              <div className="bg-[color:var(--brand-blue)] text-white p-2.5 rounded-lg">
                <Award className="h-5 w-5" />
              </div>
              <h3 className="font-serif text-2xl font-bold">Ownership & Independence</h3>
            </div>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Everything-PR and 5W AI Communications share common ownership. They operate as independent
              businesses with separate editorial and commercial mandates.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Editorial decisions at Everything-PR are made independently. Where coverage touches 5W, its
              clients, or related entities, the relationship is disclosed directly on the article.
            </p>
            <div className="mt-6 pt-6 border-t border-black/5 flex items-center gap-3 text-sm">
              <Globe className="h-4 w-4 text-[color:var(--brand-blue)]" />
              <span className="text-muted-foreground">
                Verified network — 5W AI Communications, Everything-PR, and partner outlets.
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* CONTACT CTA */}
      <section id="contact" className="mx-auto max-w-7xl px-6 py-20 md:py-24">
        <div className="relative overflow-hidden bg-gradient-to-br from-[color:var(--ink)] to-[oklch(0.30_0.16_270)] rounded-3xl text-white p-10 md:p-16">
          <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(circle_at_bottom_left,white,transparent_55%)]" />
          <div className="relative grid grid-cols-1 md:grid-cols-2 gap-10 items-start">
            <div>
              <div className="w-12 h-1 bg-[color:var(--brand-blue)] mb-4" />
              <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--brand-blue)] font-bold mb-3">
                Get in touch
              </p>
              <h2 className="font-serif text-4xl md:text-5xl font-bold leading-tight">
                Pitch a story. Submit research. Start a conversation.
              </h2>
              <p className="mt-5 text-white/75 text-lg">
                We read every note. Use the right inbox below to reach the right desk.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {CONTACT.map((c) => (
                <a
                  key={c.email}
                  href={`mailto:${c.email}`}
                  className="group bg-white/5 backdrop-blur-sm border border-white/15 rounded-xl p-4 hover:bg-white/10 hover:border-[color:var(--brand-blue)] transition"
                >
                  <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-white/60 font-semibold mb-1.5">
                    <Mail className="h-3 w-3" />
                    {c.label}
                  </div>
                  <div className="text-sm font-semibold text-white group-hover:text-[color:var(--brand-blue)] truncate">
                    {c.email}
                  </div>
                </a>
              ))}
            </div>
          </div>
        </div>
        <p className="mt-8 text-center text-xs text-muted-foreground">
          Last reviewed: <time dateTime="2026-05-15">May 15, 2026</time>
        </p>
      </section>
    </article>
  );
}
