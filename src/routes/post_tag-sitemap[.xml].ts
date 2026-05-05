import { createFileRoute } from "@tanstack/react-router";
import { resolveIndexingState } from "@/server/indexing.server";
import { buildTermSitemap, SITEMAP_HEADERS } from "@/server/sitemaps.server";

export const Route = createFileRoute("/post_tag-sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const state = await resolveIndexingState();
        if (!state.enabled) return new Response("Not Found", { status: 404 });
        const xml = await buildTermSitemap("tags", "tag");
        return new Response(xml, { headers: SITEMAP_HEADERS });
      },
    },
  },
});
