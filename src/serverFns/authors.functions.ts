import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import { supabaseAnon } from "@/integrations/supabase/client.anon.server";
import { cached } from "@/serverFns/loader-cache.server";

export type AuthorListItem = {
  id: number;
  slug: string;
  display_name: string;
  job_title: string | null;
  avatar_url: string | null;
  bio: string | null;
  post_count: number;
  tags: string[];
  social: Record<string, string>;
  website: string | null;
};

function plainBio(html: string | null): string | null {
  if (!html) return null;
  const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return text || null;
}

export const listAuthors = createServerFn({ method: "GET" }).handler(
  async (): Promise<AuthorListItem[]> => {
    try {
      setResponseHeader(
        "Cache-Control",
        "public, max-age=300, s-maxage=900, stale-while-revalidate=3600",
      );
    } catch {}
    return cached("authors:list:v1", 300_000, async () => {
      const { data, error } = await supabaseAnon
        .from("authors")
        .select("id, slug, display_name, job_title, avatar_url, bio, post_count, tags, social, website")
        .order("post_count", { ascending: false, nullsFirst: false })
        .limit(500);
      if (error) throw error;
      const rows = (data ?? []) as AuthorListItem[];
      // Prioritize authors with a real avatar
      const hasAvatar = (a: AuthorListItem) =>
        !!a.avatar_url && !/blank|mystery|gravatar\.com\/avatar\/[0-9a-f]+\?.*d=blank/i.test(a.avatar_url);
      return rows
        .map((a) => ({ ...a, bio: plainBio(a.bio), tags: Array.isArray(a.tags) ? a.tags : [], social: a.social ?? {} }))
        .sort((a, b) => {
          const av = hasAvatar(a) ? 0 : 1;
          const bv = hasAvatar(b) ? 0 : 1;
          if (av !== bv) return av - bv;
          if ((b.post_count ?? 0) !== (a.post_count ?? 0)) return (b.post_count ?? 0) - (a.post_count ?? 0);
          return a.display_name.localeCompare(b.display_name);
        });
    });
  },
);
