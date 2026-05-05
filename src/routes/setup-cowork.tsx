import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { claimFirstAdmin } from "@/server/admin.functions";

export const Route = createFileRoute("/setup-cowork")({
  component: SetupCowork,
});

type State =
  | { kind: "checking" }
  | { kind: "needs-auth" }
  | { kind: "claiming" }
  | { kind: "success"; userId: string }
  | { kind: "already-setup" }
  | { kind: "error"; message: string };

function SetupCowork() {
  const [state, setState] = useState<State>({ kind: "checking" });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const claim = useServerFn(claimFirstAdmin);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, error: sessErr } = await supabase.auth.getSession();
        if (cancelled) return;
        if (sessErr) {
          const msg = `Session check failed: ${sessErr.message}`;
          console.error("[setup-cowork]", sessErr);
          toast.error(msg);
          setState({ kind: "error", message: msg });
          return;
        }
        if (!data.session) { setState({ kind: "needs-auth" }); return; }
        setState({ kind: "claiming" });
        const res = await claim();
        if (cancelled) return;
        if (res.ok) {
          setState({ kind: "success", userId: res.user_id ?? "" });
        } else if (res.error === "already_setup") {
          setState({ kind: "already-setup" });
        } else {
          const msg = `claim_first_admin failed: ${res.error ?? "(no error message returned)"}`;
          console.error("[setup-cowork] claim returned error:", res);
          toast.error(msg);
          setState({ kind: "error", message: msg });
        }
      } catch (e: any) {
        if (cancelled) return;
        const detail = [
          e?.message,
          e?.code ? `code=${e.code}` : null,
          e?.details ? `details=${e.details}` : null,
          e?.hint ? `hint=${e.hint}` : null,
        ].filter(Boolean).join(" · ");
        const msg = `Bootstrap threw: ${detail || String(e)}`;
        console.error("[setup-cowork] threw:", e);
        toast.error(msg);
        setState({ kind: "error", message: msg });
      }
    })();
    return () => { cancelled = true; };
  }, [claim]);

  useEffect(() => {
    if (state.kind === "success") {
      const t = setTimeout(() => navigate({ to: "/" }), 1500);
      return () => clearTimeout(t);
    }
  }, [state, navigate]);

  const signIn = async (mode: "signin" | "signup") => {
    setAuthBusy(true);
    try {
      const { data, error } =
        mode === "signup"
          ? await supabase.auth.signUp({
              email,
              password,
              options: { emailRedirectTo: `${window.location.origin}/setup-cowork` },
            })
          : await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        toast.error(`${mode === "signup" ? "Sign up" : "Sign in"} failed: ${error.message}`);
        setState({ kind: "error", message: error.message });
        return;
      }

      if (mode === "signup" && !data.session) {
        // Email confirmation is enabled — no session returned, signup won't proceed to claim.
        toast.info("Check your inbox to confirm your email, then return here.");
        setState({
          kind: "error",
          message:
            "Email confirmation required. Confirm via the email we sent, then reload. For staging, disable 'Confirm email' in Supabase Auth settings.",
        });
        return;
      }

      setState({ kind: "checking" });
      window.location.reload();
    } catch (e: any) {
      const message = e?.message ?? String(e);
      toast.error(`Unexpected error: ${message}`);
      setState({ kind: "error", message });
    } finally {
      setAuthBusy(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center p-6">
      <h1 className="mb-2 text-2xl font-semibold">Admin bootstrap</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        First authenticated user becomes admin if no admin exists. Subsequent visits return 403.
      </p>

      {state.kind === "checking" && <p>Checking session…</p>}

      {state.kind === "needs-auth" && (
        <form
          className="space-y-3"
          onSubmit={e => { e.preventDefault(); signIn("signin"); }}
        >
          <input
            className="w-full rounded border bg-background p-2"
            type="email" placeholder="email" value={email}
            onChange={e => setEmail(e.target.value)} required
          />
          <input
            className="w-full rounded border bg-background p-2"
            type="password" placeholder="password (min 6)" value={password}
            onChange={e => setPassword(e.target.value)} required minLength={6}
          />
          <div className="flex gap-2">
            <button type="submit" disabled={authBusy}
              className="flex-1 rounded bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50">
              Sign in
            </button>
            <button type="button" disabled={authBusy} onClick={() => signIn("signup")}
              className="flex-1 rounded border px-4 py-2 disabled:opacity-50">
              Sign up
            </button>
          </div>
        </form>
      )}

      {state.kind === "claiming" && <p>Claiming admin…</p>}

      {state.kind === "success" && (
        <div className="rounded border border-green-600/30 bg-green-600/10 p-4">
          <p className="font-medium">✓ You are now admin.</p>
          <p className="text-sm text-muted-foreground">Redirecting…</p>
        </div>
      )}

      {state.kind === "already-setup" && (
        <div className="rounded border border-destructive/40 bg-destructive/10 p-4">
          <p className="font-medium">403 — Setup already complete.</p>
          <p className="text-sm text-muted-foreground">
            An admin already exists. Use the regular login flow.
          </p>
        </div>
      )}

      {state.kind === "error" && (
        <div className="rounded border border-destructive/40 bg-destructive/10 p-4">
          <p className="font-medium">Error</p>
          <p className="text-sm">{state.message}</p>
        </div>
      )}
    </main>
  );
}
