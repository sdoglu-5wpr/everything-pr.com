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

// ==================== MENUS ====================
export const listMenus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<any> => {
    const { supabase, userId } = context;
    await ensureStaff(supabase, userId);
    const { data: menus, error } = await supabase
      .from("menus").select("id, name, slug, location").order("name");
    if (error) throw new Error(error.message);
    const { data: items } = await supabase
      .from("menu_items").select("id, menu_id, parent_id, label, url, target, rel, position, object_type, object_id")
      .order("position");
    return { menus: menus ?? [], items: items ?? [] };
  });

const MenuInput = z.object({
  id: z.number().int().nullable(),
  name: z.string().min(1),
  slug: z.string().optional().default(""),
  location: z.string().nullable().optional(),
});
export const saveMenu = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => MenuInput.parse(i))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await ensureStaff(supabase, userId);
    const slug = (data.slug || slugify(data.name)) || slugify(data.name);
    if (data.id) {
      const { error } = await supabase.from("menus").update({
        name: data.name, slug, location: data.location ?? null, updated_at: new Date().toISOString(),
      }).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const id = await nextId(supabase, "menus");
    const { error } = await supabase.from("menus").insert({ id, name: data.name, slug, location: data.location ?? null });
    if (error) throw new Error(error.message);
    return { id };
  });

export const deleteMenu = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({ id: z.number().int() }).parse(i))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await ensureStaff(supabase, userId);
    await supabase.from("menu_items").delete().eq("menu_id", data.id);
    const { error } = await supabase.from("menus").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const MenuItemInput = z.object({
  id: z.number().int().nullable(),
  menu_id: z.number().int(),
  label: z.string().min(1),
  url: z.string().min(1),
  target: z.string().nullable().optional(),
  rel: z.string().nullable().optional(),
  parent_id: z.number().int().nullable().optional(),
  position: z.number().int().optional(),
});
export const saveMenuItem = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => MenuItemInput.parse(i))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await ensureStaff(supabase, userId);
    const row = {
      menu_id: data.menu_id, label: data.label, url: data.url,
      target: data.target ?? null, rel: data.rel ?? null,
      parent_id: data.parent_id ?? null, position: data.position ?? 0,
      updated_at: new Date().toISOString(),
    };
    if (data.id) {
      const { error } = await supabase.from("menu_items").update(row).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const id = await nextId(supabase, "menu_items");
    const { error } = await supabase.from("menu_items").insert({ id, ...row });
    if (error) throw new Error(error.message);
    return { id };
  });

export const deleteMenuItem = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({ id: z.number().int() }).parse(i))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await ensureStaff(supabase, userId);
    const { error } = await supabase.from("menu_items").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const reorderMenuItems = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({
    items: z.array(z.object({ id: z.number().int(), position: z.number().int(), parent_id: z.number().int().nullable() }))
  }).parse(i))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await ensureStaff(supabase, userId);
    for (const it of data.items) {
      await supabase.from("menu_items")
        .update({ position: it.position, parent_id: it.parent_id, updated_at: new Date().toISOString() })
        .eq("id", it.id);
    }
    return { ok: true };
  });

// ==================== SETTINGS ====================
export const listSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<any> => {
    const { supabase, userId } = context;
    await ensureStaff(supabase, userId);
    const { data, error } = await supabase.from("site_settings").select("key, value, updated_at").order("key");
    if (error) throw new Error(error.message);
    return { items: data ?? [] };
  });

export const saveSetting = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({ key: z.string().min(1), value: z.any() }).parse(i))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await ensureStaff(supabase, userId);
    const { error } = await supabase.from("site_settings")
      .upsert({ key: data.key, value: data.value, updated_at: new Date().toISOString() }, { onConflict: "key" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteSetting = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({ key: z.string() }).parse(i))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await ensureStaff(supabase, userId);
    const { error } = await supabase.from("site_settings").delete().eq("key", data.key);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ==================== ACTIVITY ====================
export const listActivity = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({
    page: z.number().int().min(1).default(1),
    pageSize: z.number().int().min(1).max(200).default(50),
    table: z.string().optional().nullable(),
  }).parse(i))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }): Promise<any> => {
    const { supabase, userId } = context;
    await ensureStaff(supabase, userId);
    const from = (data.page - 1) * data.pageSize;
    let q = supabase.from("activity_log").select("id, action, table_name, row_id, actor_id, occurred_at, diff", { count: "exact" });
    if (data.table) q = q.eq("table_name", data.table);
    const { data: rows, error, count } = await q.order("occurred_at", { ascending: false }).range(from, from + data.pageSize - 1);
    if (error) throw new Error(error.message);
    return { items: rows ?? [], total: count ?? 0 };
  });

// ==================== AUTOMATIONS ====================
export const listAutomations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<any> => {
    const { supabase, userId } = context;
    await ensureStaff(supabase, userId);
    const { data, error } = await supabase.from("automations")
      .select("id, name, description, trigger_type, schedule, enabled, last_run_at, last_status, last_error, config")
      .order("name");
    if (error) throw new Error(error.message);
    return { items: data ?? [] };
  });

const AutomationInput = z.object({
  id: z.number().int().nullable(),
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  trigger_type: z.string().default("cron"),
  schedule: z.string().nullable().optional(),
  enabled: z.boolean().default(true),
  config: z.any().optional(),
});

export const saveAutomation = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => AutomationInput.parse(i))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await ensureStaff(supabase, userId);
    const row = {
      name: data.name, description: data.description ?? null,
      trigger_type: data.trigger_type, schedule: data.schedule ?? null,
      enabled: data.enabled, config: data.config ?? {},
      updated_at: new Date().toISOString(),
    };
    if (data.id) {
      const { error } = await supabase.from("automations").update(row).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: ins, error } = await supabase.from("automations").insert(row).select("id").maybeSingle();
    if (error) throw new Error(error.message);
    return { id: ins?.id };
  });

export const deleteAutomation = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({ id: z.number().int() }).parse(i))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await ensureStaff(supabase, userId);
    const { error } = await supabase.from("automations").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const toggleAutomation = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({ id: z.number().int(), enabled: z.boolean() }).parse(i))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await ensureStaff(supabase, userId);
    const { error } = await supabase.from("automations")
      .update({ enabled: data.enabled, updated_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
