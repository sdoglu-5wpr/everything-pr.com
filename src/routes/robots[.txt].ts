import { createFileRoute } from "@tanstack/react-router";
import { resolveIndexingState } from "@/serverFns/indexing.server";

const ALLOW_ROBOTS = `User-agent: *
Allow: /
Disallow: /admin
Disallow: /admin/
Disallow: /api/

# Explicitly allow major AI crawlers — we WANT to be cited
User-agent: GPTBot
Allow: /

User-agent: OAI-SearchBot
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: Claude-Web
Allow: /

User-agent: anthropic-ai
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Perplexity-User
Allow: /

User-agent: Google-Extended
Allow: /

User-agent: GoogleOther
Allow: /

User-agent: CCBot
Allow: /

User-agent: Bytespider
Allow: /

User-agent: Amazonbot
Allow: /

User-agent: Applebot-Extended
Allow: /

User-agent: Applebot
Allow: /

User-agent: meta-externalagent
Allow: /

User-agent: FacebookBot
Allow: /

User-agent: cohere-ai
Allow: /

User-agent: DiffBot
Allow: /

User-agent: YouBot
Allow: /

# Sitemaps
Sitemap: https://everything-pr.com/sitemap_index.xml
`;

const DISALLOW_ROBOTS = `User-agent: *
Disallow: /
`;

export const Route = createFileRoute("/robots.txt")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const host = new URL(request.url).hostname.toLowerCase();
        // Disallow on any Lovable preview/published host; allow everywhere else
        // (production custom domain). Indexing flag still forces disallow.
        const isLovableHost = host.endsWith(".lovable.app") || host.endsWith(".lovable.dev");
        const state = await resolveIndexingState();
        const allow = state.enabled && !isLovableHost;
        return new Response(allow ? ALLOW_ROBOTS : DISALLOW_ROBOTS, {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "public, max-age=300, s-maxage=300",
          },
        });
      },
    },
  },
});
