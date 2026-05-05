import { Link } from "@tanstack/react-router";

type TickerItem = { slug: string; title: string };

interface TopTickerProps {
  items?: TickerItem[];
}

const FALLBACK: TickerItem[] = [
  { slug: "", title: "Welcome to Everything-PR" },
];

export function TopTicker({ items }: TopTickerProps) {
  const list = items && items.length ? items : FALLBACK;
  // Duplicate so the marquee loop is seamless.
  const loop = [...list, ...list];
  return (
    <div className="bg-ticker text-ticker-foreground border-y border-black/10 overflow-hidden">
      <div className="flex whitespace-nowrap ticker-track py-2 text-sm font-medium">
        {loop.map((item, i) => (
          <span key={i} className="inline-flex items-center px-6 shrink-0">
            <span className="inline-block w-2 h-2 bg-white/80 mr-3" aria-hidden />
            {item.slug ? (
              <Link
                to="/$slug"
                params={{ slug: item.slug }}
                className="text-ticker-foreground hover:underline"
              >
                {item.title}
              </Link>
            ) : (
              <span>{item.title}</span>
            )}
          </span>
        ))}
      </div>
    </div>
  );
}
