import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Mail, ChevronDown } from "lucide-react";

const FAQS: { q: string; a: React.ReactNode }[] = [
  {
    q: "What does Everything-PR cover?",
    a: "Everything-PR is the leading independent publication covering public relations, marketing, crisis communications, AI communications (GEO), social media strategy, PR measurement, agency news, and proprietary industry research. Published daily since 2009.",
  },
  {
    q: "Can I contribute a guest article or pitch a story?",
    a: (
      <>
        Yes. Send pitches to <a className="underline" href="mailto:info@everything-pr.com">info@everything-pr.com</a> with the subject line "Pitch — [topic]". Read our <Link to="/$slug" params={{ slug: "editorial-policy" }} className="underline">editorial policy</Link> before pitching for our standards on sourcing and editorial independence.
      </>
    ),
  },
  {
    q: "How do I subscribe to the newsletter?",
    a: "Use the subscribe form anywhere on the site. We send a daily digest of headlines plus weekly long-form analysis and our proprietary research drops.",
  },
  {
    q: "How do you ensure the accuracy of your reporting?",
    a: (
      <>
        All articles follow the standards in our <Link to="/$slug" params={{ slug: "editorial-policy" }} className="underline">editorial policy</Link> and corrections policy. We publish corrections promptly when needed, with the original change tracked.
      </>
    ),
  },
  {
    q: "Is Everything-PR independent?",
    a: "Yes. Everything-PR is an independent editorial publication. Any sponsored content or commercial relationships are clearly labeled per FTC rules.",
  },

  {
    q: "How often is the website updated?",
    a: "New articles are published daily. The PR Industry Salary Survey, PR Spend Transparency Study, Gaming Trust Index, and other research drops are published on the cadences listed on /research/.",
  },
];

export function ContactPage() {
  return (
    <>
      <section className="mx-auto max-w-4xl px-6 pt-16 pb-10 text-center">
        <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-foreground">
          We're Here to Listen
        </h1>
        <p className="mt-5 text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          Have a story tip, a pitch, a correction, or feedback? Reach out — we read everything and respond within 24–48 hours.
        </p>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-12">
        <div className="max-w-xl mx-auto">
          <ContactCard icon={<Mail className="w-6 h-6" />} label="Send us an email" value="info@everything-pr.com" href="mailto:info@everything-pr.com" />
        </div>
      </section>

      <section className="bg-surface-soft border-y">
        <div className="mx-auto max-w-7xl px-6 py-16 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12">
          <div className="lg:col-span-5">
            <div className="aspect-[4/5] w-full overflow-hidden rounded-lg bg-muted">
              <img
                src="https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?auto=format&fit=crop&w=1200&q=80"
                alt="Editorial workspace"
                loading="lazy"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
          <div className="lg:col-span-7">
            <ContactForm />
          </div>
        </div>
      </section>

      <section className="bg-background">
        <div className="mx-auto max-w-7xl px-6 py-20">
          <div className="flex items-center gap-3 mb-8">
            <span className="inline-block w-3 h-3 bg-ticker" aria-hidden />
            <h2 className="font-serif text-2xl md:text-3xl font-bold">Frequently Asked Questions</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12">
            {FAQS.map((f, i) => (
              <FaqItem key={i} q={f.q} a={f.a} />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

function ContactCard({ icon, label, value, href }: { icon: React.ReactNode; label: string; value: string; href?: string }) {
  const inner = (
    <>
      <div className="text-ticker mb-3">{icon}</div>
      <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">{label}</div>
      <div className="mt-1 font-serif text-lg font-semibold text-foreground">{value}</div>
    </>
  );
  return (
    <div className="rounded-lg border bg-background p-6">
      {href ? (
        <a href={href} className="block hover:text-brand-blue transition-colors">{inner}</a>
      ) : (
        inner
      )}
    </div>
  );
}

function FaqItem({ q, a }: { q: string; a: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-4 py-4 text-left"
      >
        <span className="font-semibold text-foreground">{q}</span>
        <ChevronDown className={`w-5 h-5 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open ? (
        <div className="pb-5 text-sm text-muted-foreground leading-relaxed">{a}</div>
      ) : null}
    </div>
  );
}

function ContactForm() {
  const [state, setState] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [agree, setAgree] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!agree) {
      setError("Please agree to the privacy policy.");
      return;
    }
    const fd = new FormData(e.currentTarget);
    const payload = {
      name: String(fd.get("name") ?? "").trim(),
      email: String(fd.get("email") ?? "").trim(),
      phone: String(fd.get("phone") ?? "").trim(),
      message: String(fd.get("message") ?? "").trim(),
    };
    setState("submitting");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({} as any));
        throw new Error(j.error ?? "Failed to send message");
      }
      setState("success");
      (e.target as HTMLFormElement).reset();
      setAgree(false);
    } catch (err) {
      setState("error");
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  if (state === "success") {
    return (
      <div className="rounded-lg border bg-background p-10 text-center">
        <div className="mx-auto w-14 h-14 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-3xl">
          ✓
        </div>
        <h2 className="mt-5 font-serif text-2xl md:text-3xl font-bold">Thank you!</h2>
        <p className="mt-3 text-sm text-muted-foreground max-w-md mx-auto">
          Your message has been received. A member of our editorial team will get
          back to you within 24–48 hours.
        </p>
        <button
          type="button"
          onClick={() => setState("idle")}
          className="mt-6 inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted"
        >
          Send another message
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-background p-8">
      <h2 className="font-serif text-2xl md:text-3xl font-bold">Contact Form</h2>
      <p className="mt-2 text-sm text-muted-foreground">We aim to respond to all messages within 24–48 hours.</p>

      <form onSubmit={onSubmit} method="post" action="#" className="mt-6 space-y-5" noValidate>
        <Field label="Name" name="name" required />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Email" name="email" type="email" required />
          <Field label="Phone" name="phone" type="tel" />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            Message <span className="text-ticker">*</span>
          </label>
          <textarea
            name="message"
            required
            rows={6}
            maxLength={5000}
            className="w-full rounded-md border bg-background px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ticker/40 focus:border-ticker"
          />
        </div>
        <label className="flex items-start gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={agree}
            onChange={(e) => setAgree(e.target.checked)}
            className="mt-1"
          />
          <span>
            By reaching out to us, you agree to our{" "}
            <Link to="/$slug" params={{ slug: "privacy-policy" }} className="underline">Privacy Policy</Link>.
          </span>
        </label>
        {error ? <div className="text-sm text-red-600">{error}</div> : null}
        <button
          type="submit"
          disabled={state === "submitting"}
          className="w-full rounded-md bg-ticker text-white font-semibold py-3 hover:opacity-90 disabled:opacity-60"
        >
          {state === "submitting" ? "Sending…" : "Send message"}
        </button>
        <p className="text-xs text-muted-foreground text-center">
          Join our growing community — where stories inform, inspire, and connect.
        </p>
      </form>
    </div>
  );
}

function Field({ label, name, type = "text", required = false }: { label: string; name: string; type?: string; required?: boolean }) {
  return (
    <div>
      <label className="block text-sm font-medium text-foreground mb-1.5">
        {label} {required ? <span className="text-ticker">*</span> : null}
      </label>
      <input
        type={type}
        name={name}
        required={required}
        maxLength={255}
        className="w-full rounded-md border bg-background px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ticker/40 focus:border-ticker"
      />
    </div>
  );
}
