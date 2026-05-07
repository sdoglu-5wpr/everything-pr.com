import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft, Save, Trash2, Image as ImageIcon, ExternalLink, Loader2,
} from "lucide-react";
const RichEditor = lazy(() =>
  import("@/components/admin/RichEditor").then((m) => ({ default: m.RichEditor })),
);
import { MediaPicker, type PickedMedia } from "@/components/admin/MediaPicker";
import {
  getAdminPost, saveAdminPost, deleteAdminPost,
} from "@/serverFns/admin-editor.functions";
import { htmlToPlainText } from "@/lib/text";

export const Route = createFileRoute("/admin/_protected/posts/$id")({
  component: PostEditor,
});

type SeoState = {
  title: string; description: string; canonical_url: string; robots: string;
  og_title: string; og_description: string; og_image: string;
  twitter_card: string; twitter_title: string; twitter_description: string; twitter_image: string;
  focus_keyword: string;
  schema_jsonld: string;
};

const emptySeo = (): SeoState => ({
  title: "", description: "", canonical_url: "", robots: "index,follow",
  og_title: "", og_description: "", og_image: "",
  twitter_card: "summary_large_image", twitter_title: "", twitter_description: "", twitter_image: "",
  focus_keyword: "", schema_jsonld: "",
});

function slugify(s: string) {
  return s.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 200);
}

function PostEditor() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const isNew = id === "new";
  const numericId = isNew ? null : Number(id);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [meta, setMeta] = useState<{ categories: any[]; tags: any[]; authors: any[] }>({ categories: [], tags: [], authors: [] });

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [excerpt, setExcerpt] = useState("");
  const [content, setContent] = useState("<p></p>");
  const [type, setType] = useState<"post" | "page">("post");
  const [status, setStatus] = useState<"publish" | "draft" | "future" | "private" | "trash">("draft");
  const [authorId, setAuthorId] = useState<number | null>(null);
  const [publishedAt, setPublishedAt] = useState<string>("");
  const [featured, setFeatured] = useState<{ id: number; url: string; alt: string | null } | null>(null);
  const [categoryIds, setCategoryIds] = useState<Set<number>>(new Set());
  const [tagIds, setTagIds] = useState<Set<number>>(new Set());
  const [seo, setSeo] = useState<SeoState>(emptySeo());
  const [tab, setTab] = useState<"general" | "social" | "schema">("general");
  const [pickerFor, setPickerFor] = useState<"featured" | "og" | "twitter" | "inline" | null>(null);
  const inlinePickerResolver = useRef<((m: PickedMedia | null) => void) | null>(null);

  useEffect(() => {
    setLoading(true);
    getAdminPost({ data: { id: numericId } })
      .then((r: any) => {
        setMeta(r.meta);
        if (r.post) {
          setTitle(r.post.title ?? "");
          setSlug(r.post.slug ?? "");
          setExcerpt(htmlToPlainText(r.post.excerpt) || "");
          setContent(r.post.content_html || "<p></p>");
          setType(r.post.type ?? "post");
          setStatus(r.post.status ?? "draft");
          setAuthorId(r.post.author_id ?? null);
          setPublishedAt(r.post.published_at ? r.post.published_at.slice(0, 16) : "");
          setCategoryIds(new Set(r.categoryIds ?? []));
          setTagIds(new Set(r.tagIds ?? []));
          if (r.featuredMedia) setFeatured({ id: r.featuredMedia.id, url: r.featuredMedia.url, alt: r.featuredMedia.alt_text });
          if (r.seo) {
            setSeo({
              title: r.seo.title ?? "", description: r.seo.description ?? "",
              canonical_url: r.seo.canonical_url ?? "", robots: r.seo.robots ?? "index,follow",
              og_title: r.seo.og_title ?? "", og_description: r.seo.og_description ?? "", og_image: r.seo.og_image ?? "",
              twitter_card: r.seo.twitter_card ?? "summary_large_image",
              twitter_title: r.seo.twitter_title ?? "", twitter_description: r.seo.twitter_description ?? "",
              twitter_image: r.seo.twitter_image ?? "",
              focus_keyword: r.seo.raw?.focus_keyword ?? "",
              schema_jsonld: r.seo.schema_jsonld ? JSON.stringify(r.seo.schema_jsonld, null, 2) : "",
            });
          }
        }
      })
      .catch((e: any) => toast.error(e?.message ?? "Failed to load"))
      .finally(() => setLoading(false));
  }, [numericId]);

  // Auto-slug on title change for new posts
  useEffect(() => {
    if (isNew && !slugTouched) setSlug(slugify(title));
  }, [title, isNew, slugTouched]);

  const plainExcerpt = useMemo(() => htmlToPlainText(excerpt), [excerpt]);
  const titleLen = (seo.title || title).length;
  const descLen = (seo.description || plainExcerpt).length;

  const save = async (overrideStatus?: typeof status) => {
    if (!title.trim()) { toast.error("Title is required"); return; }
    setSaving(true);
    try {
      let schema_jsonld: any = null;
      if (seo.schema_jsonld.trim()) {
        try { schema_jsonld = JSON.parse(seo.schema_jsonld); }
        catch { toast.error("Schema JSON-LD is not valid JSON"); setSaving(false); return; }
      }
      const r = await saveAdminPost({
        data: {
          id: numericId,
          title, slug: slug || slugify(title), type,
          status: overrideStatus ?? status,
          excerpt: excerpt || null,
          content_html: content,
          author_id: authorId,
          featured_media_id: featured?.id ?? null,
          published_at: publishedAt ? new Date(publishedAt).toISOString() : null,
          category_ids: Array.from(categoryIds),
          tag_ids: Array.from(tagIds),
          seo: {
            title: seo.title || null, description: seo.description || null,
            canonical_url: seo.canonical_url || null, robots: seo.robots || null,
            og_title: seo.og_title || null, og_description: seo.og_description || null, og_image: seo.og_image || null,
            twitter_card: seo.twitter_card || null, twitter_title: seo.twitter_title || null,
            twitter_description: seo.twitter_description || null, twitter_image: seo.twitter_image || null,
            focus_keyword: seo.focus_keyword || null,
            schema_jsonld,
          },
        },
      });
      toast.success(isNew ? "Created" : "Saved");
      if (overrideStatus) setStatus(overrideStatus);
      if (isNew) navigate({ to: "/admin/posts/$id", params: { id: String((r as any).id) } });
    } catch (e: any) {
      toast.error(e?.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async () => {
    if (!numericId) return;
    if (!window.confirm("Delete this post permanently? This cannot be undone.")) return;
    try {
      await deleteAdminPost({ data: { id: numericId } });
      toast.success("Deleted");
      navigate({ to: "/admin/posts" });
    } catch (e: any) { toast.error(e?.message ?? "Delete failed"); }
  };

  const inlinePick = (): Promise<{ url: string; alt: string | null } | null> =>
    new Promise<PickedMedia | null>((resolve) => { inlinePickerResolver.current = resolve; setPickerFor("inline"); })
      .then((m) => (m ? { url: m.url, alt: m.alt_text } : null));

  const handlePicked = (m: PickedMedia) => {
    if (pickerFor === "featured") setFeatured({ id: m.id, url: m.url, alt: m.alt_text });
    else if (pickerFor === "og") setSeo((s) => ({ ...s, og_image: m.url }));
    else if (pickerFor === "twitter") setSeo((s) => ({ ...s, twitter_image: m.url }));
    else if (pickerFor === "inline" && inlinePickerResolver.current) {
      inlinePickerResolver.current({ ...m });
      inlinePickerResolver.current = null;
    }
    setPickerFor(null);
  };

  const closePicker = () => {
    if (pickerFor === "inline" && inlinePickerResolver.current) {
      inlinePickerResolver.current(null);
      inlinePickerResolver.current = null;
    }
    setPickerFor(null);
  };

  const wordCount = useMemo(() => {
    const t = content.replace(/<[^>]+>/g, " ").trim();
    return t ? t.split(/\s+/).length : 0;
  }, [content]);

  if (loading) {
    return <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading editor…</div>;
  }

  return (
    <div className="-m-6 min-h-full bg-admin-surface">
      {/* Sticky toolbar */}
      <div className="sticky top-0 z-20 flex items-center justify-between border-b bg-background/95 px-6 py-3 backdrop-blur">
        <div className="flex items-center gap-3">
          <Link to="/admin/posts" className="rounded p-1.5 hover:bg-muted text-muted-foreground" title="Back">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="text-sm font-semibold truncate max-w-[420px]">
              {title || (isNew ? "New post" : "Untitled")}
            </div>
            <div className="text-xs text-muted-foreground">
              {type} · {status} · {wordCount} words
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isNew && (
            <a
              href={`/${slug}/`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded border px-3 py-1.5 text-sm hover:bg-muted"
            >
              <ExternalLink className="h-3.5 w-3.5" /> View
            </a>
          )}
          <button
            onClick={() => save("draft")}
            disabled={saving}
            className="rounded border px-3 py-1.5 text-sm hover:bg-muted disabled:opacity-50"
          >
            Save draft
          </button>
          <button
            onClick={() => save("publish")}
            disabled={saving}
            className="inline-flex items-center gap-1 rounded bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {status === "publish" ? "Update" : "Publish"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6 p-6">
        {/* Main column */}
        <div className="space-y-4 min-w-0">
          <div className="rounded-md border bg-card p-4">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Post title"
              className="w-full font-serif text-3xl font-bold bg-transparent placeholder:text-muted-foreground/60 focus:outline-none"
            />
            <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
              <span>Permalink:</span>
              <span>/</span>
              <input
                value={slug}
                onChange={(e) => { setSlug(e.target.value); setSlugTouched(true); }}
                className="flex-1 rounded border px-2 py-1 text-xs"
              />
              <span>/</span>
            </div>
          </div>

          <Suspense fallback={<div className="rounded-md border bg-card p-6 text-sm text-muted-foreground"><Loader2 className="inline h-4 w-4 animate-spin mr-2" />Loading editor…</div>}>
            <RichEditor value={content} onChange={setContent} onPickImage={inlinePick} placeholder="Write your story…" />
          </Suspense>

          {/* Excerpt */}
          <div className="rounded-md border bg-card p-4">
            <label className="block text-sm font-semibold mb-2">Excerpt</label>
            <textarea
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              rows={3}
              placeholder="Short summary shown in archives and feeds."
              className="w-full rounded border px-3 py-2 text-sm"
            />
          </div>

          {/* SEO panel */}
          <div className="rounded-md border bg-card">
            <div className="flex items-center justify-between border-b px-4 py-2">
              <h2 className="text-sm font-semibold">SEO</h2>
              <div className="flex gap-1">
                {(["general", "social", "schema"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={`rounded px-3 py-1 text-xs capitalize ${tab === t ? "bg-muted font-medium" : "text-muted-foreground hover:bg-muted/50"}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {tab === "general" && (
              <div className="space-y-3 p-4">
                <div>
                  <label className="block text-xs font-medium mb-1">Focus keyword</label>
                  <input value={seo.focus_keyword} onChange={(e) => setSeo({ ...seo, focus_keyword: e.target.value })}
                    className="w-full rounded border px-3 py-1.5 text-sm" placeholder="e.g. crisis communication" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">
                    Meta title <span className={`ml-1 ${titleLen > 60 ? "text-red-600" : "text-muted-foreground"}`}>({titleLen}/60)</span>
                  </label>
                  <input value={seo.title} onChange={(e) => setSeo({ ...seo, title: e.target.value })}
                    placeholder={title} className="w-full rounded border px-3 py-1.5 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">
                    Meta description <span className={`ml-1 ${descLen > 160 ? "text-red-600" : "text-muted-foreground"}`}>({descLen}/160)</span>
                  </label>
                  <textarea value={seo.description} onChange={(e) => setSeo({ ...seo, description: e.target.value })}
                    rows={2} placeholder={plainExcerpt} className="w-full rounded border px-3 py-1.5 text-sm" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium mb-1">Canonical URL</label>
                    <input value={seo.canonical_url} onChange={(e) => setSeo({ ...seo, canonical_url: e.target.value })}
                      placeholder="(auto)" className="w-full rounded border px-3 py-1.5 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Robots</label>
                    <select value={seo.robots} onChange={(e) => setSeo({ ...seo, robots: e.target.value })}
                      className="w-full rounded border px-3 py-1.5 text-sm">
                      <option value="index,follow">index, follow</option>
                      <option value="index,nofollow">index, nofollow</option>
                      <option value="noindex,follow">noindex, follow</option>
                      <option value="noindex,nofollow">noindex, nofollow</option>
                    </select>
                  </div>
                </div>
                {/* SERP preview */}
                <div className="rounded border bg-muted/30 p-3">
                  <div className="text-xs text-muted-foreground mb-1">Search preview</div>
                  <div className="text-[#1a0dab] text-base leading-tight truncate">{seo.title || title || "Untitled"}</div>
                  <div className="text-[#006621] text-xs">/{slug}/</div>
                  <div className="text-[#545454] text-sm line-clamp-2">{seo.description || plainExcerpt || "—"}</div>
                </div>
              </div>
            )}

            {tab === "social" && (
              <div className="space-y-4 p-4">
                <div>
                  <div className="text-xs font-semibold uppercase text-muted-foreground mb-2">Open Graph (Facebook / LinkedIn)</div>
                  <div className="space-y-2">
                    <input value={seo.og_title} onChange={(e) => setSeo({ ...seo, og_title: e.target.value })}
                      placeholder="OG title" className="w-full rounded border px-3 py-1.5 text-sm" />
                    <textarea value={seo.og_description} onChange={(e) => setSeo({ ...seo, og_description: e.target.value })}
                      placeholder="OG description" rows={2} className="w-full rounded border px-3 py-1.5 text-sm" />
                    <div className="flex items-center gap-2">
                      <input value={seo.og_image} onChange={(e) => setSeo({ ...seo, og_image: e.target.value })}
                        placeholder="OG image URL" className="flex-1 rounded border px-3 py-1.5 text-sm" />
                      <button onClick={() => setPickerFor("og")} className="rounded border px-2 py-1.5 text-xs hover:bg-muted">Pick</button>
                    </div>
                    {seo.og_image && <img src={seo.og_image} alt="" className="h-32 w-auto rounded border" />}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase text-muted-foreground mb-2">Twitter / X</div>
                  <div className="space-y-2">
                    <select value={seo.twitter_card} onChange={(e) => setSeo({ ...seo, twitter_card: e.target.value })}
                      className="w-full rounded border px-3 py-1.5 text-sm">
                      <option value="summary">summary</option>
                      <option value="summary_large_image">summary_large_image</option>
                    </select>
                    <input value={seo.twitter_title} onChange={(e) => setSeo({ ...seo, twitter_title: e.target.value })}
                      placeholder="Twitter title" className="w-full rounded border px-3 py-1.5 text-sm" />
                    <textarea value={seo.twitter_description} onChange={(e) => setSeo({ ...seo, twitter_description: e.target.value })}
                      placeholder="Twitter description" rows={2} className="w-full rounded border px-3 py-1.5 text-sm" />
                    <div className="flex items-center gap-2">
                      <input value={seo.twitter_image} onChange={(e) => setSeo({ ...seo, twitter_image: e.target.value })}
                        placeholder="Twitter image URL" className="flex-1 rounded border px-3 py-1.5 text-sm" />
                      <button onClick={() => setPickerFor("twitter")} className="rounded border px-2 py-1.5 text-xs hover:bg-muted">Pick</button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {tab === "schema" && (
              <div className="p-4">
                <label className="block text-xs font-medium mb-1">JSON-LD schema (advanced)</label>
                <textarea
                  value={seo.schema_jsonld}
                  onChange={(e) => setSeo({ ...seo, schema_jsonld: e.target.value })}
                  rows={12}
                  placeholder='{ "@context": "https://schema.org", "@type": "Article", ... }'
                  className="w-full font-mono text-xs rounded border px-3 py-2"
                />
                <p className="mt-2 text-xs text-muted-foreground">Leave blank to fall back to the site default Article schema.</p>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <aside className="space-y-4">
          <div className="rounded-md border bg-card p-4 space-y-3">
            <h3 className="text-sm font-semibold">Publish</h3>
            <div>
              <label className="block text-xs font-medium mb-1">Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value as any)}
                className="w-full rounded border px-2 py-1.5 text-sm">
                <option value="draft">Draft</option>
                <option value="publish">Published</option>
                <option value="future">Scheduled</option>
                <option value="private">Private</option>
                <option value="trash">Trash</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Type</label>
              <select value={type} onChange={(e) => setType(e.target.value as any)}
                className="w-full rounded border px-2 py-1.5 text-sm">
                <option value="post">Post</option>
                <option value="page">Page</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Publish date</label>
              <input
                type="datetime-local"
                value={publishedAt}
                onChange={(e) => setPublishedAt(e.target.value)}
                className="w-full rounded border px-2 py-1.5 text-sm"
              />
            </div>
            {!isNew && (
              <button onClick={onDelete} className="w-full inline-flex items-center justify-center gap-1 rounded border border-red-200 px-2 py-1.5 text-sm text-red-700 hover:bg-red-50">
                <Trash2 className="h-3.5 w-3.5" /> Delete permanently
              </button>
            )}
          </div>

          <div className="rounded-md border bg-card p-4">
            <h3 className="text-sm font-semibold mb-2">Featured image</h3>
            {featured ? (
              <div className="space-y-2">
                <img src={featured.url} alt={featured.alt ?? ""} className="w-full rounded border" />
                <div className="flex gap-2">
                  <button onClick={() => setPickerFor("featured")} className="flex-1 rounded border px-2 py-1 text-xs hover:bg-muted">Replace</button>
                  <button onClick={() => setFeatured(null)} className="rounded border px-2 py-1 text-xs hover:bg-red-50 text-red-700">Remove</button>
                </div>
              </div>
            ) : (
              <button onClick={() => setPickerFor("featured")}
                className="w-full inline-flex flex-col items-center justify-center gap-1 rounded border-2 border-dashed border-muted-foreground/30 px-3 py-6 text-xs text-muted-foreground hover:bg-muted/30">
                <ImageIcon className="h-5 w-5" />
                Set featured image
              </button>
            )}
          </div>

          <div className="rounded-md border bg-card p-4">
            <h3 className="text-sm font-semibold mb-2">Author</h3>
            <select value={authorId ?? ""} onChange={(e) => setAuthorId(e.target.value ? Number(e.target.value) : null)}
              className="w-full rounded border px-2 py-1.5 text-sm">
              <option value="">— None —</option>
              {meta.authors.map((a: any) => <option key={a.id} value={a.id}>{a.display_name}</option>)}
            </select>
          </div>

          <div className="rounded-md border bg-card p-4">
            <h3 className="text-sm font-semibold mb-2">Categories</h3>
            <div className="max-h-48 overflow-auto space-y-1 pr-1">
              {meta.categories.map((c: any) => (
                <label key={c.id} className="flex items-center gap-2 text-sm hover:bg-muted/50 rounded px-1">
                  <input
                    type="checkbox"
                    checked={categoryIds.has(c.id)}
                    onChange={() => {
                      const n = new Set(categoryIds);
                      n.has(c.id) ? n.delete(c.id) : n.add(c.id);
                      setCategoryIds(n);
                    }}
                  />
                  {c.name}
                </label>
              ))}
            </div>
          </div>

          <div className="rounded-md border bg-card p-4">
            <h3 className="text-sm font-semibold mb-2">Tags</h3>
            <TagPicker tags={meta.tags} selected={tagIds} onChange={setTagIds} />
          </div>
        </aside>
      </div>

      <MediaPicker open={pickerFor !== null} onClose={closePicker} onPick={handlePicked} />
    </div>
  );
}

function TagPicker({
  tags, selected, onChange,
}: { tags: any[]; selected: Set<number>; onChange: (s: Set<number>) => void }) {
  const [q, setQ] = useState("");
  const filtered = q ? tags.filter((t) => t.name.toLowerCase().includes(q.toLowerCase())) : tags.slice(0, 50);
  return (
    <div>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search tags…"
        className="w-full rounded border px-2 py-1 text-xs mb-2" />
      <div className="flex flex-wrap gap-1 mb-2">
        {Array.from(selected).map((id) => {
          const t = tags.find((x) => x.id === id);
          if (!t) return null;
          return (
            <span key={id} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
              {t.name}
              <button onClick={() => { const n = new Set(selected); n.delete(id); onChange(n); }} className="hover:text-red-600">×</button>
            </span>
          );
        })}
      </div>
      <div className="max-h-40 overflow-auto space-y-0.5">
        {filtered.map((t: any) => (
          <button
            key={t.id}
            onClick={() => { const n = new Set(selected); n.has(t.id) ? n.delete(t.id) : n.add(t.id); onChange(n); }}
            className={`block w-full text-left rounded px-2 py-1 text-xs ${selected.has(t.id) ? "bg-primary/10 text-primary" : "hover:bg-muted"}`}
          >
            {t.name}
          </button>
        ))}
      </div>
    </div>
  );
}
