type PostImageProps = {
  src: string | null | undefined;
  alt: string;
  className: string;
  imgClassName?: string;
  loading?: "lazy" | "eager";
  width?: number;
  height?: number;
};

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
