import { createFileRoute } from "@tanstack/react-router";
import { resolveIndexingState } from "@/serverFns/indexing.server";
import { buildPageSitemap, SITEMAP_HEADERS } from "@/serverFns/sitemaps.server";

export const Route = createFileRoute("/page-sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const state = await resolveIndexingState();
        if (!state.enabled) return new Response("Not Found", { status: 404 });
        const xml = await buildPageSitemap();
        return new Response(xml, { headers: SITEMAP_HEADERS });
      },
    },
  },
});
