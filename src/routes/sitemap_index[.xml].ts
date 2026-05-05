import { createFileRoute } from "@tanstack/react-router";
import { resolveIndexingState } from "@/serverFns/indexing.server";
import { buildSitemapIndex, SITEMAP_HEADERS } from "@/serverFns/sitemaps.server";

export const Route = createFileRoute("/sitemap_index.xml")({
  server: {
    handlers: {
      GET: async () => {
        const state = await resolveIndexingState();
        if (!state.enabled) return new Response("Not Found", { status: 404 });
        const xml = await buildSitemapIndex();
        return new Response(xml, { headers: SITEMAP_HEADERS });
      },
    },
  },
});
