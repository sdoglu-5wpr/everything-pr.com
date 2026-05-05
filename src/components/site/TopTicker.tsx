interface TopTickerProps {
  items?: string[];
}

const DEFAULT_ITEMS = [
  "Breaking: Global markets react to new economic policies",
  "Elections 2025: Early polls show unexpected shifts",
  "Tech giant unveils next-gen AI chip",
  "President announces major education policy overhaul",
];

export function TopTicker({ items = DEFAULT_ITEMS }: TopTickerProps) {
  // Duplicate the list so the marquee loop is seamless.
  const loop = [...items, ...items];
  return (
    <div className="bg-ticker text-ticker-foreground border-y border-black/10 overflow-hidden">
      <div className="flex whitespace-nowrap ticker-track py-2 text-sm font-medium">
        {loop.map((item, i) => (
          <span key={i} className="inline-flex items-center px-6">
            <span className="inline-block w-2 h-2 bg-white/80 mr-3" aria-hidden />
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
