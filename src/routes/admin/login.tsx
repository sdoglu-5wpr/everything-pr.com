import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
const STAFF_ROLES = ["admin", "editor", "author"] as const;

export const Route = createFileRoute("/admin/login")({
  component: AdminLogin,
});

const CONTACT = "emoraru@5wpr.com";

function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [inlineError, setInlineError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setInlineError(null);
    setBusy(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        const msg = `Login failed: ${error.message}${error.status ? ` (HTTP ${error.status})` : ""}`;
        toast.error(msg);
        setInlineError(msg);
        return;
      }
      if (!data.session) {
        const msg = "Login succeeded but no session was returned. Confirm your email if confirmation is enabled.";
        toast.error(msg);
        setInlineError(msg);
        return;
      }

      // Role gate — RLS lets the user read their own user_roles rows.
      const { data: roleRows, error: roleErr } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.session.user.id);
      if (roleErr) {
        const msg = `Could not verify your role: ${roleErr.message}`;
        toast.error(msg);
        setInlineError(msg);
        return;
      }
      const roles = (roleRows ?? []).map(r => r.role as string);
      const isStaff = roles.some(r => (STAFF_ROLES as readonly string[]).includes(r));
      if (!isStaff) {
        await supabase.auth.signOut();
        const msg = `Access denied — your account exists but doesn't have admin/editor/author privileges. Contact ${CONTACT}.`;
        toast.error(msg);
        setInlineError(msg);
        return;
      }
      toast.success("Signed in.");
      navigate({ to: "/admin" });
    } catch (err: any) {
      const msg = `Unexpected error: ${err?.message ?? String(err)}`;
      console.error("[admin/login]", err);
      toast.error(msg);
      setInlineError(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center p-6">
      <h1 className="mb-2 font-serif text-3xl font-bold">Admin sign in</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Staff only. Roles required: admin, editor, or author.
      </p>
      <form onSubmit={onSubmit} className="space-y-3">
        <input
          type="email" required autoFocus placeholder="email"
          className="w-full rounded border bg-background p-2"
          value={email} onChange={e => setEmail(e.target.value)}
        />
        <input
          type="password" required minLength={6} placeholder="password"
          className="w-full rounded border bg-background p-2"
          value={password} onChange={e => setPassword(e.target.value)}
        />
        <button
          type="submit" disabled={busy}
          className="w-full rounded bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50"
        >
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>

      {inlineError && (
        <div className="mt-4 rounded border border-destructive/40 bg-destructive/10 p-3 text-sm">
          {inlineError}
        </div>
      )}
    </main>
  );
}
