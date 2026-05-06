import { createFileRoute } from "@tanstack/react-router";
import { resolveIndexingState } from "@/serverFns/indexing.server";

const ALLOW_ROBOTS = `# Everything-PR robots.txt
# Allow AI crawlers and search engines.
# Block admin and non-public areas only.

User-agent: GPTBot
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: OAI-SearchBot
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

User-agent: Applebot
Allow: /

User-agent: Applebot-Extended
Allow: /

User-agent: CCBot
Allow: /

User-agent: Amazonbot
Allow: /

User-agent: Meta-ExternalAgent
Allow: /

User-agent: DuckAssistBot
Allow: /

User-agent: Googlebot
Allow: /

User-agent: Bingbot
Allow: /

User-agent: *
Allow: /
Disallow: /admin/
Disallow: /admin
Disallow: /api/
Disallow: /setup-cowork
Disallow: /search
Disallow: /?s=

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
