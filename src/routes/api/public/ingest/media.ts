// POST /api/public/ingest/media
// Body (JSON, signed): { filename: string, content_type: string, data_base64: string, alt_text?, source_url? }
// OR: { source_url: string, filename?, alt_text? }  — server fetches the URL and uploads.
// Stores in `wp-media` bucket and inserts a media row. Returns { url, id }.
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { jsonResponse, slugify, verifyIngestRequest } from "@/server/ingest-auth.server";

const BUCKET = "wp-media";

const Schema = z.object({
  filename: z.string().min(1).max(255).optional(),
  content_type: z.string().max(100).optional(),
  data_base64: z.string().optional(),
  source_url: z.string().url().optional(),
  alt_text: z.string().max(500).optional().nullable(),
  caption: z.string().max(1000).optional().nullable(),
}).refine((d) => d.data_base64 || d.source_url, {
  message: "either data_base64 or source_url is required",
});

function extFromMime(mime?: string): string {
  if (!mime) return "bin";
  const map: Record<string, string> = {
    "image/jpeg": "jpg", "image/jpg": "jpg", "image/png": "png",
    "image/webp": "webp", "image/gif": "gif", "image/svg+xml": "svg",
    "image/avif": "avif",
  };
  return map[mime.toLowerCase()] ?? "bin";
}

export const Route = createFileRoute("/api/public/ingest/media")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const verified = await verifyIngestRequest(request);
        if (!verified.ok) return jsonResponse({ error: verified.error }, verified.status);

        let parsed: z.infer<typeof Schema>;
        try {
          parsed = Schema.parse(JSON.parse(verified.body));
        } catch (e: any) {
          return jsonResponse({ error: "invalid payload", details: e?.message }, 400);
        }

        try {
          let bytes: Uint8Array;
          let contentType = parsed.content_type ?? "application/octet-stream";
          let baseName = parsed.filename;

          if (parsed.data_base64) {
            bytes = Uint8Array.from(Buffer.from(parsed.data_base64, "base64"));
          } else {
            const res = await fetch(parsed.source_url!);
            if (!res.ok) {
              return jsonResponse({ error: `fetch source_url failed: ${res.status}` }, 400);
            }
            contentType = res.headers.get("content-type") ?? contentType;
            bytes = new Uint8Array(await res.arrayBuffer());
            if (!baseName) baseName = parsed.source_url!.split("/").pop() ?? "image";
          }

          if (!baseName) baseName = `upload-${Date.now()}`;
          const dot = baseName.lastIndexOf(".");
          const stem = dot > 0 ? baseName.slice(0, dot) : baseName;
          const ext = dot > 0 ? baseName.slice(dot + 1) : extFromMime(contentType);
          const safeStem = slugify(stem);
          const objectKey = `ingest/${new Date().getFullYear()}/${Date.now()}-${safeStem}.${ext}`;

          const { error: upErr } = await supabaseAdmin.storage
            .from(BUCKET)
            .upload(objectKey, bytes, { contentType, upsert: false });
          if (upErr) return jsonResponse({ error: `upload failed: ${upErr.message}` }, 500);

          const { data: pub } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(objectKey);
          const publicUrl = pub.publicUrl;

          const { data: media, error: mErr } = await supabaseAdmin
            .from("media")
            .insert({
              url: publicUrl,
              storage_path: objectKey,
              filename: `${safeStem}.${ext}`,
              mime_type: contentType,
              alt_text: parsed.alt_text ?? null,
              caption: parsed.caption ?? null,
              uploaded_at: new Date().toISOString(),
            })
            .select("id, url")
            .single();
          if (mErr) return jsonResponse({ error: `media insert failed: ${mErr.message}` }, 500);

          return jsonResponse({ ok: true, id: media!.id, url: media!.url });
        } catch (e: any) {
          return jsonResponse({ error: e?.message ?? "internal error" }, 500);
        }
      },
    },
  },
});
