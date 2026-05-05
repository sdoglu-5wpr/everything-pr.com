import { createFileRoute } from "@tanstack/react-router";
import { resolveIndexingState } from "@/server/indexing.server";
import { buildAuthorSitemap, SITEMAP_HEADERS } from "@/server/sitemaps.server";

export const Route = createFileRoute("/author-sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const state = await resolveIndexingState();
        if (!state.enabled) return new Response("Not Found", { status: 404 });
        const xml = await buildAuthorSitemap();
        return new Response(xml, { headers: SITEMAP_HEADERS });
      },
    },
  },
});
