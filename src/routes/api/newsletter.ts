import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

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

        const { error } = await supabaseAdmin
          .from("newsletter_subscribers")
          .upsert(
            { email: email.toLowerCase(), source: source || null },
            { onConflict: "email", ignoreDuplicates: true }
          );

        if (error) {
          console.error("newsletter: insert failed", error);
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
