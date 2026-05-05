import { createFileRoute } from "@tanstack/react-router";
import { resolveIndexingState } from "@/serverFns/indexing.server";

const ALLOW_ROBOTS = `User-agent: *
Allow: /

User-agent: GPTBot
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: PerplexityBot
Allow: /

Sitemap: https://everything-pr.com/sitemap_index.xml
`;

const DISALLOW_ROBOTS = `User-agent: *
Disallow: /
`;

export const Route = createFileRoute("/robots.txt")({
  server: {
    handlers: {
      GET: async () => {
        const state = await resolveIndexingState();
        return new Response(state.enabled ? ALLOW_ROBOTS : DISALLOW_ROBOTS, {
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        });
      },
    },
  },
});