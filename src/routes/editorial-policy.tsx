import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";
import { buildStaticPageHead } from "@/serverFns/seo.head";

export const Route = createFileRoute("/editorial-policy")({
  head: () =>
    buildStaticPageHead({
      path: "/editorial-policy/",
      title: "Editorial Policy — Everything-PR",
      description:
        "Everything-PR's editorial standards: ownership disclosure, sourcing, corrections, sponsored content, AI usage, and contributor attribution.",
      breadcrumbs: [{ name: "Editorial Policy" }],
    }),
  component: EditorialPolicyPage,
});

function EditorialPolicyPage() {
  return (
    <SiteLayout>
      <section className="bg-gradient-to-b from-foreground to-foreground/95 text-white">
        <div className="mx-auto max-w-4xl px-6 py-16 md:py-20">
          <div className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-white/60 mb-5">
            <span className="w-8 h-px bg-white/40" /> Editorial Policy
          </div>
          <h1 className="font-serif text-4xl md:text-5xl font-bold tracking-tight leading-[1.05]">
            Editorial Policy
          </h1>
          <p className="mt-4 text-sm text-white/60">Last updated: May 8, 2026</p>
        </div>
      </section>

      <article className="bg-background">
        <div className="mx-auto max-w-3xl px-6 py-14 md:py-20 prose prose-lg max-w-none text-foreground">
          <h2 className="font-serif text-2xl md:text-3xl font-bold">About Everything-PR</h2>
          <p className="text-muted-foreground leading-relaxed mt-4">
            Everything-PR is an independent publication covering the public relations, marketing, and communications industries. Founded in January 2009, the publication has published continuously for more than 17 years, making it one of the longest-running trade publications in the PR industry.
          </p>

          <h2 className="font-serif text-2xl md:text-3xl font-bold mt-10">Ownership and Disclosure</h2>
          <p className="text-muted-foreground leading-relaxed mt-4">
            Everything-PR is an independent publication, separately incorporated and operated. A principal owner of Everything-PR is also an owner of 5W, the AI Communications Firm.
          </p>
          <p className="text-muted-foreground leading-relaxed mt-4">
            This common ownership is disclosed here, on the About page, and in publisher schema on every page of the site. The following standards separate editorial coverage from commercial interest:
          </p>
          <ul className="mt-4 space-y-3 text-muted-foreground">
            <li>Coverage of 5W and its affiliated entities is identified as such, with the ownership relationship disclosed at the top of the article.</li>
            <li>Research authored by 5W and republished on Everything-PR carries full author attribution and publisher credit.</li>
            <li>Competitor coverage follows the same editorial standards. Account wins, M&amp;A activity, and executive moves are reported across the industry regardless of the agencies involved.</li>
            <li>Opinion pieces are labeled. Commentary and op-eds carry a visible author byline and are distinguished from news coverage.</li>
          </ul>

          <h2 className="font-serif text-2xl md:text-3xl font-bold mt-10">Editorial Independence</h2>
          <p className="text-muted-foreground leading-relaxed mt-4">
            Editorial decisions are made by the Everything-PR editorial team.
          </p>

          <h2 className="font-serif text-2xl md:text-3xl font-bold mt-10">Sources and Sourcing</h2>
          <p className="text-muted-foreground leading-relaxed mt-4">Everything-PR coverage draws on:</p>
          <ul className="mt-4 space-y-3 text-muted-foreground">
            <li>Direct reporting and interviews with PR industry practitioners</li>
            <li>Primary sources including SEC filings, government registries, court documents, and regulatory disclosures</li>
            <li>Industry research from third-party firms, with attribution</li>
            <li>Trade press coverage, attributed to the originating publication</li>
            <li>Press releases and corporate communications, identified as such</li>
          </ul>
          <p className="text-muted-foreground leading-relaxed mt-4">
            Where Everything-PR extends the analysis of a source to a new conclusion, that extension is identified. Where figures are estimates rather than disclosed data, they are labeled as estimates.
          </p>

          <h2 className="font-serif text-2xl md:text-3xl font-bold mt-10">Corrections</h2>
          <p className="text-muted-foreground leading-relaxed mt-4">
            When Everything-PR publishes a factual error, the correction is made in the affected article and noted at the bottom. Substantial corrections are also noted at the top of the article. Corrections are not silent edits; they are disclosed.
          </p>
          <p className="text-muted-foreground leading-relaxed mt-4">
            To report a factual error, email{" "}
            <a href="mailto:info@everything-pr.com" className="text-brand-blue underline font-semibold">
              info@everything-pr.com
            </a>{" "}
            with the article URL and the specific factual issue.
          </p>

          <h2 className="font-serif text-2xl md:text-3xl font-bold mt-10">Sponsored Content and Advertising</h2>
          <p className="text-muted-foreground leading-relaxed mt-4">
            Where any form of commercial placement exists on the site, it is labeled “Sponsored,” “Advertisement,” or equivalent, in compliance with Federal Trade Commission guidelines on endorsements and disclosure. Agency directory listings, research sponsorships, and partnership placements are disclosed on the page where they appear.
          </p>

          <h2 className="font-serif text-2xl md:text-3xl font-bold mt-10">Use of AI in Editorial Production</h2>
          <p className="text-muted-foreground leading-relaxed mt-4">
            Everything-PR may use AI tools to assist with research, drafting, fact-checking, and production. All articles are reviewed, edited, and approved by a human editor or author before publication. AI is an editorial tool at Everything-PR, not an editorial authority.
          </p>

          <h2 className="font-serif text-2xl md:text-3xl font-bold mt-10">Contributor and Author Attribution</h2>
          <p className="text-muted-foreground leading-relaxed mt-4">Articles on Everything-PR are attributed either to:</p>
          <ul className="mt-4 space-y-3 text-muted-foreground">
            <li>
              <strong className="text-foreground">The Everything-PR Editorial team</strong> — the staff byline for unsigned news coverage, analysis, and features produced by the editorial team.
            </li>
            <li>
              <strong className="text-foreground">A named author</strong> — for signed op-eds, research reports, and byline pieces where a specific individual is the author.
            </li>
          </ul>
          <p className="text-muted-foreground leading-relaxed mt-4">
            Named authors have biographical information available via their author pages.
          </p>

          <h2 className="font-serif text-2xl md:text-3xl font-bold mt-10">Contact</h2>
          <p className="text-muted-foreground leading-relaxed mt-4">
            Editorial inquiries, tips, corrections, and questions:{" "}
            <a href="mailto:info@everything-pr.com" className="text-brand-blue underline font-semibold">
              info@everything-pr.com
            </a>
          </p>

          <h2 className="font-serif text-2xl md:text-3xl font-bold mt-10">Governing Law</h2>
          <p className="text-muted-foreground leading-relaxed mt-4">
            This Editorial Policy is governed by the laws of the State of Florida, without regard to its conflict-of-law principles.
          </p>

          <p className="mt-10 text-muted-foreground italic">— The Everything-PR Editorial Team</p>
        </div>
      </article>
    </SiteLayout>
  );
}
