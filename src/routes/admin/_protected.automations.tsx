import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Pencil, X, Loader2, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import { listAutomations, saveAutomation, deleteAutomation, toggleAutomation } from "@/serverFns/admin-site.functions";

export const Route = createFileRoute("/admin/_protected/automations")({
  component: AutomationsPage,
});

type Automation = {
  id: number; name: string; description: string | null;
  trigger_type: string; schedule: string | null; enabled: boolean;
  last_run_at: string | null; last_status: string | null; last_error: string | null;
  config: any;
};

function AutomationsPage() {
  const [items, setItems] = useState<Automation[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Automation> | null>(null);
  const [saving, setSaving] = useState(false);
  const [configText, setConfigText] = useState("");

  const refresh = async () => {
    setLoading(true);
    try { const r = await listAutomations(); setItems(r.items); }
    catch (e: any) { toast.error(e?.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { refresh(); }, []);

  const open = (a: Partial<Automation> | null) => {
    setEditing(a);
    setConfigText(a?.config ? JSON.stringify(a.config, null, 2) : "{}");
  };

  const save = async () => {
    if (!editing?.name?.trim()) { toast.error("Name required"); return; }
    let config: any = {};
    try { config = JSON.parse(configText || "{}"); }
    catch { toast.error("Config must be valid JSON"); return; }
    setSaving(true);
    try {
      await saveAutomation({ data: {
        id: editing.id ?? null, name: editing.name,
        description: editing.description ?? null,
        trigger_type: editing.trigger_type ?? "cron",
        schedule: editing.schedule ?? null,
        enabled: editing.enabled ?? true,
        config,
      } });
      toast.success("Saved"); setEditing(null); refresh();
    } catch (e: any) { toast.error(e?.message); }
    finally { setSaving(false); }
  };

  const remove = async (a: Automation) => {
    if (!window.confirm(`Delete automation "${a.name}"?`)) return;
    try { await deleteAutomation({ data: { id: a.id } }); toast.success("Deleted"); refresh(); }
    catch (e: any) { toast.error(e?.message); }
  };

  const toggle = async (a: Automation) => {
    try {
      await toggleAutomation({ data: { id: a.id, enabled: !a.enabled } });
      setItems((prev) => prev.map((x) => x.id === a.id ? { ...x, enabled: !a.enabled } : x));
    } catch (e: any) { toast.error(e?.message); }
  };

  const StatusIcon = ({ s }: { s: string | null }) => {
    if (s === "success") return <CheckCircle2 className="h-4 w-4 text-green-600" />;
    if (s === "error") return <AlertCircle className="h-4 w-4 text-red-600" />;
    if (s) return <Clock className="h-4 w-4 text-amber-600" />;
    return <Clock className="h-4 w-4 text-muted-foreground" />;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Automations</h1>
        <button onClick={() => open({ id: undefined, name: "", trigger_type: "cron", enabled: true, config: {} })}
          className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          <Plus className="h-4 w-4" /> New automation
        </button>
      </div>

      <div className="rounded-lg bg-white border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b bg-admin-surface-2">
            <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-3 py-2 w-16">On</th>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2 w-28">Trigger</th>
              <th className="px-3 py-2 w-40">Schedule</th>
              <th className="px-3 py-2 w-44">Last run</th>
              <th className="px-3 py-2 w-24"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">Loading…</td></tr>
              : items.length === 0 ? <tr><td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">No automations.</td></tr>
              : items.map((a) => (
                <tr key={a.id} className={`border-t hover:bg-admin-hover ${!a.enabled ? "opacity-60" : ""}`}>
                  <td className="px-3 py-2">
                    <button onClick={() => toggle(a)}
                      className={`relative h-5 w-9 rounded-full transition-colors ${a.enabled ? "bg-primary" : "bg-neutral-300"}`}>
                      <span className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white transition-transform ${a.enabled ? "translate-x-4" : ""}`} />
                    </button>
                  </td>
                  <td className="px-3 py-2">
                    <div className="font-medium">{a.name}</div>
                    {a.description && <div className="text-xs text-muted-foreground">{a.description}</div>}
                  </td>
                  <td className="px-3 py-2"><span className="inline-block rounded bg-neutral-100 px-1.5 text-xs">{a.trigger_type}</span></td>
                  <td className="px-3 py-2 font-mono text-xs">{a.schedule || "—"}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1.5 text-xs">
                      <StatusIcon s={a.last_status} />
                      <span>{a.last_run_at ? new Date(a.last_run_at).toLocaleString() : "never"}</span>
                    </div>
                    {a.last_error && <div className="text-xs text-red-600 truncate max-w-[200px]" title={a.last_error}>{a.last_error}</div>}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button onClick={() => open(a)} className="rounded p-1 hover:bg-muted text-muted-foreground"><Pencil className="h-4 w-4" /></button>
                    <button onClick={() => remove(a)} className="rounded p-1 hover:bg-red-50 text-red-600"><Trash2 className="h-4 w-4" /></button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setEditing(null)}>
          <div className="w-full max-w-lg rounded-lg bg-background shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b px-4 py-3">
              <div className="font-semibold">{editing.id ? "Edit automation" : "New automation"}</div>
              <button onClick={() => setEditing(null)} className="rounded p-1 hover:bg-muted"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-3 p-4 max-h-[70vh] overflow-auto">
              <div>
                <label className="block text-xs font-medium mb-1">Name</label>
                <input value={editing.name ?? ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  className="w-full rounded border px-3 py-1.5 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Description</label>
                <textarea value={editing.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                  rows={2} className="w-full rounded border px-3 py-1.5 text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1">Trigger</label>
                  <select value={editing.trigger_type ?? "cron"} onChange={(e) => setEditing({ ...editing, trigger_type: e.target.value })}
                    className="w-full rounded border px-2 py-1.5 text-sm">
                    <option value="cron">Cron schedule</option>
                    <option value="webhook">Webhook</option>
                    <option value="manual">Manual</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Schedule (cron)</label>
                  <input value={editing.schedule ?? ""} onChange={(e) => setEditing({ ...editing, schedule: e.target.value })}
                    placeholder="0 * * * *" className="w-full rounded border px-3 py-1.5 text-sm font-mono" />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={editing.enabled ?? true}
                  onChange={(e) => setEditing({ ...editing, enabled: e.target.checked })} />
                Enabled
              </label>
              <div>
                <label className="block text-xs font-medium mb-1">Config (JSON)</label>
                <textarea value={configText} onChange={(e) => setConfigText(e.target.value)}
                  rows={6} className="w-full rounded border px-3 py-1.5 text-xs font-mono" />
              </div>
            </div>
            <div className="border-t px-4 py-3 flex justify-end gap-2">
              <button onClick={() => setEditing(null)} className="rounded border px-3 py-1.5 text-sm hover:bg-muted">Cancel</button>
              <button onClick={save} disabled={saving}
                className="rounded bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
