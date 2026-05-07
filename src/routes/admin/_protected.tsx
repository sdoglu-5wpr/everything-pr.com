import { createFileRoute, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { LogOut, ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

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

function AdminLayout() {
  const navigate = useNavigate();
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

        // Try cached roles (per-session) to skip the round-trip on subsequent navigations.
        const cacheKey = `admin:roles:${userId}`;
        let roles: string[] | null = null;
        try {
          const raw = sessionStorage.getItem(cacheKey);
          if (raw) roles = JSON.parse(raw);
        } catch {}

        if (!roles) {
          const { data: rows, error } = await supabase
            .from("user_roles").select("role").eq("user_id", userId);
          if (cancelled) return;
          if (error) { setAccessError(error.message); return; }
          roles = (rows ?? []).map(r => r.role as string);
          try { sessionStorage.setItem(cacheKey, JSON.stringify(roles)); } catch {}
        }

        const isStaff = roles.some(r => (STAFF_ROLES as readonly string[]).includes(r));
        if (!cancelled) setMe({ userId, email, roles, isStaff });
      } catch (e: any) {
        if (!cancelled) setAccessError(e?.message ?? String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [navigate]);

  const logout = async () => {
    try { sessionStorage.removeItem(`admin:roles:${me?.userId ?? ""}`); } catch {}
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

  const initials = (me.email ?? "?").slice(0, 2).toUpperCase();
  const primaryRole = me.roles[0] ?? "user";

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-admin-surface">
        <AdminSidebar />
        <SidebarInset className="bg-admin-surface">
          <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b bg-background/80 backdrop-blur px-4">
            <div className="flex items-center gap-2">
              <SidebarTrigger />
              <div className="hidden sm:block h-5 w-px bg-border" />
              <div className="hidden sm:block text-sm text-muted-foreground">Admin workspace</div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted text-sm">
                <Avatar className="h-7 w-7">
                  <AvatarFallback className="bg-primary text-primary-foreground text-[11px] font-medium">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden md:flex flex-col items-start leading-tight">
                  <span className="text-foreground">{me.email ?? me.userId}</span>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{primaryRole}</span>
                </div>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <div className="font-medium">{me.email}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{me.roles.join(", ")}</div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive">
                  <LogOut className="h-4 w-4 mr-2" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </header>
          <main className="flex-1 p-6 overflow-auto">
            <Outlet />
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
