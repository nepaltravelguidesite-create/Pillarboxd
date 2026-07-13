import { cn } from "@/lib/utils";

interface AftershowLogoProps {
  className?: string;
  /** Size of the icon mark in px. Wordmark scales proportionally. */
  size?: number;
  /** Show the wordmark text next to the icon. Default true. */
  showWordmark?: boolean;
}

/**
 * Aftershow logo — "The Ghost Light"
 *
 * A bare bulb on a stand: the one lamp left glowing on an empty stage
 * after a show ends. The show's over — let's talk about it.
 * Single-color SVG, inherits currentColor, scales cleanly from 16px to favicon.
 */
export function AftershowLogo({
  className,
  size = 24,
  showWordmark = true,
}: AftershowLogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <svg
        width={(size * 20) / 32}
        height={size}
        viewBox="0 0 20 32"
        fill="currentColor"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="Aftershow"
        role="img"
      >
        {/* Bulb */}
        <circle cx="10" cy="9" r="5.5" />
        {/* Stand */}
        <rect x="8.5" y="15" width="3" height="11" rx="1.5" />
        {/* Base */}
        <rect x="3" y="26" width="14" height="3" rx="1.5" />
      </svg>
      {showWordmark && (
        <span
          className="font-display font-bold tracking-tight text-foreground leading-none"
          style={{ fontSize: (size * 13) / 24 }}
        >
          Aftershow
        </span>
      )}
    </span>
  );
}
