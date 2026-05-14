import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader, getRequestHost } from "@tanstack/react-start/server";
import { supabaseAnon } from "@/integrations/supabase/client.anon.server";
import { isPreviewHost } from "@/serverFns/seo.head";
import type { GlossaryTerm } from "@/lib/glossary.shared";

function host(): string | null {
  try {
    return getRequestHost({ xForwardedHost: true }) ?? null;
  } catch {
    return null;
  }
}

function setCacheAndRobots(h: string | null) {
  try {
    setResponseHeader("Cache-Control", "public, max-age=120, s-maxage=300, stale-while-revalidate=600");
    setResponseHeader(
      "X-Robots-Tag",
      isPreviewHost(h)
        ? "noindex, follow, max-image-preview:large"
        : "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1",
    );
  } catch {}
}

export const listGlossary = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ terms: GlossaryTerm[]; host: string | null }> => {
    const h = host();
    setCacheAndRobots(h);
    const { data, error } = await supabaseAnon
      .from("glossary_terms")
      .select("id, slug, title, short_definition, extended_html, category, where_used, related_terms")
      .eq("published", true)
      .order("title", { ascending: true })
      .limit(500);
    if (error) throw error;
    return { terms: (data ?? []) as GlossaryTerm[], host: h };
  },
);

export const getGlossaryTerm = createServerFn({ method: "GET" })
  .inputValidator((input: { slug: string }) => {
    if (!input?.slug) throw new Error("slug required");
    return { slug: String(input.slug).trim().toLowerCase() };
  })
  .handler(async ({ data }): Promise<{ term: GlossaryTerm | null; host: string | null }> => {
    const h = host();
    setCacheAndRobots(h);
    const { data: row, error } = await supabaseAnon
      .from("glossary_terms")
      .select("id, slug, title, short_definition, extended_html, category, where_used, related_terms")
      .eq("slug", data.slug)
      .eq("published", true)
      .maybeSingle();
    if (error) throw error;
    return { term: (row as GlossaryTerm | null) ?? null, host: h };
  });
