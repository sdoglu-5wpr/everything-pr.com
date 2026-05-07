import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const STAFF_ROLES = ["admin", "editor", "author"] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

export const getMyRoles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId, claims } = context;
    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    const roles = (data ?? []).map(r => r.role as StaffRole);
    const isStaff = roles.some(r => (STAFF_ROLES as readonly string[]).includes(r));
    return {
      userId,
      email: (claims?.email as string | undefined) ?? null,
      roles,
      isStaff,
    };
  });

export const getAdminDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    if (!roles?.some(r => (STAFF_ROLES as readonly string[]).includes(r.role))) {
      throw new Error("forbidden");
    }

    const countOpts = { count: "exact" as const, head: true };
    const [posts, pages, media, redirects, drafts, cats, tags, recent, scheduled, activity] = await Promise.all([
      supabaseAdmin.from("posts").select("id", countOpts).eq("type", "post"),
      supabaseAdmin.from("posts").select("id", countOpts).eq("type", "page"),
      supabaseAdmin.from("media").select("id", countOpts),
      supabaseAdmin.from("redirects").select("id", countOpts),
      supabaseAdmin.from("posts").select("id", countOpts).eq("status", "draft"),
      supabaseAdmin.from("categories").select("id", countOpts),
      supabaseAdmin.from("tags").select("id", countOpts),
      supabaseAdmin
        .from("posts")
        .select("id, slug, title, status, modified_at")
        .order("modified_at", { ascending: false, nullsFirst: false })
        .limit(6),
      supabaseAdmin
        .from("posts")
        .select("id, slug, title, status, published_at")
        .eq("status", "future")
        .order("published_at", { ascending: true })
        .limit(50),
      supabaseAdmin
        .from("activity_log")
        .select("id, action, table_name, row_id, occurred_at")
        .order("occurred_at", { ascending: false })
        .limit(8),
    ]);

    return {
      counts: {
        posts: posts.count ?? 0,
        pages: pages.count ?? 0,
        media: media.count ?? 0,
        redirects: redirects.count ?? 0,
        drafts: drafts.count ?? 0,
        categories: cats.count ?? 0,
        tags: tags.count ?? 0,
      },
      recent: recent.data ?? [],
      scheduled: scheduled.data ?? [],
      activity: activity.data ?? [],
    };
  });
