type PostImageProps = {
  src: string | null | undefined;
  alt: string;
  className: string;
  imgClassName?: string;
  loading?: "lazy" | "eager";
};

export function PostImage({
  src,
  alt,
  className,
  imgClassName = "h-full w-full object-cover",
  loading = "lazy",
}: PostImageProps) {
  return (
    <div className={className}>
      {src ? (
        <img src={src} alt={alt} className={imgClassName} loading={loading} />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-surface-soft" aria-hidden>
          <div className="h-12 w-12 rounded-full border border-brand-blue/20 bg-brand-blue/10" />
        </div>
      )}
    </div>
  );
}