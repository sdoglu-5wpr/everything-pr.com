import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const contactSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  message: z.string().trim().min(5).max(5000),
});

export const Route = createFileRoute("/api/contact")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return Response.json({ error: "Invalid JSON" }, { status: 400 });
        }

        const parsed = contactSchema.safeParse(body);
        if (!parsed.success) {
          return Response.json(
            { error: "Validation failed", issues: parsed.error.issues },
            { status: 400 }
          );
        }

        const submission = parsed.data;
        const userAgent = request.headers.get("user-agent") ?? null;

        const { error } = await supabaseAdmin.from("contact_messages").insert({
          name: submission.name,
          email: submission.email,
          phone: submission.phone || null,
          message: submission.message,
          user_agent: userAgent,
        });

        if (error) {
          console.error("contact.form: insert failed", error);
          return Response.json(
            { error: "Could not record submission" },
            { status: 500 }
          );
        }

        // Best-effort activity log
        try {
          await supabaseAdmin.from("activity_log").insert({
            action: "contact.form.submitted",
            table_name: "contact_messages",
            row_id: null,
            actor_id: null,
            diff: { after: { email: submission.email } },
          });
        } catch (err) {
          console.error("contact.form: log failed", err);
        }

        return Response.json({ ok: true });
      },
    },
  },
});
