import { htmlToPlainText } from "@/lib/text";

type PostImageProps = {
  src: string | null | undefined;
  alt: string;
  className: string;
  imgClassName?: string;
  loading?: "lazy" | "eager";
  width?: number;
  height?: number;
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
  width = 1600,
  height = 900,
}: PostImageProps) {
  if (src) {
    return (
      <div className={className}>
        <img
          src={src}
          alt={alt}
          className={imgClassName}
          loading={loading}
          decoding="async"
          fetchPriority={loading === "eager" ? "high" : "low"}
          width={width}
          height={height}
        />
      </div>
    );
  }

  // No image: render a quiet neutral branded surface — no auto-initials tile.
  // The "TLP/SST/COP/TPB" abomination is gone. Real OG fallback can land later.
  return (
    <div className={className}>
      <div
        className="relative flex h-full w-full items-center justify-center overflow-hidden bg-muted"
        aria-hidden
      >
        <div className="absolute inset-0 opacity-[0.04] [background-image:radial-gradient(circle_at_30%_30%,currentColor_1px,transparent_1px)] [background-size:22px_22px] text-foreground" />
        <span className="relative z-10 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground/60">
          Everything-PR
        </span>
      </div>
    </div>
  );
}
