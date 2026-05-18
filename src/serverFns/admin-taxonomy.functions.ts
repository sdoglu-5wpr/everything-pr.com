import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const STAFF_ROLES = ["admin", "editor", "author"] as const;

async function ensureStaff(supabase: any, userId: string) {
  const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  if (!roles?.some((r: any) => (STAFF_ROLES as readonly string[]).includes(r.role))) {
    throw new Error("forbidden");
  }
}

function slugify(s: string): string {
  return s.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 100);
}

async function nextId(supabase: any, table: string): Promise<number> {
  const { data } = await supabase.from(table).select("id").order("id", { ascending: false }).limit(1).maybeSingle();
  return ((data?.id as number | undefined) ?? 0) + 1;
}

// ===================== CATEGORIES =====================
export const listCategories = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<any> => {
    const { supabase, userId } = context;
    await ensureStaff(supabase, userId);
    const { data, error } = await supabase
      .from("categories")
      .select("id, name, slug, description, parent_id, post_count, seo_title, seo_description, canonical_url, robots, og_image, focus_keyword")
      .order("name");
    if (error) throw new Error(error.message);
    return { items: data ?? [] };
  });

const CategoryInput = z.object({
  id: z.number().int().nullable(),
  name: z.string().min(1),
  slug: z.string().optional().default(""),
  description: z.string().nullable().optional(),
  parent_id: z.number().int().nullable().optional(),
  seo_title: z.string().nullable().optional(),
  seo_description: z.string().nullable().optional(),
  canonical_url: z.string().nullable().optional(),
  robots: z.string().nullable().optional(),
  og_image: z.string().nullable().optional(),
  focus_keyword: z.string().nullable().optional(),
});

export const saveCategory = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => CategoryInput.parse(i))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await ensureStaff(supabase, userId);
    const slug = slugify(data.slug || data.name);
    const row = {
      name: data.name, slug,
      description: data.description ?? null,
      parent_id: data.parent_id ?? null,
      seo_title: data.seo_title ?? null,
      seo_description: data.seo_description ?? null,
      canonical_url: data.canonical_url ?? null,
      robots: data.robots ?? null,
      og_image: data.og_image ?? null,
      focus_keyword: data.focus_keyword ?? null,
    };
    if (data.id == null) {
      const id = await nextId(supabase, "categories");
      const { error } = await supabase.from("categories").insert({ id, ...row } as any);
      if (error) throw new Error(error.message);
      return { ok: true, id };
    }
    const { error } = await supabase.from("categories").update(row).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true, id: data.id };
  });

export const deleteCategory = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({ id: z.number().int() }).parse(i))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await ensureStaff(supabase, userId);
    await supabase.from("post_categories").delete().eq("category_id", data.id);
    const { error } = await supabase.from("categories").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ===================== TAGS =====================
export const listTags = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<any> => {
    const { supabase, userId } = context;
    await ensureStaff(supabase, userId);
    const { data, error } = await supabase
      .from("tags").select("id, name, slug, description, post_count, seo_title, seo_description, canonical_url, robots, og_image, focus_keyword").order("name");
    if (error) throw new Error(error.message);
    return { items: data ?? [] };
  });

const TagInput = z.object({
  id: z.number().int().nullable(),
  name: z.string().min(1),
  slug: z.string().optional().default(""),
  description: z.string().nullable().optional(),
  seo_title: z.string().nullable().optional(),
  seo_description: z.string().nullable().optional(),
  canonical_url: z.string().nullable().optional(),
  robots: z.string().nullable().optional(),
  og_image: z.string().nullable().optional(),
  focus_keyword: z.string().nullable().optional(),
});

export const saveTag = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => TagInput.parse(i))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await ensureStaff(supabase, userId);
    const slug = slugify(data.slug || data.name);
    const row = {
      name: data.name, slug, description: data.description ?? null,
      seo_title: data.seo_title ?? null,
      seo_description: data.seo_description ?? null,
      canonical_url: data.canonical_url ?? null,
      robots: data.robots ?? null,
      og_image: data.og_image ?? null,
      focus_keyword: data.focus_keyword ?? null,
    };
    if (data.id == null) {
      const id = await nextId(supabase, "tags");
      const { error } = await supabase.from("tags").insert({ id, ...row } as any);
      if (error) throw new Error(error.message);
      return { ok: true, id };
    }
    const { error } = await supabase.from("tags").update(row).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true, id: data.id };
  });

export const deleteTag = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({ id: z.number().int() }).parse(i))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await ensureStaff(supabase, userId);
    await supabase.from("post_tags").delete().eq("tag_id", data.id);
    const { error } = await supabase.from("tags").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ===================== AUTHORS =====================
export const listAuthorsAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<any> => {
    const { supabase, userId } = context;
    await ensureStaff(supabase, userId);
    const { data, error } = await supabase
      .from("authors")
      .select("id, display_name, slug, email, bio, website, avatar_url, social, post_count")
      .order("display_name");
    if (error) throw new Error(error.message);
    return { items: data ?? [] };
  });

const AuthorInput = z.object({
  id: z.number().int().nullable(),
  display_name: z.string().min(1),
  slug: z.string().optional().default(""),
  email: z.string().nullable().optional(),
  bio: z.string().nullable().optional(),
  website: z.string().nullable().optional(),
  avatar_url: z.string().nullable().optional(),
  social: z.object({
    linkedin: z.string().nullable().optional(),
    twitter: z.string().nullable().optional(),
    facebook: z.string().nullable().optional(),
    instagram: z.string().nullable().optional(),
  }).optional().default({}),
});

export const saveAuthor = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => AuthorInput.parse(i))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await ensureStaff(supabase, userId);
    const slug = slugify(data.slug || data.display_name);
    const cleanSocial: Record<string, string> = {};
    for (const [k, v] of Object.entries(data.social ?? {})) {
      if (v && String(v).trim()) cleanSocial[k] = String(v).trim();
    }
    const row = {
      display_name: data.display_name, slug,
      email: data.email ?? null, bio: data.bio ?? null,
      website: data.website ?? null, avatar_url: data.avatar_url ?? null,
      social: cleanSocial,
    };
    if (data.id == null) {
      const id = await nextId(supabase, "authors");
      const { error } = await supabase.from("authors").insert({ id, ...row } as any);
      if (error) throw new Error(error.message);
      return { ok: true, id };
    }
    const { error } = await supabase.from("authors").update(row).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true, id: data.id };
  });

export const deleteAuthor = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({ id: z.number().int() }).parse(i))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await ensureStaff(supabase, userId);
    // Detach posts (don't delete posts)
    await supabase.from("posts").update({ author_id: null }).eq("author_id", data.id);
    const { error } = await supabase.from("authors").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ===================== REDIRECTS =====================
const RedirectListInput = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(200).default(50),
  q: z.string().default(""),
  enabledOnly: z.boolean().default(false),
});

export const listRedirects = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => RedirectListInput.parse(i))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }): Promise<any> => {
    const { supabase, userId } = context;
    await ensureStaff(supabase, userId);
    let q = supabase
      .from("redirects")
      .select("id, source_path, target_path, status_code, is_regex, enabled, hits, last_hit_at, notes", { count: "exact" })
      .order("id", { ascending: false });
    if (data.enabledOnly) q = q.eq("enabled", true);
    if (data.q.trim()) {
      const t = data.q.trim();
      q = q.or(`source_path.ilike.%${t}%,target_path.ilike.%${t}%,notes.ilike.%${t}%`);
    }
    const from = (data.page - 1) * data.pageSize;
    q = q.range(from, from + data.pageSize - 1);
    const { data: rows, count, error } = await q;
    if (error) throw new Error(error.message);
    return { items: rows ?? [], total: count ?? 0, page: data.page, pageSize: data.pageSize };
  });

const RedirectInput = z.object({
  id: z.number().int().nullable(),
  source_path: z.string().min(1),
  target_path: z.string().min(1),
  status_code: z.number().int().refine((n) => [301, 302, 307, 308].includes(n), "must be 301/302/307/308"),
  is_regex: z.boolean().default(false),
  enabled: z.boolean().default(true),
  notes: z.string().nullable().optional(),
});

export const saveRedirect = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => RedirectInput.parse(i))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await ensureStaff(supabase, userId);
    const row = {
      source_path: data.source_path, target_path: data.target_path,
      status_code: data.status_code, is_regex: data.is_regex,
      enabled: data.enabled, notes: data.notes ?? null,
    };
    if (data.id == null) {
      const id = await nextId(supabase, "redirects");
      const { error } = await supabase.from("redirects").insert({ id, ...row } as any);
      if (error) throw new Error(error.message);
      return { ok: true, id };
    }
    const { error } = await supabase.from("redirects").update(row).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true, id: data.id };
  });

export const deleteRedirect = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({ id: z.number().int() }).parse(i))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await ensureStaff(supabase, userId);
    const { error } = await supabase.from("redirects").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const toggleRedirect = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({ id: z.number().int(), enabled: z.boolean() }).parse(i))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await ensureStaff(supabase, userId);
    const { error } = await supabase.from("redirects").update({ enabled: data.enabled }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ===================== MEDIA MANAGEMENT =====================
const MediaAdminListInput = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(48),
  q: z.string().default(""),
  type: z.enum(["all", "image", "video", "other"]).default("all"),
});

export const listMediaAdmin = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => MediaAdminListInput.parse(i))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }): Promise<any> => {
    const { supabase, userId } = context;
    await ensureStaff(supabase, userId);
    let q = supabase
      .from("media")
      .select("id, url, alt_text, caption, title, filename, mime_type, width, height, filesize, uploaded_at, created_at, storage_path", { count: "exact" })
      .order("id", { ascending: false });
    if (data.q.trim()) {
      const t = data.q.trim();
      q = q.or(`filename.ilike.%${t}%,alt_text.ilike.%${t}%,title.ilike.%${t}%,caption.ilike.%${t}%`);
    }
    if (data.type === "image") q = q.like("mime_type", "image/%");
    else if (data.type === "video") q = q.like("mime_type", "video/%");
    else if (data.type === "other") q = q.not("mime_type", "like", "image/%").not("mime_type", "like", "video/%");
    const from = (data.page - 1) * data.pageSize;
    q = q.range(from, from + data.pageSize - 1);
    const { data: rows, count, error } = await q;
    if (error) throw new Error(error.message);
    const { rewriteLegacyUrl } = await import("@/lib/legacy-urls");
    const items = (rows ?? []).map((r: any) => ({ ...r, url: rewriteLegacyUrl(r.url) || r.url }));
    return { items, total: count ?? 0, page: data.page, pageSize: data.pageSize };
  });

const MediaUpdateInput = z.object({
  id: z.number().int(),
  alt_text: z.string().nullable().optional(),
  caption: z.string().nullable().optional(),
  title: z.string().nullable().optional(),
});

export const updateMedia = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => MediaUpdateInput.parse(i))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await ensureStaff(supabase, userId);
    const { error } = await supabase
      .from("media")
      .update({
        alt_text: data.alt_text ?? null,
        caption: data.caption ?? null,
        title: data.title ?? null,
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteMedia = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({ id: z.number().int() }).parse(i))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await ensureStaff(supabase, userId);
    // Detach posts that reference this featured image
    await supabase.from("posts").update({ featured_media_id: null }).eq("featured_media_id", data.id);
    const { data: row } = await supabase.from("media").select("storage_path").eq("id", data.id).maybeSingle();
    if (row?.storage_path) {
      try { await supabase.storage.from("wp-media").remove([row.storage_path as string]); } catch {}
    }
    const { error } = await supabase.from("media").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ===================== CATEGORY DUPLICATES =====================

type DupCat = { id: number; slug: string; name: string; post_count: number };
type DupPair = { a: DupCat; b: DupCat; reason: string; sample_a: string[]; sample_b: string[] };

function rootKey(slug: string): string {
  return slug.replace(/-pr$/, "").replace(/-\d+$/, "").replace(/-communications?$/, "");
}

export const findDuplicateCategories = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ pairs: DupPair[] }> => {
    const { supabase, userId } = context;
    await ensureStaff(supabase, userId);

    const { data: cats, error } = await supabase
      .from("categories")
      .select("id, slug, name, post_count")
      .order("post_count", { ascending: false });
    if (error) throw new Error(error.message);

    const list = (cats ?? []) as DupCat[];
    const byKey = new Map<string, DupCat[]>();
    for (const c of list) {
      const k = rootKey(c.slug);
      if (!k) continue;
      if (!byKey.has(k)) byKey.set(k, []);
      byKey.get(k)!.push(c);
    }

    const rawPairs: { a: DupCat; b: DupCat; reason: string }[] = [];
    for (const [, group] of byKey) {
      if (group.length < 2) continue;
      for (let i = 0; i < group.length; i++) {
        for (let j = i + 1; j < group.length; j++) {
          rawPairs.push({ a: group[i], b: group[j], reason: "shared root slug" });
        }
      }
    }

    // Hydrate with up to 3 sample post titles per category
    const ids = Array.from(new Set(rawPairs.flatMap((p) => [p.a.id, p.b.id])));
    const samples = new Map<number, string[]>();
    if (ids.length > 0) {
      const { data: pcs } = await supabase
        .from("post_categories")
        .select("category_id, posts!inner(title, status)")
        .in("category_id", ids)
        .eq("posts.status", "publish")
        .limit(500);
      for (const row of (pcs ?? []) as any[]) {
        const arr = samples.get(row.category_id) ?? [];
        if (arr.length < 3 && row.posts?.title) arr.push(row.posts.title);
        samples.set(row.category_id, arr);
      }
    }

    const pairs: DupPair[] = rawPairs
      .map((p) => ({
        ...p,
        sample_a: samples.get(p.a.id) ?? [],
        sample_b: samples.get(p.b.id) ?? [],
      }))
      .sort(
        (x, y) =>
          Math.max(y.a.post_count, y.b.post_count) - Math.max(x.a.post_count, x.b.post_count),
      );

    return { pairs };
  });

export const mergeCategoryPair = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) =>
    z.object({ winner_id: z.number().int(), loser_id: z.number().int() }).parse(i),
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await ensureStaff(supabase, userId);
    const { data: result, error } = await supabase.rpc("merge_categories", {
      p_winner_id: data.winner_id,
      p_loser_id: data.loser_id,
    });
    if (error) throw new Error(error.message);
    return result;
  });
