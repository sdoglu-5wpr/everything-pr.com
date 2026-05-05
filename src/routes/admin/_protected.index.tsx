import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/_protected/")({
  component: AdminDashboard,
});

type Counts = { posts: number; pages: number; media: number; redirects: number };
type PostRow = { id: number; slug: string; title: string; status: string; modified_at: string | null; published_at?: string | null };

function Card({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 font-serif text-3xl font-bold">{value}</div>
    </div>
  );
}

function AdminDashboard() {
  const [counts, setCounts] = useState<Counts>({ posts: 0, pages: 0, media: 0, redirects: 0 });
  const [recent, setRecent] = useState<PostRow[]>([]);
  const [scheduled, setScheduled] = useState<PostRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const head = { count: "exact" as const, head: true };
        const [posts, pages, media, redirects, recentRes, scheduledRes] = await Promise.all([
          supabase.from("posts").select("id", head).eq("type", "post"),
          supabase.from("posts").select("id", head).eq("type", "page"),
          supabase.from("media").select("id", head),
          supabase.from("redirects").select("id", head),
          supabase.from("posts")
            .select("id, slug, title, status, modified_at")
            .order("modified_at", { ascending: false, nullsFirst: false })
            .limit(5),
          supabase.from("posts")
            .select("id, slug, title, status, published_at")
            .eq("status", "future")
            .order("published_at", { ascending: true })
            .limit(5),
        ]);
        if (cancelled) return;
        setCounts({
          posts: posts.count ?? 0,
          pages: pages.count ?? 0,
          media: media.count ?? 0,
          redirects: redirects.count ?? 0,
        });
        setRecent((recentRes.data ?? []) as PostRow[]);
        setScheduled((scheduledRes.data ?? []) as PostRow[]);
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading) return <p className="text-sm text-muted-foreground">Loading dashboard…</p>;
  if (error) {
    return (
      <div className="rounded border border-destructive/40 bg-destructive/10 p-4 text-sm">
        Failed to load dashboard: {error}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Overview of content and configuration.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card label="Posts" value={counts.posts} />
        <Card label="Pages" value={counts.pages} />
        <Card label="Media" value={counts.media} />
        <Card label="Redirects" value={counts.redirects} />
      </div>

      <section>
        <h2 className="font-serif text-lg font-bold mb-2">Recently edited</h2>
        <ul className="divide-y rounded border bg-card text-sm">
          {recent.length === 0 && <li className="p-3 text-muted-foreground">No posts yet.</li>}
          {recent.map(p => (
            <li key={p.id} className="flex items-center justify-between p-3">
              <Link to="/$slug" params={{ slug: p.slug }} className="hover:underline truncate">
                {p.title}
              </Link>
              <span className="text-xs text-muted-foreground ml-3 shrink-0">
                {p.status} · {p.modified_at ? new Date(p.modified_at).toLocaleString() : "—"}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="font-serif text-lg font-bold mb-2">Scheduled</h2>
        <ul className="divide-y rounded border bg-card text-sm">
          {scheduled.length === 0 && <li className="p-3 text-muted-foreground">No scheduled posts.</li>}
          {scheduled.map(p => (
            <li key={p.id} className="flex items-center justify-between p-3">
              <span className="truncate">{p.title}</span>
              <span className="text-xs text-muted-foreground ml-3 shrink-0">
                {p.published_at ? new Date(p.published_at).toLocaleString() : "—"}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
