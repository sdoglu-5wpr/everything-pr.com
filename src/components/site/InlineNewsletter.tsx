import { useState } from "react";
import { Button } from "@/components/ui/button";

export function InlineNewsletter() {
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
        body: JSON.stringify({ email, source: "inline_newsletter" }),
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
    <section className="bg-ink text-ink-foreground py-10 mt-12">
      <div className="mx-auto max-w-7xl px-6 grid md:grid-cols-2 gap-6 items-center">
        <div>
          <h3 className="font-serif text-2xl font-bold">
            Subscribe to Our Newsletter to Stay <span className="text-ticker">ahead</span> with daily headlines.
          </h3>
        </div>
        <div>
          <form onSubmit={onSubmit} className="flex gap-2">
            <input
              type="email"
              name="email"
              required
              placeholder="Enter your email address"
              className="flex-1 rounded-md px-4 py-2.5 text-sm bg-white/10 border border-white/20 placeholder:text-white/50 text-white focus:outline-none focus:ring-2 focus:ring-white/40"
            />
            <Button type="submit" disabled={state === "submitting"} className="bg-white text-ink hover:bg-white/90">
              {state === "submitting" ? "…" : "Subscribe"}
            </Button>
          </form>
          {message ? (
            <p className={`mt-3 text-sm ${state === "success" ? "text-white/90" : "text-red-300"}`}>{message}</p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
