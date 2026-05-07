import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  FileText, FileType2, Image as ImageIcon, ArrowRightLeft, Tag, FolderTree,
  Plus, Upload, Sparkles, Clock, CalendarDays, ArrowUpRight, Activity,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/admin/_protected/")({
  component: AdminDashboard,
});

type Counts = {
  posts: number; pages: number; media: number; redirects: number;
  drafts: number; categories: number; tags: number;
};
type PostRow = { id: number; slug: string; title: string; status: string; modified_at: string | null; published_at?: string | null };
type ActivityRow = { id: number; action: string; table_name: string; row_id: string | null; occurred_at: string };

function StatCard({
  label, value, icon: Icon, to, accent,
}: { label: string; value: number | null; icon: any; to: string; accent: string }) {
  return (
    <Link
      to={to}
      className="group relative rounded-xl border bg-card p-4 hover:shadow-md hover:border-foreground/20 transition-all"
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
          <div className="mt-1 text-3xl font-serif font-bold tabular-nums">
            {value === null ? <Skeleton className="h-9 w-16" /> : value.toLocaleString()}
          </div>
        </div>
        <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${accent}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <ArrowUpRight className="absolute bottom-3 right-3 h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
    </Link>
  );
}

function statusVariant(s: string): "default" | "secondary" | "outline" | "destructive" {
  if (s === "publish") return "default";
  if (s === "draft") return "secondary";
  if (s === "future") return "outline";
  return "outline";
}

function timeAgo(iso: string | null): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

function AdminDashboard() {
  const [counts, setCounts] = useState<Counts | null>(null);
  const [recent, setRecent] = useState<PostRow[]>([]);
  const [scheduled, setScheduled] = useState<PostRow[]>([]);
  const [activity, setActivity] = useState<ActivityRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const head = { count: "exact" as const, head: true };
        const [posts, pages, media, redirects, drafts, cats, tags, recentRes, scheduledRes, actRes] = await Promise.all([
          supabase.from("posts").select("id", head).eq("type", "post"),
          supabase.from("posts").select("id", head).eq("type", "page"),
          supabase.from("media").select("id", head),
          supabase.from("redirects").select("id", head),
          supabase.from("posts").select("id", head).eq("status", "draft"),
          supabase.from("categories").select("id", head),
          supabase.from("tags").select("id", head),
          supabase.from("posts")
            .select("id, slug, title, status, modified_at")
            .order("modified_at", { ascending: false, nullsFirst: false })
            .limit(6),
          supabase.from("posts")
            .select("id, slug, title, status, published_at")
            .eq("status", "future")
            .order("published_at", { ascending: true })
            .limit(50),
          supabase.from("activity_log")
            .select("id, action, table_name, row_id, occurred_at")
            .order("occurred_at", { ascending: false })
            .limit(8),
        ]);
        if (cancelled) return;
        setCounts({
          posts: posts.count ?? 0,
          pages: pages.count ?? 0,
          media: media.count ?? 0,
          redirects: redirects.count ?? 0,
          drafts: drafts.count ?? 0,
          categories: cats.count ?? 0,
          tags: tags.count ?? 0,
        });
        setRecent((recentRes.data ?? []) as PostRow[]);
        setScheduled((scheduledRes.data ?? []) as PostRow[]);
        setActivity((actRes.data ?? []) as ActivityRow[]);
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? String(e));
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm">
        Failed to load dashboard: {error}
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[1400px]">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Overview of your content, scheduled posts and recent activity.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/admin/posts/new"
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            <Plus className="h-4 w-4" /> New post
          </Link>
          <Link to="/admin/media"
            className="inline-flex items-center gap-1.5 rounded-md border bg-background px-3 py-2 text-sm font-medium hover:bg-muted">
            <Upload className="h-4 w-4" /> Upload media
          </Link>
          <Link to="/admin/import"
            className="inline-flex items-center gap-1.5 rounded-md border bg-background px-3 py-2 text-sm font-medium hover:bg-muted">
            <Sparkles className="h-4 w-4" /> Import (WP)
          </Link>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Posts" value={counts?.posts ?? null} icon={FileText} to="/admin/posts" accent="bg-blue-50 text-blue-600" />
        <StatCard label="Pages" value={counts?.pages ?? null} icon={FileType2} to="/admin/posts" accent="bg-emerald-50 text-emerald-600" />
        <StatCard label="Media" value={counts?.media ?? null} icon={ImageIcon} to="/admin/media" accent="bg-purple-50 text-purple-600" />
        <StatCard label="Redirects" value={counts?.redirects ?? null} icon={ArrowRightLeft} to="/admin/redirects" accent="bg-amber-50 text-amber-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recently edited */}
        <section className="lg:col-span-2 rounded-xl border bg-card overflow-hidden">
          <header className="flex items-center justify-between border-b px-4 py-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <h2 className="font-semibold">Recently edited</h2>
            </div>
            <Link to="/admin/posts" className="text-xs text-muted-foreground hover:text-foreground">
              View all →
            </Link>
          </header>
          <div className="divide-y">
            {!counts ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="px-4 py-3 flex items-center justify-between gap-3">
                  <Skeleton className="h-4 w-2/3" /><Skeleton className="h-4 w-20" />
                </div>
              ))
            ) : recent.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-muted-foreground">
                No posts yet. <Link to="/admin/posts/new" className="text-primary hover:underline">Write your first one →</Link>
              </div>
            ) : (
              recent.map((p) => (
                <Link key={p.id} to="/admin/posts/$id" params={{ id: String(p.id) }}
                  className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-admin-hover transition-colors">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate">{p.title || "(no title)"}</div>
                    <div className="text-xs text-muted-foreground font-mono truncate">/{p.slug}</div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <Badge variant={statusVariant(p.status)} className="capitalize">{p.status}</Badge>
                    <span className="text-xs text-muted-foreground tabular-nums w-16 text-right">{timeAgo(p.modified_at)}</span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </section>

        {/* Right column */}
        <div className="space-y-4">
          {/* Scheduled */}
          <section className="rounded-xl border bg-card overflow-hidden">
            <header className="flex items-center justify-between border-b px-4 py-3">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                <h2 className="font-semibold">Scheduled</h2>
              </div>
              <Badge variant="secondary">{scheduled.length}</Badge>
            </header>
            <div className="divide-y">
              {!counts ? (
                <div className="px-4 py-3"><Skeleton className="h-4 w-full" /></div>
              ) : scheduled.length === 0 ? (
                <div className="px-4 py-6 text-center text-sm text-muted-foreground">No scheduled posts.</div>
              ) : (
                scheduled.map((p) => (
                  <Link key={p.id} to="/admin/posts/$id" params={{ id: String(p.id) }}
                    className="block px-4 py-3 hover:bg-admin-hover">
                    <div className="font-medium text-sm truncate">{p.title}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {p.published_at ? new Date(p.published_at).toLocaleString() : "—"}
                    </div>
                  </Link>
                ))
              )}
            </div>
          </section>

          {/* Quick stats */}
          <section className="rounded-xl border bg-card p-4">
            <h2 className="font-semibold mb-3">At a glance</h2>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-muted-foreground"><FileText className="h-3.5 w-3.5" /> Drafts</span>
                <span className="font-medium tabular-nums">{counts?.drafts ?? "—"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-muted-foreground"><FolderTree className="h-3.5 w-3.5" /> Categories</span>
                <span className="font-medium tabular-nums">{counts?.categories ?? "—"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-muted-foreground"><Tag className="h-3.5 w-3.5" /> Tags</span>
                <span className="font-medium tabular-nums">{counts?.tags ?? "—"}</span>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Activity */}
      <section className="rounded-xl border bg-card overflow-hidden">
        <header className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-muted-foreground" />
            <h2 className="font-semibold">Recent activity</h2>
          </div>
          <Link to="/admin/activity" className="text-xs text-muted-foreground hover:text-foreground">
            View all →
          </Link>
        </header>
        <div className="divide-y">
          {!counts ? (
            <div className="px-4 py-3"><Skeleton className="h-4 w-full" /></div>
          ) : activity.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">No activity yet.</div>
          ) : (
            activity.map((a) => (
              <div key={a.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                <Badge variant="outline" className="font-mono text-[10px] uppercase">{a.action}</Badge>
                <span className="font-mono text-xs text-muted-foreground">{a.table_name}</span>
                {a.row_id && <span className="font-mono text-xs text-muted-foreground">#{a.row_id}</span>}
                <span className="ml-auto text-xs text-muted-foreground tabular-nums">{timeAgo(a.occurred_at)}</span>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
