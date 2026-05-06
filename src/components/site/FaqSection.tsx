import { HelpCircle } from "lucide-react";
import type { FaqPair } from "@/lib/faq";

export function FaqSection({ pairs, title = "Frequently Asked Questions" }: { pairs: FaqPair[]; title?: string }) {
  if (!pairs || pairs.length < 2) return null;
  return (
    <section className="mt-12 rounded-xl border bg-surface-soft p-6 md:p-8" aria-labelledby="faq-heading">
      <div className="flex items-center gap-2 mb-5">
        <HelpCircle className="w-5 h-5 text-[color:var(--brand-blue)]" />
        <h2 id="faq-heading" className="font-serif text-2xl font-bold">
          {title}
        </h2>
      </div>
      <div className="divide-y divide-black/10">
        {pairs.map((p, i) => (
          <details key={i} className="group py-4" {...(i === 0 ? { open: true } : {})}>
            <summary className="cursor-pointer list-none flex items-start justify-between gap-4 font-semibold text-foreground hover:text-[color:var(--brand-blue)]">
              <span>{p.q}</span>
              <span className="shrink-0 text-[color:var(--brand-blue)] text-xl leading-none transition-transform group-open:rotate-45">
                +
              </span>
            </summary>
            <p className="mt-3 text-sm md:text-base text-muted-foreground leading-relaxed">{p.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
