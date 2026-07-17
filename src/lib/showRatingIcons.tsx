import type { ComponentType } from "react";

export type RatingIconProps = {
  filled: boolean;
  className?: string;
  style?: React.CSSProperties;
};

export type RatingIcon = ComponentType<RatingIconProps>;

// ---------------------------------------------------------------------------
// Game of Thrones — Iron Throne (steel gradient)
// ---------------------------------------------------------------------------

function GotThroneIcon({ filled, className, style }: RatingIconProps) {
  if (!filled) {
    return (
      <svg viewBox="0 0 24 24" className={className} style={style} fill="none">
        <path
          d="M4 20 L4 10 L6 6 L7.5 10.5 L9 5 L10.5 10.5 L12 4 L13.5 10.5 L15 5 L16.5 10.5 L18 6 L20 10 L20 20 Z"
          fill="currentColor"
          opacity={0.25}
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className={className} style={style} fill="none">
      <defs>
        <linearGradient id="got-throne-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#3d4149" />
          <stop offset="100%" stopColor="#c9ced6" />
        </linearGradient>
      </defs>
      <path
        d="M4 20 L4 10 L6 6 L7.5 10.5 L9 5 L10.5 10.5 L12 4 L13.5 10.5 L15 5 L16.5 10.5 L18 6 L20 10 L20 20 Z"
        fill="url(#got-throne-grad)"
      />
      {/* Bright accent slivers at the tips of the central 3 spikes */}
      <path d="M10.5 10.5 L12 4 L12 6.5 Z" fill="#e8eaed" />
      <path d="M9 5 L10.5 10.5 L9.6 8 Z" fill="#dfe2e6" />
      <path d="M15 5 L13.5 10.5 L14.4 8 Z" fill="#dfe2e6" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// House of the Dragon — dragon in flight (ember gradient, radial)
// ---------------------------------------------------------------------------

function HotdDragonIcon({ filled, className, style }: RatingIconProps) {
  if (!filled) {
    return (
      <svg viewBox="0 0 24 24" className={className} style={style} fill="none">
        <path
          d="M12 3 C9 6 3 8 2 9 C6 10 8 9.5 9.5 8.5 C8 12 8 15 8 15 L11 12 L12 15 L13 12 L16 15 C16 15 16 12 14.5 8.5 C16 9.5 18 10 22 9 C21 8 15 6 12 3 Z"
          fill="currentColor"
          opacity={0.25}
        />
        <path
          d="M11 15 C10.5 17 11 20 12 21 C13 20 13.5 17 13 15 Z"
          fill="currentColor"
          opacity={0.25}
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className={className} style={style} fill="none">
      <defs>
        <radialGradient id="hotd-dragon-grad" cx="0.5" cy="0.5" r="0.7">
          <stop offset="0%" stopColor="#f2872e" />
          <stop offset="100%" stopColor="#6b1e0c" />
        </radialGradient>
      </defs>
      <path
        d="M12 3 C9 6 3 8 2 9 C6 10 8 9.5 9.5 8.5 C8 12 8 15 8 15 L11 12 L12 15 L13 12 L16 15 C16 15 16 12 14.5 8.5 C16 9.5 18 10 22 9 C21 8 15 6 12 3 Z"
        fill="url(#hotd-dragon-grad)"
      />
      <path
        d="M11 15 C10.5 17 11 20 12 21 C13 20 13.5 17 13 15 Z"
        fill="url(#hotd-dragon-grad)"
      />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// A Knight of the Seven Kingdoms — helm (steel gradient)
// ---------------------------------------------------------------------------

function KnightHelmIcon({ filled, className, style }: RatingIconProps) {
  if (!filled) {
    return (
      <svg viewBox="0 0 24 24" className={className} style={style} fill="none">
        <path
          d="M8 4 Q8 2.5 12 2.5 Q16 2.5 16 4 L16 9 Q16 11 14.5 12.5 L15.5 20 Q15.5 21 14.5 21 L9.5 21 Q8.5 21 8.5 20 L9.5 12.5 Q8 11 8 9 Z"
          fill="currentColor"
          opacity={0.25}
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className={className} style={style} fill="none">
      <defs>
        <linearGradient id="knight-helm-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#3f434c" />
          <stop offset="100%" stopColor="#cdd2d9" />
        </linearGradient>
      </defs>
      <path
        d="M8 4 Q8 2.5 12 2.5 Q16 2.5 16 4 L16 9 Q16 11 14.5 12.5 L15.5 20 Q15.5 21 14.5 21 L9.5 21 Q8.5 21 8.5 20 L9.5 12.5 Q8 11 8 9 Z"
        fill="url(#knight-helm-grad)"
      />
      <rect x="9.5" y="7" width="5" height="1.4" fill="var(--card)" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Loki — horned helmet (gold gradient, radial)
// ---------------------------------------------------------------------------

function LokiHornIcon({ filled, className, style }: RatingIconProps) {
  if (!filled) {
    return (
      <svg viewBox="0 0 24 24" className={className} style={style} fill="none">
        <circle cx="12" cy="12" r="5.5" fill="currentColor" opacity={0.25} />
        <path d="M8 8 C5 6 3 2 4 1 C6 2 8 6 9.5 9 Z" fill="currentColor" opacity={0.25} />
        <path d="M16 8 C19 6 21 2 20 1 C18 2 16 6 14.5 9 Z" fill="currentColor" opacity={0.25} />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className={className} style={style} fill="none">
      <defs>
        <radialGradient id="loki-horn-grad" cx="0.5" cy="0.5" r="0.6">
          <stop offset="0%" stopColor="#f0c24e" />
          <stop offset="100%" stopColor="#6b5314" />
        </radialGradient>
      </defs>
      <circle cx="12" cy="12" r="5.5" fill="url(#loki-horn-grad)" />
      <path d="M8 8 C5 6 3 2 4 1 C6 2 8 6 9.5 9 Z" fill="url(#loki-horn-grad)" />
      <path d="M16 8 C19 6 21 2 20 1 C18 2 16 6 14.5 9 Z" fill="url(#loki-horn-grad)" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Twin Peaks — owl (warm brown gradient)
// ---------------------------------------------------------------------------

function TwinPeaksOwlIcon({ filled, className, style }: RatingIconProps) {
  if (!filled) {
    return (
      <svg viewBox="0 0 24 24" className={className} style={style} fill="none">
        <path d="M12 3 L9 6 L15 6 Z" fill="currentColor" opacity={0.25} />
        <ellipse cx="12" cy="13" rx="7" ry="8" fill="currentColor" opacity={0.25} />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className={className} style={style} fill="none">
      <defs>
        <linearGradient id="twin-peaks-owl-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#3f2814" />
          <stop offset="100%" stopColor="#c99a63" />
        </linearGradient>
      </defs>
      <path d="M12 3 L9 6 L15 6 Z" fill="url(#twin-peaks-owl-grad)" />
      <ellipse cx="12" cy="13" rx="7" ry="8" fill="url(#twin-peaks-owl-grad)" />
      <circle cx="9" cy="12" r="2.6" fill="var(--card)" />
      <circle cx="15" cy="12" r="2.6" fill="var(--card)" />
      <circle cx="9" cy="12" r="1.1" fill="#f0c24e" />
      <circle cx="15" cy="12" r="1.1" fill="#f0c24e" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Lost — compass (brass gradient)
// ---------------------------------------------------------------------------

function LostCompassIcon({ filled, className, style }: RatingIconProps) {
  if (!filled) {
    return (
      <svg viewBox="0 0 24 24" className={className} style={style} fill="none">
        <circle
          cx="12"
          cy="12"
          r="9"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          opacity={0.25}
        />
        <path d="M12 6 L14 12 L12 12 Z" fill="currentColor" opacity={0.25} />
        <path d="M12 12 L14 12 L12 18 Z" fill="currentColor" opacity={0.25} />
        <path d="M12 12 L12 6 L10 12 Z" fill="currentColor" opacity={0.25} />
        <path d="M12 12 L10 12 L12 18 Z" fill="currentColor" opacity={0.25} />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className={className} style={style} fill="none">
      <defs>
        <linearGradient id="lost-compass-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#5c4620" />
          <stop offset="100%" stopColor="#e8b84b" />
        </linearGradient>
      </defs>
      <circle
        cx="12"
        cy="12"
        r="9"
        fill="none"
        stroke="url(#lost-compass-grad)"
        strokeWidth={1.8}
      />
      <path d="M12 6 L14 12 L12 12 Z" fill="#e8b84b" />
      <path d="M12 12 L14 12 L12 18 Z" fill="#5c4620" />
      <path d="M12 12 L12 6 L10 12 Z" fill="#5c4620" />
      <path d="M12 12 L10 12 L12 18 Z" fill="#e8b84b" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// You — watching eye (cold blue gradient, radial for iris)
// ---------------------------------------------------------------------------

function YouEyeIcon({ filled, className, style }: RatingIconProps) {
  if (!filled) {
    return (
      <svg viewBox="0 0 24 24" className={className} style={style} fill="none">
        <path
          d="M2 12 C5 6 19 6 22 12 C19 18 5 18 2 12 Z"
          fill="currentColor"
          opacity={0.25}
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className={className} style={style} fill="none">
      <defs>
        <radialGradient id="you-eye-grad" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#6fc7e0" />
          <stop offset="100%" stopColor="#14283c" />
        </radialGradient>
      </defs>
      <path d="M2 12 C5 6 19 6 22 12 C19 18 5 18 2 12 Z" fill="#14283c" />
      <circle cx="12" cy="12" r="4" fill="url(#you-eye-grad)" />
      <circle cx="12" cy="12" r="1.6" fill="var(--card)" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Dexter — blood droplet (red gradient, radial from upper-left)
// ---------------------------------------------------------------------------

function DexterDropletIcon({ filled, className, style }: RatingIconProps) {
  if (!filled) {
    return (
      <svg viewBox="0 0 24 24" className={className} style={style} fill="none">
        <path
          d="M12 2 C12 2 5 12 5 16.5 C5 20.6 8.1 22 12 22 C15.9 22 19 20.6 19 16.5 C19 12 12 2 12 2 Z"
          fill="currentColor"
          opacity={0.25}
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className={className} style={style} fill="none">
      <defs>
        <radialGradient id="dexter-droplet-grad" cx="0.35" cy="0.3" r="0.75">
          <stop offset="0%" stopColor="#d43a44" />
          <stop offset="100%" stopColor="#5c0b10" />
        </radialGradient>
      </defs>
      <path
        d="M12 2 C12 2 5 12 5 16.5 C5 20.6 8.1 22 12 22 C15.9 22 19 20.6 19 16.5 C19 12 12 2 12 2 Z"
        fill="url(#dexter-droplet-grad)"
      />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Breaking Bad — flask (toxic teal gradient, vertical)
// ---------------------------------------------------------------------------

function BreakingBadFlaskIcon({ filled, className, style }: RatingIconProps) {
  if (!filled) {
    return (
      <svg viewBox="0 0 24 24" className={className} style={style} fill="none">
        <rect x="10" y="2" width="4" height="4" fill="currentColor" opacity={0.25} />
        <path
          d="M10 6 L10 11 L4.5 20 C4 21 4.7 22 6 22 L18 22 C19.3 22 20 21 19.5 20 L14 11 L14 6 Z"
          fill="currentColor"
          opacity={0.25}
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className={className} style={style} fill="none">
      <defs>
        <linearGradient id="breaking-bad-flask-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0a3a34" />
          <stop offset="100%" stopColor="#5eead4" />
        </linearGradient>
      </defs>
      <rect x="10" y="2" width="4" height="4" fill="url(#breaking-bad-flask-grad)" />
      <path
        d="M10 6 L10 11 L4.5 20 C4 21 4.7 22 6 22 L18 22 C19.3 22 20 21 19.5 20 L14 11 L14 6 Z"
        fill="url(#breaking-bad-flask-grad)"
      />
      <circle cx="9" cy="17" r="1" fill="#5eead4" />
      <circle cx="14.5" cy="18.5" r="0.8" fill="#5eead4" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Daredevil — devil mask (crimson gradient, radial)
// ---------------------------------------------------------------------------

function DaredevilMaskIcon({ filled, className, style }: RatingIconProps) {
  if (!filled) {
    return (
      <svg viewBox="0 0 24 24" className={className} style={style} fill="none">
        <path
          d="M6 6 Q6 4.5 12 4.5 Q18 4.5 18 6 L18 12 Q18 20 12 21.5 Q6 20 6 12 Z"
          fill="currentColor"
          opacity={0.25}
        />
        <path d="M8 4 L6 1 L4 5 Z" fill="currentColor" opacity={0.25} />
        <path d="M16 4 L18 1 L20 5 Z" fill="currentColor" opacity={0.25} />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className={className} style={style} fill="none">
      <defs>
        <radialGradient id="daredevil-mask-grad" cx="0.5" cy="0.5" r="0.6">
          <stop offset="0%" stopColor="#c8202b" />
          <stop offset="100%" stopColor="#4a0a10" />
        </radialGradient>
      </defs>
      <path
        d="M6 6 Q6 4.5 12 4.5 Q18 4.5 18 6 L18 12 Q18 20 12 21.5 Q6 20 6 12 Z"
        fill="url(#daredevil-mask-grad)"
      />
      <path d="M8 4 L6 1 L4 5 Z" fill="url(#daredevil-mask-grad)" />
      <path d="M16 4 L18 1 L20 5 Z" fill="url(#daredevil-mask-grad)" />
      <rect x="8.5" y="10.5" width="3" height="1.6" fill="var(--card)" />
      <rect x="12.5" y="10.5" width="3" height="1.6" fill="var(--card)" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Stranger Things — string lights (multi-color, flat)
// ---------------------------------------------------------------------------

function StrangerThingsLightsIcon({ filled, className, style }: RatingIconProps) {
  if (!filled) {
    return (
      <svg viewBox="0 0 24 24" className={className} style={style} fill="none">
        <path
          d="M2 6 Q12 14 22 6"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.4}
          opacity={0.25}
        />
        <ellipse cx="4.5" cy="8.3" rx="1.6" ry="2.1" fill="currentColor" opacity={0.25} />
        <ellipse cx="9.5" cy="11.8" rx="1.6" ry="2.1" fill="currentColor" opacity={0.25} />
        <ellipse cx="14.5" cy="11.8" rx="1.6" ry="2.1" fill="currentColor" opacity={0.25} />
        <ellipse cx="19.5" cy="8.3" rx="1.6" ry="2.1" fill="currentColor" opacity={0.25} />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className={className} style={style} fill="none">
      <path d="M2 6 Q12 14 22 6" fill="none" stroke="#4a4f57" strokeWidth={1.4} />
      <ellipse cx="4.5" cy="8.3" rx="1.6" ry="2.1" fill="#d9463a" />
      <ellipse cx="9.5" cy="11.8" rx="1.6" ry="2.1" fill="#3ab6a8" />
      <ellipse cx="14.5" cy="11.8" rx="1.6" ry="2.1" fill="#e8c23a" />
      <ellipse cx="19.5" cy="8.3" rx="1.6" ry="2.1" fill="#d94a8c" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Registry — keyed by TMDB show ID
// ---------------------------------------------------------------------------

export const showRatingIcons: Record<number, RatingIcon> = {
  1399: GotThroneIcon, // Game of Thrones (2011)
  94997: HotdDragonIcon, // House of the Dragon (2022)
  224372: KnightHelmIcon, // A Knight of the Seven Kingdoms (2026)
  84958: LokiHornIcon, // Loki (2021)
  1920: TwinPeaksOwlIcon, // Twin Peaks (1990, includes The Return as S3)
  4607: LostCompassIcon, // Lost (2004)
  78191: YouEyeIcon, // You (2018)
  1405: DexterDropletIcon, // Dexter (2006)
  1396: BreakingBadFlaskIcon, // Breaking Bad (2008)
  61889: DaredevilMaskIcon, // Marvel's Daredevil (2015)
  66732: StrangerThingsLightsIcon, // Stranger Things (2016)
};

export function getShowRatingIcon(showId: number): RatingIcon | undefined {
  return showRatingIcons[showId];
}
