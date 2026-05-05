import { createFileRoute } from "@tanstack/react-router";
import { resolveIndexingState } from "@/serverFns/indexing.server";
import { buildPostSitemap, SITEMAP_HEADERS } from "@/serverFns/sitemaps.server";

export const Route = createFileRoute("/post-sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const state = await resolveIndexingState();
        if (!state.enabled) return new Response("Not Found", { status: 404 });
        const xml = await buildPostSitemap(1);
        if (!xml) return new Response("Not Found", { status: 404 });
        return new Response(xml, { headers: SITEMAP_HEADERS });
      },
    },
  },
});
