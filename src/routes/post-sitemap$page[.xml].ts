import { createFileRoute } from "@tanstack/react-router";
import { resolveIndexingState } from "@/server/indexing.server";
import { buildPostSitemap, SITEMAP_HEADERS } from "@/server/sitemaps.server";

// /post-sitemap.xml = page 1, /post-sitemapN.xml = page N
export const Route = createFileRoute("/post-sitemap$page.xml")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const state = await resolveIndexingState();
        if (!state.enabled) return new Response("Not Found", { status: 404 });
        const raw = (params as { page: string }).page;
        const page = raw === "" ? 1 : Number(raw);
        if (!Number.isFinite(page) || page < 1) return new Response("Not Found", { status: 404 });
        const xml = await buildPostSitemap(page);
        if (!xml) return new Response("Not Found", { status: 404 });
        return new Response(xml, { headers: SITEMAP_HEADERS });
      },
    },
  },
});
