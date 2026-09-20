interface BrandMarkProps {
  size?: number;
  className?: string;
}

/** The supplied halftone mark, cropped by CSS to hide the source image's margin. */
export function BrandMark({ size = 26, className }: BrandMarkProps) {
  return (
    <span
      className={`brand-mark${className ? ` ${className}` : ""}`}
      style={{ width: size, height: size }}
      role="img"
      aria-label="Логотип Agent Music"
    >
      <img src="/agent-music-logo.png" alt="" width={size} height={size} />
    </span>
  );
}
