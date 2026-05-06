import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";

export function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 400);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!visible) return null;

  return (
    <button
      type="button"
      aria-label="Back to top"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className="fixed bottom-5 right-5 z-50 h-11 w-11 md:h-12 md:w-12 rounded-full bg-[color:var(--brand-blue)] text-white shadow-lg flex items-center justify-center hover:opacity-90 transition-opacity"
    >
      <ArrowUp className="h-5 w-5" />
    </button>
  );
}
