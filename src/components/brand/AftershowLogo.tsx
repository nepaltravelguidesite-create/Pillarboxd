import { cn } from "@/lib/utils";

interface AftershowLogoProps {
  className?: string;
  /** Size of the icon mark in px. Wordmark scales proportionally. */
  size?: number;
  /** Show the wordmark text next to the icon. Default true. */
  showWordmark?: boolean;
}

/**
 * Aftershow logo - "The Projector Beam"
 *
 * A film projector's beam still cutting through a dark room after the reel
 * has ended - dust drifting in the light - right before the house lights
 * come up. Single-color SVG, inherits currentColor, scales from 16px to favicon.
 */
export function AftershowLogo({
  className,
  size = 24,
  showWordmark = true,
}: AftershowLogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <svg
        width={size}
        height={size}
        viewBox="4 3 27 25"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="Aftershow"
        role="img"
      >
        <path d="M7 25 L30 4 L30 18 Z" fill="currentColor" opacity="0.35" />
        <path d="M7 25 L18 14 L18 20 Z" fill="currentColor" opacity="0.7" />
        <circle cx="16" cy="12" r="0.7" fill="currentColor" opacity="0.6" />
        <circle cx="22" cy="10" r="0.5" fill="currentColor" opacity="0.5" />
        <circle cx="24" cy="15" r="0.5" fill="currentColor" opacity="0.4" />
        <circle cx="7" cy="25" r="2.3" fill="currentColor" />
      </svg>
      {showWordmark && (
        <span
          className="font-display font-bold tracking-tight text-foreground leading-none"
          style={{ fontSize: (size * 15) / 24, marginTop: 1 }}
        >
          Aftershow
        </span>
      )}
    </span>
  );
}
