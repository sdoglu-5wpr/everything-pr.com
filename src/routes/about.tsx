import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";
import { AboutPage } from "@/components/site/AboutPage";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About Everything-PR — The Leading PR Industry Publication" },
      { name: "description", content: "Everything-PR is the leading independent publication covering public relations, marketing, crisis communications, AI communications, and proprietary industry research. Published daily since 2009." },
      { property: "og:title", content: "About Everything-PR — The Leading PR Industry Publication" },
      { property: "og:description", content: "Independent reporting and original research on the PR and communications industry since 2009." },
      { property: "og:type", content: "website" },
    ],
  }),
  component: () => (
    <SiteLayout>
      <AboutPage />
    </SiteLayout>
  ),
});
