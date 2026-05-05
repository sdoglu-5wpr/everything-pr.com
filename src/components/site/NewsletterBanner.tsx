import { Button } from "@/components/ui/button";

export function NewsletterBanner() {
  return (
    <section
      className="rounded-2xl px-8 py-14 md:py-20 my-12 text-center text-white relative overflow-hidden"
      style={{ background: "var(--gradient-newsletter)" }}
    >
      <h2 className="font-serif text-3xl md:text-4xl font-bold max-w-2xl mx-auto leading-tight">
        Join 1M+ Readers Who Never Miss a Headline
      </h2>
      <p className="mt-4 text-white/80 max-w-xl mx-auto text-sm md:text-base">
        Stay informed wherever you are — join our growing community of readers
        and followers across social platforms.
      </p>
      <form className="mt-7 max-w-md mx-auto flex gap-2">
        <input
          type="email"
          required
          placeholder="Enter your email address"
          className="flex-1 rounded-md px-4 py-2.5 text-sm text-foreground bg-white/95 placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-white"
        />
        <Button type="submit" className="bg-ink text-white hover:bg-ink/90">
          Subscribe
        </Button>
      </form>
    </section>
  );
}
