import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, ExternalLink } from "lucide-react";
import { listPillars, updatePillarFlags } from "@/serverFns/admin-pillars.functions";

export const Route = createFileRoute("/admin-everything/_protected/pillars")({
  component: PillarsAdminPage,
});

type Row = {
  id: number;
  slug: string;
  title: string;
  subtitle: string | null;
  published: boolean;
  robots: string | null;
  hero_image_url: string | null;
  updated_at: string;
};

// Robots semantics:
//   robots = NULL          → page is indexable on production (everything-pr.com)
//   robots = "noindex, …"  → page is forced noindex on production
// Lovable preview hosts always emit noindex regardless of this column.

function PillarsAdminPage() {
  const [items, setItems] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);

  const refresh = async () => {
    setLoading(true);
    try {
      const r = await listPillars();
      setItems(r.items as Row[]);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to load");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { refresh(); }, []);

  const patch = async (id: number, fields: { robots?: string | null; published?: boolean }) => {
    setSavingId(id);
    try {
      await updatePillarFlags({ data: { id, ...fields } });
      setItems((prev) => prev.map((p) => (p.id === id ? { ...p, ...fields } as Row : p)));
      toast.success("Saved");
    } catch (e: any) {
      toast.error(e?.message ?? "Save failed");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold">Pillar pages</h1>
          <p className="text-sm text-muted-foreground">
            Toggle indexing for vertical landing pages. Defaults to <code>noindex, follow</code> until copy is finalized.
          </p>
        </div>
      </div>

      <div className="rounded-lg bg-white border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/40">
            <tr className="text-left">
              <th className="px-3 py-2">Title</th>
              <th className="px-3 py-2">Slug</th>
              <th className="px-3 py-2">Published</th>
              <th className="px-3 py-2">Robots</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={5} className="px-3 py-6 text-center"><Loader2 className="inline h-4 w-4 animate-spin" /></td></tr>
            )}
            {!loading && items.length === 0 && (
              <tr><td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">No pillars.</td></tr>
            )}
            {items.map((p) => (
              <tr key={p.id} className="border-b last:border-0">
                <td className="px-3 py-2 font-medium">{p.title}</td>
                <td className="px-3 py-2 font-mono text-xs">/{p.slug}</td>
                <td className="px-3 py-2">
                  <input
                    type="checkbox"
                    checked={p.published}
                    disabled={savingId === p.id}
                    onChange={(e) => patch(p.id, { published: e.target.checked })}
                  />
                </td>
                <td className="px-3 py-2">
                  <select
                    className="border rounded px-2 py-1 text-sm"
                    value={p.robots ?? ""}
                    disabled={savingId === p.id}
                    onChange={(e) => patch(p.id, { robots: e.target.value || null })}
                  >
                    {ROBOTS_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-2">
                  <a
                    href={`/${p.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    View <ExternalLink className="h-3 w-3" />
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
