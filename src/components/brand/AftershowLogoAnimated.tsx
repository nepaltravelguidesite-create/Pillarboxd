import { cn } from "@/lib/utils";

interface AftershowLogoAnimatedProps {
  className?: string;
  /** Size of the icon mark in px. Wordmark scales proportionally. */
  size?: number;
  /** Show the wordmark text next to the icon. Default true. */
  showWordmark?: boolean;
  /** Loop the animation indefinitely. Default true. */
  loop?: boolean;
}

/**
 * Aftershow logo — "The Projector Beam" (animated)
 *
 * Same mark as the static AftershowLogo, with the beam triangles breathing
 * in opacity, the lens circle pulsing gently, and four dust motes twinkling
 * independently on staggered cycles. Use on the homepage hero (looping) and
 * during initial app load (single play).
 */
export function AftershowLogoAnimated({
  className,
  size = 24,
  showWordmark = true,
  loop = true,
}: AftershowLogoAnimatedProps) {
  const iterationCount = loop ? "infinite" : "1";
  const fillMode = loop ? "both" : "forwards";

  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="Aftershow"
        role="img"
      >
        <path
          d="M7 25 L30 4 L30 18 Z"
          fill="currentColor"
          opacity="0.35"
          style={{
            animation: "beam-breathe-outer 5s ease-in-out",
            animationIterationCount: iterationCount,
            animationFillMode: fillMode,
          }}
        />
        <path
          d="M7 25 L18 14 L18 20 Z"
          fill="currentColor"
          opacity="0.7"
          style={{
            animation: "beam-breathe-inner 5s ease-in-out",
            animationIterationCount: iterationCount,
            animationFillMode: fillMode,
          }}
        />
        <circle
          cx="16"
          cy="12"
          r="0.7"
          fill="currentColor"
          opacity="0.6"
          style={{
            animation: "dust-twinkle-1 3.5s ease-in-out",
            animationIterationCount: iterationCount,
            animationFillMode: fillMode,
          }}
        />
        <circle
          cx="22"
          cy="10"
          r="0.5"
          fill="currentColor"
          opacity="0.5"
          style={{
            animation: "dust-twinkle-2 4s ease-in-out 0.5s",
            animationIterationCount: iterationCount,
            animationFillMode: fillMode,
          }}
        />
        <circle
          cx="24"
          cy="15"
          r="0.5"
          fill="currentColor"
          opacity="0.4"
          style={{
            animation: "dust-twinkle-3 4.5s ease-in-out 1s",
            animationIterationCount: iterationCount,
            animationFillMode: fillMode,
          }}
        />
        <circle
          cx="7"
          cy="25"
          r="2.3"
          fill="currentColor"
          style={{
            animation: "lens-pulse 5s ease-in-out",
            animationIterationCount: iterationCount,
            animationFillMode: fillMode,
          }}
        />
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
