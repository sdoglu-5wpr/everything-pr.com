import { createFileRoute } from "@tanstack/react-router";
import { resolveIndexingState } from "@/server/indexing.server";

const XML = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>https://everything-pr.com/sitemap-posts.xml</loc>
  </sitemap>
</sitemapindex>
`;

export const Route = createFileRoute("/sitemap_index.xml")({
  server: {
    handlers: {
      GET: async () => {
        const state = await resolveIndexingState();
        if (!state.enabled) return new Response("Not Found", { status: 404 });
        return new Response(XML, {
          headers: { "Content-Type": "application/xml; charset=utf-8" },
        });
      },
    },
  },
});