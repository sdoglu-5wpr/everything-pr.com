import { Button } from "@/components/ui/button";

export function InlineNewsletter() {
  return (
    <section className="bg-ink text-ink-foreground py-10 mt-12">
      <div className="mx-auto max-w-7xl px-6 grid md:grid-cols-2 gap-6 items-center">
        <div>
          <h3 className="font-serif text-2xl font-bold">
            Subscribe to Our Newsletter to Stay <span className="text-ticker">ahead</span> with daily headlines.
          </h3>
        </div>
        <form className="flex gap-2">
          <input
            type="email"
            required
            placeholder="Enter your email address"
            className="flex-1 rounded-md px-4 py-2.5 text-sm bg-white/10 border border-white/20 placeholder:text-white/50 text-white focus:outline-none focus:ring-2 focus:ring-white/40"
          />
          <Button type="submit" className="bg-white text-ink hover:bg-white/90">
            Subscribe
          </Button>
        </form>
      </div>
    </section>
  );
}
