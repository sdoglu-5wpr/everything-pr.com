// HMAC verification for /api/public/ingest/* routes.
// External callers (the management panel) must sign every request with the
// shared EPR_INGEST_SECRET. We verify with timing-safe comparison and a
// 5-minute timestamp window to prevent replay attacks.
import { createHmac, timingSafeEqual } from "node:crypto";

const MAX_SKEW_MS = 5 * 60 * 1000; // 5 minutes

export type VerifyResult =
  | { ok: true; body: string }
  | { ok: false; status: number; error: string };

export async function verifyIngestRequest(
  request: Request,
): Promise<VerifyResult> {
  const secret = process.env.EPR_INGEST_SECRET;
  if (!secret) {
    return { ok: false, status: 500, error: "EPR_INGEST_SECRET not configured on server" };
  }

  const signature = request.headers.get("x-signature");
  const timestamp = request.headers.get("x-timestamp");
  if (!signature || !timestamp) {
    return { ok: false, status: 401, error: "missing x-signature or x-timestamp header" };
  }

  const ts = Number(timestamp);
  if (!Number.isFinite(ts)) {
    return { ok: false, status: 401, error: "invalid x-timestamp" };
  }
  if (Math.abs(Date.now() - ts) > MAX_SKEW_MS) {
    return { ok: false, status: 401, error: "timestamp outside allowed window" };
  }

  // Read body once; downstream handlers receive it as a string.
  const body = await request.text();
  const sigInput = `${timestamp}.${body}`;
  const expected = createHmac("sha256", secret).update(sigInput).digest("hex");
  const provided = signature.replace(/^sha256=/, "");

  if (expected.length !== provided.length) {
    return { ok: false, status: 401, error: "invalid signature" };
  }
  try {
    const a = Buffer.from(expected, "hex");
    const b = Buffer.from(provided, "hex");
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      return { ok: false, status: 401, error: "invalid signature" };
    }
  } catch {
    return { ok: false, status: 401, error: "invalid signature encoding" };
  }

  return { ok: true, body };
}

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store",
    },
  });
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 200) || `item-${Date.now()}`;
}
