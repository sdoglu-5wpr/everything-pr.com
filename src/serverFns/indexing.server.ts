import { supabaseAnon } from "@/integrations/supabase/client.anon.server";

export { NOINDEX_HEADER } from "./indexing.constants";

export type IndexingState = {
  enabled: boolean;
  reason: string | null;
  source: "env" | "db" | "default";
};

/** Resolve indexing state. Env var (EPR_INDEXING_ENABLED) wins over DB. */
export async function resolveIndexingState(): Promise<IndexingState> {
  let state: IndexingState = { enabled: true, reason: null, source: "default" };

  const rawEnv = process.env.INDEXING_ENABLED ?? process.env.EPR_INDEXING_ENABLED;
  const env = rawEnv?.trim().toLowerCase();
  if (env !== undefined && env !== "") {
    state = {
      enabled: env === "true" || env === "1",
      reason: "INDEXING_ENABLED env var",
      source: "env",
    };
  } else {
    try {
      const { data } = await supabaseAnon
        .from("site_settings")
        .select("key, value")
        .in("key", ["indexing_enabled", "noindex_reason"]);
      const map = new Map((data ?? []).map((r) => [r.key, r.value as unknown]));
      const dbEnabled = map.get("indexing_enabled");
      if (dbEnabled !== undefined) {
        state = {
          enabled: dbEnabled === true || dbEnabled === "true",
          reason: (map.get("noindex_reason") as string | null) ?? null,
          source: "db",
        };
      }
    } catch (e) {
      console.error("[indexing] failed to read site_settings:", e);
    }
  }

  return state;
}
