import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Save, Loader2, Plus, Trash2, X } from "lucide-react";
import { listSettings, saveSetting, deleteSetting } from "@/serverFns/admin-site.functions";

export const Route = createFileRoute("/admin/_protected/settings")({
  component: SettingsPage,
});

type Row = { key: string; value: any; updated_at: string };

const KNOWN_FIELDS: Array<{ key: string; label: string; placeholder?: string; multi?: boolean; group: string }> = [
  { key: "site.title", label: "Site title", group: "General" },
  { key: "site.tagline", label: "Tagline", group: "General" },
  { key: "site.url", label: "Site URL", placeholder: "https://example.com", group: "General" },
  { key: "site.timezone", label: "Timezone", placeholder: "UTC", group: "General" },
  { key: "site.locale", label: "Locale", placeholder: "en", group: "General" },
  { key: "contact.email", label: "Contact email", group: "Contact" },
  { key: "social.twitter", label: "Twitter handle", placeholder: "@handle", group: "Social" },
  { key: "social.linkedin", label: "LinkedIn URL", group: "Social" },
  { key: "social.facebook", label: "Facebook URL", group: "Social" },
  { key: "analytics.ga4_id", label: "Google Analytics 4 ID", placeholder: "G-XXXX", group: "Analytics" },
  { key: "analytics.gtm_id", label: "Google Tag Manager ID", placeholder: "GTM-XXXX", group: "Analytics" },
];

function asString(v: any): string {
  if (v == null) return "";
  if (typeof v === "string") return v;
  return JSON.stringify(v);
}

function SettingsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [dirty, setDirty] = useState<Record<string, string>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [showCustom, setShowCustom] = useState(false);
  const [customKey, setCustomKey] = useState("");
  const [customValue, setCustomValue] = useState("");

  const refresh = async () => {
    setLoading(true);
    try { const r = await listSettings(); setRows(r.items); }
    catch (e: any) { toast.error(e?.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { refresh(); }, []);

  const get = (key: string) => {
    if (key in dirty) return dirty[key];
    return asString(rows.find((r) => r.key === key)?.value);
  };

  const save = async (key: string) => {
    setSavingKey(key);
    try {
      let value: any = dirty[key] ?? get(key);
      // Try parse JSON for objects
      if (value && (value.startsWith("{") || value.startsWith("[") || value === "true" || value === "false" || /^-?\d+(\.\d+)?$/.test(value))) {
        try { value = JSON.parse(value); } catch {}
      }
      await saveSetting({ data: { key, value } });
      toast.success("Saved");
      setDirty((d) => { const n = { ...d }; delete n[key]; return n; });
      refresh();
    } catch (e: any) { toast.error(e?.message); }
    finally { setSavingKey(null); }
  };

  const remove = async (key: string) => {
    if (!window.confirm(`Delete setting "${key}"?`)) return;
    try { await deleteSetting({ data: { key } }); toast.success("Deleted"); refresh(); }
    catch (e: any) { toast.error(e?.message); }
  };

  const addCustom = async () => {
    if (!customKey.trim()) return;
    let value: any = customValue;
    try { value = JSON.parse(customValue); } catch {}
    try {
      await saveSetting({ data: { key: customKey.trim(), value } });
      toast.success("Saved"); setCustomKey(""); setCustomValue(""); setShowCustom(false); refresh();
    } catch (e: any) { toast.error(e?.message); }
  };

  const knownKeys = new Set(KNOWN_FIELDS.map((f) => f.key));
  const custom = rows.filter((r) => !knownKeys.has(r.key));
  const groups = Array.from(new Set(KNOWN_FIELDS.map((f) => f.group)));

  return (
    <div className="-m-6 min-h-full bg-[#F7F8FB] p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Settings</h1>
        <button onClick={() => setShowCustom(true)}
          className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          <Plus className="h-4 w-4" /> Add custom
        </button>
      </div>

      {loading ? <div className="text-sm text-muted-foreground">Loading…</div> : (
        <div className="space-y-4">
          {groups.map((g) => (
            <div key={g} className="rounded-lg bg-white border overflow-hidden">
              <div className="border-b px-4 py-2 font-semibold text-sm">{g}</div>
              <div className="divide-y">
                {KNOWN_FIELDS.filter((f) => f.group === g).map((f) => (
                  <div key={f.key} className="px-4 py-3 grid grid-cols-12 gap-3 items-center">
                    <label className="col-span-3 text-sm font-medium">{f.label}<div className="text-xs font-mono text-muted-foreground">{f.key}</div></label>
                    <input
                      value={get(f.key)}
                      onChange={(e) => setDirty({ ...dirty, [f.key]: e.target.value })}
                      placeholder={f.placeholder}
                      className="col-span-7 rounded border px-3 py-1.5 text-sm" />
                    <button onClick={() => save(f.key)} disabled={savingKey === f.key || !(f.key in dirty)}
                      className="col-span-2 rounded bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 inline-flex items-center justify-center gap-1">
                      {savingKey === f.key ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="h-4 w-4" /> Save</>}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {custom.length > 0 && (
            <div className="rounded-lg bg-white border overflow-hidden">
              <div className="border-b px-4 py-2 font-semibold text-sm">Custom</div>
              <div className="divide-y">
                {custom.map((r) => (
                  <div key={r.key} className="px-4 py-3 grid grid-cols-12 gap-3 items-start">
                    <div className="col-span-3 text-sm font-mono break-all">{r.key}</div>
                    <textarea
                      value={get(r.key)}
                      onChange={(e) => setDirty({ ...dirty, [r.key]: e.target.value })}
                      rows={2}
                      className="col-span-7 rounded border px-3 py-1.5 text-sm font-mono" />
                    <div className="col-span-2 flex gap-1">
                      <button onClick={() => save(r.key)} disabled={savingKey === r.key || !(r.key in dirty)}
                        className="flex-1 rounded bg-primary px-2 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                        Save
                      </button>
                      <button onClick={() => remove(r.key)} className="rounded p-1.5 text-red-600 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {showCustom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowCustom(false)}>
          <div className="w-full max-w-md rounded-lg bg-background shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b px-4 py-3">
              <div className="font-semibold">Custom setting</div>
              <button onClick={() => setShowCustom(false)} className="rounded p-1 hover:bg-muted"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-3 p-4">
              <div>
                <label className="block text-xs font-medium mb-1">Key</label>
                <input value={customKey} onChange={(e) => setCustomKey(e.target.value)}
                  placeholder="namespace.key" className="w-full rounded border px-3 py-1.5 text-sm font-mono" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Value (JSON or text)</label>
                <textarea value={customValue} onChange={(e) => setCustomValue(e.target.value)}
                  rows={4} className="w-full rounded border px-3 py-1.5 text-sm font-mono" />
              </div>
            </div>
            <div className="border-t px-4 py-3 flex justify-end gap-2">
              <button onClick={() => setShowCustom(false)} className="rounded border px-3 py-1.5 text-sm hover:bg-muted">Cancel</button>
              <button onClick={addCustom} className="rounded bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
