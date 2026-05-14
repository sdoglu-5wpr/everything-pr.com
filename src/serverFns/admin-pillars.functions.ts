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

export const listPillars = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<any> => {
    const { supabase, userId } = context;
    await ensureStaff(supabase, userId);
    const { data, error } = await supabase
      .from("pillars")
      .select("id, slug, title, subtitle, published, robots, hero_image_url, updated_at")
      .order("title");
    if (error) throw new Error(error.message);
    return { items: data ?? [] };
  });

const PillarPatch = z.object({
  id: z.number().int(),
  robots: z.string().nullable().optional(),
  published: z.boolean().optional(),
});

export const updatePillarFlags = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => PillarPatch.parse(i))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await ensureStaff(supabase, userId);
    const patch: Record<string, any> = { updated_at: new Date().toISOString() };
    if (data.robots !== undefined) patch.robots = data.robots;
    if (data.published !== undefined) patch.published = data.published;
    const { error } = await supabase.from("pillars").update(patch as any).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
