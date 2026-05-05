import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Save, Loader2 } from "lucide-react";
import { listSettings, saveSetting } from "@/serverFns/admin-site.functions";

export const Route = createFileRoute("/admin/_protected/seo")({
  component: SeoDefaultsPage,
});

const FIELDS: Array<{ key: string; label: string; help?: string; type?: "text" | "textarea" | "select"; opts?: string[] }> = [
  { key: "seo.title_template", label: "Title template", help: "Use %title% and %site%. Example: %title% — %site%" },
  { key: "seo.default_title", label: "Default title (homepage)" },
  { key: "seo.default_description", label: "Default meta description", type: "textarea" },
  { key: "seo.canonical_base", label: "Canonical base URL", help: "https://example.com" },
  { key: "seo.robots_default", label: "Default robots", type: "select", opts: ["index,follow", "index,nofollow", "noindex,follow", "noindex,nofollow"] },
  { key: "seo.og_default_image", label: "Default OG image URL" },
  { key: "seo.twitter_site", label: "Twitter @site handle" },
  { key: "seo.twitter_card", label: "Default Twitter card", type: "select", opts: ["summary", "summary_large_image"] },
  { key: "seo.organization_name", label: "Organization name (schema)" },
  { key: "seo.organization_logo", label: "Organization logo URL (schema)" },
];

function asStr(v: any) { if (v == null) return ""; return typeof v === "string" ? v : JSON.stringify(v); }

function SeoDefaultsPage() {
  const [values, setValues] = useState<Record<string, string>>({});
  const [original, setOriginal] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    try {
      const r = await listSettings();
      const map: Record<string, string> = {};
      for (const row of r.items as any[]) map[row.key] = asStr(row.value);
      setValues(map); setOriginal(map);
    } catch (e: any) { toast.error(e?.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { refresh(); }, []);

  const save = async (key: string) => {
    setSavingKey(key);
    try {
      await saveSetting({ data: { key, value: values[key] ?? "" } });
      toast.success("Saved");
      setOriginal({ ...original, [key]: values[key] ?? "" });
    } catch (e: any) { toast.error(e?.message); }
    finally { setSavingKey(null); }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold mb-1">SEO defaults</h1>
      <p className="text-sm text-muted-foreground mb-4">Sitewide fallbacks used when a post or page has no specific SEO meta.</p>

      {loading ? <div className="text-sm text-muted-foreground">Loading…</div> : (
        <div className="rounded-lg bg-white border divide-y">
          {FIELDS.map((f) => {
            const dirty = (values[f.key] ?? "") !== (original[f.key] ?? "");
            return (
              <div key={f.key} className="px-4 py-3 grid grid-cols-12 gap-3 items-start">
                <label className="col-span-3 text-sm font-medium">
                  {f.label}
                  {f.help && <div className="text-xs font-normal text-muted-foreground mt-0.5">{f.help}</div>}
                </label>
                <div className="col-span-7">
                  {f.type === "textarea" ? (
                    <textarea value={values[f.key] ?? ""} onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
                      rows={3} className="w-full rounded border px-3 py-1.5 text-sm" />
                  ) : f.type === "select" ? (
                    <select value={values[f.key] ?? ""} onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
                      className="w-full rounded border px-2 py-1.5 text-sm">
                      <option value="">— default —</option>
                      {f.opts!.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  ) : (
                    <input value={values[f.key] ?? ""} onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
                      className="w-full rounded border px-3 py-1.5 text-sm" />
                  )}
                </div>
                <button onClick={() => save(f.key)} disabled={!dirty || savingKey === f.key}
                  className="col-span-2 rounded bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 inline-flex items-center justify-center gap-1">
                  {savingKey === f.key ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="h-4 w-4" /> Save</>}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
