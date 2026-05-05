import { createServerFn } from "@tanstack/react-start";
import { supabaseAnon } from "@/integrations/supabase/client.anon.server";

export const lookupRedirect = createServerFn({ method: "GET" })
  .inputValidator((input: { path: string }) => ({ path: input.path }))
  .handler(async ({ data }) => {
    // Try the path verbatim and the trailing-slash variant — WP-era links
    // use trailing slashes but TanStack normalizes them off.
    const variants = [data.path];
    if (data.path.endsWith("/")) variants.push(data.path.replace(/\/+$/, ""));
    else variants.push(`${data.path}/`);

    const { data: row } = await supabaseAnon
      .from("redirects")
      .select("source_path, target_path, status_code")
      .in("source_path", variants)
      .eq("enabled", true)
      .limit(1)
      .maybeSingle();
    return row ? { target_path: row.target_path, status_code: row.status_code } : null;
  });
