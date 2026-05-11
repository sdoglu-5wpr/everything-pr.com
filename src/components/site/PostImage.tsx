import { htmlToPlainText } from "@/lib/text";
import { rewriteSupabaseHost } from "@/lib/legacy-urls";

type PostImageProps = {
  src: string | null | undefined;
  alt: string;
  className: string;
  imgClassName?: string;
  loading?: "lazy" | "eager";
};

// Deterministic gradient based on title so cards look varied but stable.
const GRADIENTS = [
  "from-[#1e3a8a] via-[#2563eb] to-[#60a5fa]",
  "from-[#0f172a] via-[#1e40af] to-[#3b82f6]",
  "from-[#7c2d12] via-[#dc2626] to-[#fb923c]",
  "from-[#064e3b] via-[#059669] to-[#34d399]",
  "from-[#4c1d95] via-[#7c3aed] to-[#a78bfa]",
  "from-[#831843] via-[#be185d] to-[#f472b6]",
  "from-[#0c4a6e] via-[#0284c7] to-[#38bdf8]",
  "from-[#713f12] via-[#a16207] to-[#facc15]",
];

function hashIndex(s: string, mod: number): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h) % mod;
}

export function PostImage({
  src,
  alt,
  className,
  imgClassName = "h-full w-full object-cover",
  loading = "lazy",
}: PostImageProps) {
  if (src) {
    const safeSrc = rewriteSupabaseHost(src);
    return (
      <div className={className}>
        <img
          src={safeSrc}
          alt={alt}
          className={imgClassName}
          loading={loading}
          decoding="async"
          fetchPriority={loading === "eager" ? "high" : "low"}
        />
      </div>
    );
  }

  const cleanTitle = htmlToPlainText(alt) || "Everything-PR";
  const gradient = GRADIENTS[hashIndex(cleanTitle, GRADIENTS.length)];
  const initials = cleanTitle
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 3)
    .map((w) => w[0]?.toUpperCase())
    .join("");

  return (
    <div className={className}>
      <div
        className={`relative flex h-full w-full items-center justify-center overflow-hidden bg-gradient-to-br ${gradient}`}
        aria-hidden
      >
        <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_20%_20%,white_1px,transparent_1px)] [background-size:18px_18px]" />
        <div className="relative z-10 flex flex-col items-center justify-center px-6 text-center">
          <span className="text-3xl font-black tracking-tight text-white/95 sm:text-4xl">
            {initials || "EPR"}
          </span>
          <span className="mt-2 line-clamp-3 max-w-[18ch] text-xs font-medium text-white/80 sm:text-sm">
            {cleanTitle}
          </span>
        </div>
      </div>
    </div>
  );
}
