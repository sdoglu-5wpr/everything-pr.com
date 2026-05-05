import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Bootstrap: first authenticated user becomes admin if no admin exists.
 * Calls the SECURITY DEFINER `claim_first_admin()` RPC, which enforces the
 * "no existing admin" guarantee server-side.
 */
export const claimFirstAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase.rpc("claim_first_admin");
    if (error) return { ok: false as const, error: error.message };
    return data as { ok: boolean; error?: string; user_id?: string };
  });

/**
 * Trigger the local data importer. Only works in environments that:
 *   - have node available (i.e. local `bun run dev`),
 *   - have the `data/` directory present on disk,
 *   - run the caller as an admin.
 *
 * In production (Cloudflare Worker) this returns a 501 explaining that the
 * importer is a local-only tool. The script itself uses the service-role key
 * from process.env, so it never runs from the browser.
 */
export const triggerImport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { only?: string; truncate?: boolean }) => input)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Admin gate
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    if (!roles?.some(r => r.role === "admin")) {
      return { ok: false as const, error: "forbidden" };
    }

    // Production worker guard
    if (typeof spawn !== "function" || !existsSync(resolve("./scripts/import-content.ts"))) {
      return {
        ok: false as const,
        error: "Import is local-only. Run `bun run scripts/import-content.ts` on a machine with /data/.",
      };
    }
    if (!existsSync(resolve("./data"))) {
      return { ok: false as const, error: "No ./data directory present in this environment." };
    }

    const args = ["run", "scripts/import-content.ts"];
    if (data.only) args.push("--only", data.only);
    if (data.truncate) args.push("--truncate");

    return await new Promise<{ ok: boolean; output?: string; error?: string }>(resolveP => {
      const child = spawn("bun", args, {
        env: { ...process.env },
        stdio: ["ignore", "pipe", "pipe"],
      });
      let out = "";
      child.stdout.on("data", c => { out += c.toString(); });
      child.stderr.on("data", c => { out += c.toString(); });
      child.on("close", code => {
        // Ensure interface returns a valid object with `ok` boolean
        if (code === 0) resolveP({ ok: true, output: out });
        else resolveP({ ok: false, error: `exit ${code}`, output: out });
      });
      child.on("error", err => {
        // Use the captured stderr/stdout in `out` along with the spawn error message
        const detail = out ? `${err.message}\n${out}` : err.message;
        resolveP({ ok: false, error: detail });
      });
    });
  });
