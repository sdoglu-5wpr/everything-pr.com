import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import {
  PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  PUBLIC_SUPABASE_URL,
} from "@/integrations/supabase/public-env";
import { renderNewsletterConfirmationEmail } from "@/lib/email/newsletter-confirmation";

const FROM_ADDRESS = "Everything-PR <no-reply@updates.everything-pr.com>";
const REPLY_TO = "hello@everything-pr.com";

async function sendConfirmationEmail(toEmail: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("newsletter: RESEND_API_KEY not configured — skipping email");
    return;
  }
  const { subject, html, text } = renderNewsletterConfirmationEmail();
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_ADDRESS,
        to: [toEmail],
        reply_to: REPLY_TO,
        subject,
        html,
        text,
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error("newsletter: Resend send failed", res.status, body);
    }
  } catch (err) {
    console.error(
      "newsletter: Resend threw",
      err instanceof Error ? `${err.name}: ${err.message}` : String(err)
    );
  }
}

const schema = z.object({
  email: z.string().trim().email().max(255),
  source: z.string().trim().max(100).optional().or(z.literal("")),
});

export const Route = createFileRoute("/api/newsletter")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return Response.json({ error: "Invalid JSON" }, { status: 400 });
        }

        const parsed = schema.safeParse(body);
        if (!parsed.success) {
          return Response.json(
            { error: "Please enter a valid email address." },
            { status: 400 }
          );
        }

        const { email, source } = parsed.data;

        try {
          // Direct PostgREST insert with hardcoded publishable key — works
          // anywhere (Netlify, Lovable, etc.) without depending on env vars.
          // Do not use resolution=ignore-duplicates here: PostgREST treats it
          // like an upsert, which requires UPDATE permission and fails under RLS.
          const res = await fetch(
            `${PUBLIC_SUPABASE_URL}/rest/v1/newsletter_subscribers`,
            {
              method: "POST",
              headers: {
                apikey: PUBLIC_SUPABASE_PUBLISHABLE_KEY,
                Authorization: `Bearer ${PUBLIC_SUPABASE_PUBLISHABLE_KEY}`,
                "Content-Type": "application/json",
                Prefer: "return=minimal",
              },
              body: JSON.stringify({
                email: email.toLowerCase(),
                source: source || null,
              }),
            }
          );

          if (!res.ok && res.status !== 409) {
            const text = await res.text().catch(() => "");
            console.error("newsletter: PostgREST error", res.status, text);
            return Response.json(
              { error: "Could not subscribe. Please try again." },
              { status: 500 }
            );
          }

          // Send confirmation email on a fresh subscribe (201) only — skip
          // for 409 (already subscribed) so we don't spam existing readers.
          if (res.status === 201 || res.ok) {
            await sendConfirmationEmail(email.toLowerCase());
          }
        } catch (err) {
          console.error(
            "newsletter: handler threw",
            err instanceof Error ? `${err.name}: ${err.message}` : String(err)
          );
          return Response.json(
            { error: "Could not subscribe. Please try again." },
            { status: 500 }
          );
        }

        return Response.json({ ok: true });
      },
    },
  },
});
