interface BrandMarkProps {
  size?: number;
  className?: string;
}

/** Compact halftone arc inspired by the supplied reference image. */
export function BrandMark({ size = 18, className }: BrandMarkProps) {
  const dots = Array.from({ length: 5 }, (_, ring) => {
    const radius = 5.75 + ring * 1.9;
    return Array.from({ length: 13 }, (_, point) => {
      const angle = (195 + point * 12.5) * (Math.PI / 180);
      const x = 16 + Math.cos(angle) * radius;
      const y = 16.5 + Math.sin(angle) * radius;
      const edgeFade = Math.abs(point - 6) / 6;
      const dotRadius = 0.52 + (1 - edgeFade) * 0.42 - ring * 0.025;
      return {
        key: `${ring}-${point}`,
        cx: x.toFixed(2),
        cy: y.toFixed(2),
        r: Math.max(0.2, dotRadius).toFixed(2),
        opacity: (0.26 + (1 - edgeFade) * 0.62 - ring * 0.045).toFixed(2),
      };
    });
  }).flat();

  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="currentColor"
      role="img"
      aria-label="Логотип Agent Music"
    >
      {dots.map((dot) => (
        <circle key={dot.key} cx={dot.cx} cy={dot.cy} r={dot.r} opacity={dot.opacity} />
      ))}
    </svg>
  );
}
