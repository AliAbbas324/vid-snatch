import { useId } from "react";

interface Props {
  size?: number;
  className?: string;
}

/**
 * Brand mark: a filled circle carrying the play glyph, not a literal Phosphor
 * icon - a plain flat play-button reads as generic (YouTube's button, any
 * media player). The soft two-tone sphere shading is what makes it feel like
 * a mark instead of a system icon; both the disc and the glyph use the
 * theme's accent tokens so it repaints correctly in light, dark and auto
 * without any extra work.
 */
export function Logo({ size = 36, className }: Props) {
  const clipId = useId();

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      className={className}
      role="img"
      aria-label="Vid Snatch"
    >
      <defs>
        <clipPath id={clipId}>
          <circle cx="20" cy="20" r="19" />
        </clipPath>
      </defs>

      <circle cx="20" cy="20" r="19" style={{ fill: "var(--color-accent)" }} />

      {/* soft top-left highlight / bottom-right shade, clipped to the disc */}
      <g clipPath={`url(#${clipId})`}>
        <circle cx="13" cy="11" r="12" fill="#ffffff" opacity="0.16" />
        <circle cx="29" cy="31" r="10" fill="#000000" opacity="0.1" />
      </g>

      <path
        d="M16 13 L16 27 L28 20 Z"
        style={{ fill: "var(--color-accent-ink)" }}
      />
    </svg>
  );
}
