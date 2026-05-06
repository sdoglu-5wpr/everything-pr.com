import { useState } from "react";
import { Button } from "@/components/ui/button";

export function NewsletterBanner() {
  const [state, setState] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") ?? "").trim();
    if (!email) return;
    setState("submitting");
    setMessage(null);
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: "newsletter_banner" }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({} as any));
        throw new Error(j.error ?? "Subscription failed");
      }
      setState("success");
      setMessage("You're subscribed — thank you!");
      (e.target as HTMLFormElement).reset();
    } catch (err) {
      setState("error");
      setMessage(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  return (
    <section
      className="rounded-2xl px-8 py-14 md:py-20 my-12 text-center text-white relative overflow-hidden"
      style={{ background: "var(--gradient-newsletter)" }}
    >
      <h2 className="font-serif text-3xl md:text-4xl font-bold max-w-2xl mx-auto leading-tight">
        Never Miss a Headline
      </h2>
      <p className="mt-4 text-white/80 max-w-xl mx-auto text-sm md:text-base">
        Daily PR headlines, weekly long-form analysis, and our proprietary
        research drops — straight to your inbox.
      </p>
      <form onSubmit={onSubmit} className="mt-7 max-w-md mx-auto flex gap-2">
        <input
          type="email"
          name="email"
          required
          placeholder="Enter your email address"
          className="flex-1 rounded-md px-4 py-2.5 text-sm text-foreground bg-white/95 placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-white"
        />
        <Button type="submit" disabled={state === "submitting"} className="bg-ink text-white hover:bg-ink/90">
          {state === "submitting" ? "…" : "Subscribe"}
        </Button>
      </form>
      {message ? (
        <p className={`mt-4 text-sm ${state === "success" ? "text-white" : "text-red-200"}`}>{message}</p>
      ) : null}
    </section>
  );
}
