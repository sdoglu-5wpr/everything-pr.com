import { createFileRoute, Link, Outlet, redirect, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const STAFF_ROLES = ["admin", "editor", "author"] as const;

type Me = { userId: string; email: string | null; roles: string[]; isStaff: boolean };

export const Route = createFileRoute("/admin/_protected")({
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/admin/login" });
  },
  component: AdminLayout,
});

const NAV: Array<{ label: string; to: string }> = [
  { label: "Dashboard", to: "/admin" },
  { label: "Posts", to: "/admin/posts" },
  { label: "Import (WP)", to: "/admin/import" },
  { label: "Pages", to: "/admin" },
  { label: "Media", to: "/admin" },
  { label: "Categories", to: "/admin" },
  { label: "Tags", to: "/admin" },
  { label: "Authors", to: "/admin" },
  { label: "Redirects", to: "/admin" },
  { label: "Menus", to: "/admin" },
  { label: "SEO", to: "/admin" },
  { label: "Automations", to: "/admin" },
  { label: "Settings", to: "/admin" },
  { label: "Activity", to: "/admin" },
];

function AdminLayout() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: s => s.location.pathname });
  const [me, setMe] = useState<Me | null>(null);
  const [accessError, setAccessError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: sess } = await supabase.auth.getSession();
        if (!sess.session) { navigate({ to: "/admin/login" }); return; }
        const userId = sess.session.user.id;
        const email = sess.session.user.email ?? null;
        const { data: rows, error } = await supabase
          .from("user_roles").select("role").eq("user_id", userId);
        if (cancelled) return;
        if (error) { setAccessError(error.message); return; }
        const roles = (rows ?? []).map(r => r.role as string);
        const isStaff = roles.some(r => (STAFF_ROLES as readonly string[]).includes(r));
        setMe({ userId, email, roles, isStaff });
      } catch (e: any) {
        if (!cancelled) setAccessError(e?.message ?? String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [navigate]);

  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) toast.error(`Logout failed: ${error.message}`);
    navigate({ to: "/admin/login" });
  };

  if (loading) {
    return <main className="p-8 text-sm text-muted-foreground">Loading…</main>;
  }

  if (accessError || !me) {
    return (
      <main className="mx-auto max-w-lg p-8">
        <h1 className="font-serif text-2xl font-bold">Access error</h1>
        <p className="mt-2 text-sm text-muted-foreground">{accessError ?? "Unknown error"}</p>
        <button onClick={logout} className="mt-4 rounded bg-primary px-3 py-1.5 text-sm text-primary-foreground">
          Sign out
        </button>
      </main>
    );
  }

  if (!me.isStaff) {
    return (
      <main className="mx-auto max-w-lg p-8">
        <h1 className="font-serif text-2xl font-bold">Access denied</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your account exists but doesn't have admin/editor/author privileges.
          Contact <a href="mailto:emoraru@5wpr.com" className="underline">emoraru@5wpr.com</a>.
        </p>
        <button onClick={logout} className="mt-4 rounded bg-primary px-3 py-1.5 text-sm text-primary-foreground">
          Sign out
        </button>
      </main>
    );
  }

  return (
    <div className="min-h-screen flex bg-background">
      <aside className="w-56 shrink-0 border-r bg-surface-soft">
        <div className="px-4 py-4 border-b font-serif text-lg font-bold">Everything-PR</div>
        <nav className="p-2 space-y-1 text-sm">
          {NAV.map(item => (
            <Link
              key={item.label}
              to={item.to}
              className={`block rounded px-3 py-1.5 hover:bg-muted ${
                pathname === item.to ? "bg-muted font-semibold" : ""
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b flex items-center justify-between px-4">
          <div className="text-sm text-muted-foreground">Admin</div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-foreground">{me.email ?? me.userId}</span>
            <span className="text-xs text-muted-foreground">[{me.roles.join(", ")}]</span>
            <button onClick={logout} className="rounded border px-3 py-1.5 hover:bg-muted">
              Logout
            </button>
          </div>
        </header>
        <main className="flex-1 p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
