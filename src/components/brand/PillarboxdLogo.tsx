import { cn } from "@/lib/utils";

interface PillarboxdLogoProps {
  className?: string;
  /** Size of the icon mark in px. Wordmark scales proportionally. */
  size?: number;
  /** Show the wordmark text next to the icon. Default true. */
  showWordmark?: boolean;
}

/**
 * Pillarboxd logo — "The Colonnade"
 *
 * Three pillars of varying heights forming an architectural colonnade.
 * The tallest center pillar creates a natural focal point.
 * Single-color SVG, inherits currentColor, scales cleanly from 16px to favicon.
 */
export function PillarboxdLogo({
  className,
  size = 24,
  showWordmark = true,
}: PillarboxdLogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <svg
        width={size}
        height={(size * 24) / 32}
        viewBox="0 0 32 24"
        fill="currentColor"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="Pillarboxd"
        role="img"
      >
        {/* Left pillar — shorter */}
        <rect x="3" y="10" width="5" height="12" rx="0.5" />
        {/* Center pillar — tallest, focal point */}
        <rect x="13.5" y="5" width="5" height="17" rx="0.5" />
        {/* Right pillar — medium */}
        <rect x="24" y="13" width="5" height="9" rx="0.5" />
      </svg>
      {showWordmark && (
        <span
          className="font-display font-bold tracking-tight text-foreground leading-none"
          style={{ fontSize: (size * 13) / 24 }}
        >
          Pillarboxd
        </span>
      )}
    </span>
  );
}
