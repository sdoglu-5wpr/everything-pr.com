import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { cached } from "@/serverFns/loader-cache.server";

const STAFF_ROLES = ["admin", "editor", "author"] as const;

async function ensureStaff(supabase: any, userId: string) {
  const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  if (!roles?.some((r: any) => (STAFF_ROLES as readonly string[]).includes(r.role))) {
    throw new Error("forbidden");
  }
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 200);
}

function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// ---------- GET: editor payload ----------
export const getAdminPost = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ id: z.number().int().nullable() }).parse(input))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }): Promise<any> => {
    const { supabase, userId } = context;
    await ensureStaff(supabase, userId);

    const meta = await cached("admin:editor:meta:v1", 60_000, async () => {
      const [c, t, a] = await Promise.all([
        supabase.from("categories").select("id, name, slug").order("name"),
        supabase.from("tags").select("id, name, slug").order("name"),
        supabase.from("authors").select("id, display_name, slug").order("display_name"),
      ]);
      return {
        categories: c.data ?? [],
        tags: t.data ?? [],
        authors: a.data ?? [],
      };
    });

    if (data.id == null) {
      return {
        post: null,
        seo: null,
        categoryIds: [] as number[],
        tagIds: [] as number[],
        featuredMedia: null as null | { id: number; url: string; alt_text: string | null },
        meta,
      };
    }

    const { data: post, error } = await supabase
      .from("posts")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!post) throw new Error("not_found");

    const [seoRes, pcRes, ptRes, mediaRes] = await Promise.all([
      supabase.from("seo_meta").select("*").eq("object_type", "post").eq("object_id", post.id).maybeSingle(),
      supabase.from("post_categories").select("category_id").eq("post_id", post.id),
      supabase.from("post_tags").select("tag_id").eq("post_id", post.id),
      post.featured_media_id
        ? supabase.from("media").select("id, url, alt_text").eq("id", post.featured_media_id).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    return {
      post,
      seo: seoRes.data ?? null,
      categoryIds: (pcRes.data ?? []).map((r: any) => r.category_id as number),
      tagIds: (ptRes.data ?? []).map((r: any) => r.tag_id as number),
      featuredMedia: mediaRes.data ?? null,
      meta,
    };
  });

// ---------- SAVE ----------
const PostInput = z.object({
  id: z.number().int().nullable(),
  title: z.string().min(1, "Title is required"),
  slug: z.string().min(1).max(200),
  type: z.enum(["post", "page"]),
  status: z.enum(["publish", "draft", "future", "private", "trash"]),
  excerpt: z.string().nullable(),
  content_html: z.string(),
  author_id: z.number().int().nullable(),
  featured_media_id: z.number().int().nullable(),
  published_at: z.string().nullable(),
  category_ids: z.array(z.number().int()),
  tag_ids: z.array(z.number().int()),
  seo: z.object({
    title: z.string().nullable(),
    description: z.string().nullable(),
    canonical_url: z.string().nullable(),
    robots: z.string().nullable(),
    og_title: z.string().nullable(),
    og_description: z.string().nullable(),
    og_image: z.string().nullable(),
    twitter_card: z.string().nullable(),
    twitter_title: z.string().nullable(),
    twitter_description: z.string().nullable(),
    twitter_image: z.string().nullable(),
    focus_keyword: z.string().nullable(),
    schema_jsonld: z.any().nullable(),
  }),
});

export const saveAdminPost = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => PostInput.parse(input))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await ensureStaff(supabase, userId);

    const slug = slugify(data.slug || data.title);
    if (!slug) throw new Error("Invalid slug");

    const content_text = htmlToText(data.content_html);
    const baseRow = {
      title: data.title,
      slug,
      type: data.type,
      status: data.status,
      excerpt: data.excerpt,
      content_html: data.content_html,
      content_text,
      author_id: data.author_id,
      featured_media_id: data.featured_media_id,
      published_at:
        data.status === "publish" && !data.published_at
          ? new Date().toISOString()
          : data.published_at,
      modified_at: new Date().toISOString(),
    };

    let postId = data.id;

    if (postId == null) {
      // generate next id (posts.id has no default in this schema)
      const { data: maxRow } = await supabase
        .from("posts")
        .select("id")
        .order("id", { ascending: false })
        .limit(1)
        .maybeSingle();
      const nextId = ((maxRow?.id as number | undefined) ?? 0) + 1;

      const { data: ins, error: insErr } = await supabase
        .from("posts")
        .insert({ id: nextId, ...baseRow })
        .select("id")
        .single();
      if (insErr) throw new Error(insErr.message);
      postId = ins.id as number;
    } else {
      // slug uniqueness check (best-effort)
      const { data: dupe } = await supabase
        .from("posts")
        .select("id")
        .eq("slug", slug)
        .neq("id", postId)
        .maybeSingle();
      if (dupe) throw new Error(`Slug "${slug}" is already used by post #${dupe.id}`);

      const { error: upErr } = await supabase.from("posts").update(baseRow).eq("id", postId);
      if (upErr) throw new Error(upErr.message);

      // snapshot revision
      await supabase.from("post_revisions").insert({
        post_id: postId,
        author_id: userId,
        title: data.title,
        excerpt: data.excerpt,
        content_html: data.content_html,
        content_text,
        kind: "manual",
      });
    }

    // taxonomies — replace
    await supabase.from("post_categories").delete().eq("post_id", postId);
    if (data.category_ids.length > 0) {
      await supabase.from("post_categories").insert(
        data.category_ids.map((cid) => ({ post_id: postId, category_id: cid })),
      );
    }
    await supabase.from("post_tags").delete().eq("post_id", postId);
    if (data.tag_ids.length > 0) {
      await supabase.from("post_tags").insert(
        data.tag_ids.map((tid) => ({ post_id: postId, tag_id: tid })),
      );
    }

    // SEO upsert
    const url_path = `/${slug}/`;
    const seoRow = {
      object_type: "post",
      object_id: postId,
      url_path,
      title: data.seo.title,
      description: data.seo.description,
      canonical_url: data.seo.canonical_url,
      robots: data.seo.robots,
      og_title: data.seo.og_title,
      og_description: data.seo.og_description,
      og_image: data.seo.og_image,
      twitter_card: data.seo.twitter_card,
      twitter_title: data.seo.twitter_title,
      twitter_description: data.seo.twitter_description,
      twitter_image: data.seo.twitter_image,
      schema_jsonld: data.seo.schema_jsonld,
      raw: { focus_keyword: data.seo.focus_keyword ?? null },
    };

    const { data: existingSeo } = await supabase
      .from("seo_meta")
      .select("id")
      .eq("object_type", "post")
      .eq("object_id", postId)
      .maybeSingle();
    if (existingSeo) {
      await supabase.from("seo_meta").update(seoRow).eq("id", existingSeo.id);
    } else {
      const { data: maxSeo } = await supabase
        .from("seo_meta")
        .select("id")
        .order("id", { ascending: false })
        .limit(1)
        .maybeSingle();
      const nextSeoId = ((maxSeo?.id as number | undefined) ?? 0) + 1;
      await supabase.from("seo_meta").insert({ id: nextSeoId, ...seoRow } as any);
    }

    return { ok: true, id: postId, slug };
  });

// ---------- MEDIA: list & upload ----------
const MediaListInput = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(40),
  q: z.string().default(""),
});

export const listMediaForPicker = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => MediaListInput.parse(input))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await ensureStaff(supabase, userId);

    let q = supabase
      .from("media")
      .select("id, url, alt_text, filename, mime_type, width, height", { count: "exact" })
      .order("id", { ascending: false });
    if (data.q.trim()) {
      q = q.or(`filename.ilike.%${data.q}%,alt_text.ilike.%${data.q}%,title.ilike.%${data.q}%`);
    }
    const from = (data.page - 1) * data.pageSize;
    const to = from + data.pageSize - 1;
    q = q.range(from, to);
    const { data: rows, count, error } = await q;
    if (error) throw new Error(error.message);

    const { rewriteLegacyUrl } = await import("@/lib/legacy-urls");
    const items = (rows ?? []).map((r: any) => ({
      ...r,
      url: rewriteLegacyUrl(r.url) || r.url,
    }));
    return { items, total: count ?? items.length, page: data.page, pageSize: data.pageSize };
  });

const UploadInput = z.object({
  filename: z.string().min(1),
  mime_type: z.string().min(1),
  // base64 (no data: prefix)
  data_base64: z.string().min(1),
  alt_text: z.string().nullable().optional(),
});

export const uploadMediaFromBase64 = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => UploadInput.parse(input))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await ensureStaff(supabase, userId);

    const safeName = data.filename.replace(/[^a-zA-Z0-9._-]+/g, "-");
    const now = new Date();
    const path = `uploads/${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}/${Date.now()}-${safeName}`;

    const buf = Buffer.from(data.data_base64, "base64");
    const { error: upErr } = await supabase.storage
      .from("wp-media")
      .upload(path, buf, { contentType: data.mime_type, upsert: false });
    if (upErr) throw new Error(`Upload failed: ${upErr.message}`);

    const { data: pub } = supabase.storage.from("wp-media").getPublicUrl(path);
    const url = pub.publicUrl;

    const { data: maxRow } = await supabase
      .from("media")
      .select("id")
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle();
    const nextId = ((maxRow?.id as number | undefined) ?? 0) + 1;

    const { data: ins, error: insErr } = await supabase
      .from("media")
      .insert({
        id: nextId,
        url,
        storage_path: path,
        filename: safeName,
        mime_type: data.mime_type,
        alt_text: data.alt_text ?? null,
        filesize: buf.byteLength,
        uploaded_at: now.toISOString(),
      })
      .select("id, url, alt_text, filename, mime_type, width, height")
      .single();
    if (insErr) throw new Error(insErr.message);
    return ins;
  });

// ---------- DELETE post ----------
export const deleteAdminPost = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ id: z.number().int() }).parse(input))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await ensureStaff(supabase, userId);
    await supabase.from("post_categories").delete().eq("post_id", data.id);
    await supabase.from("post_tags").delete().eq("post_id", data.id);
    await supabase.from("seo_meta").delete().eq("object_type", "post").eq("object_id", data.id);
    const { error } = await supabase.from("posts").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
