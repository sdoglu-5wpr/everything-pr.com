import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader, getRequestHost } from "@tanstack/react-start/server";
import { supabaseAnon } from "@/integrations/supabase/client.anon.server";
import { cached } from "@/serverFns/loader-cache.server";
import { fetchPillarViaRpc, type PillarPayload } from "@/lib/pillars.shared";
import { isPreviewHost } from "@/serverFns/seo.head";

export type { PillarPayload, PillarRecord, PillarArticleItem, PillarFAQ } from "@/lib/pillars.shared";

export const getPillar = createServerFn({ method: "GET" })
  .inputValidator((input: { slug: string; page?: number }) => {
    if (!input?.slug) throw new Error("slug required");
    return { slug: input.slug, page: Math.max(1, Number(input.page ?? 1)) };
  })
  .handler(async ({ data }): Promise<PillarPayload | null> => {
    let host: string | null = null;
    try { host = getRequestHost({ xForwardedHost: true }) ?? null; } catch {}
    try {
      setResponseHeader(
        "Cache-Control",
        process.env.INDEXING_ENABLED === "true"
          ? "public, max-age=120, s-maxage=300, stale-while-revalidate=600"
          : "private, max-age=0, must-revalidate",
      );
      // Mirror the meta robots decision in an X-Robots-Tag response header so
      // HEAD-only crawlers and asset requests see the same signal.
      const xRobots = isPreviewHost(host)
        ? "noindex, follow, max-image-preview:large"
        : "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1";
      setResponseHeader("X-Robots-Tag", xRobots);
    } catch {}
    const payload = await cached(`pillar:${data.slug}:p${data.page}`, 60_000, () =>
      fetchPillarViaRpc(supabaseAnon, data.slug, data.page),
    );
    return payload ? { ...payload, host } : null;
  });
