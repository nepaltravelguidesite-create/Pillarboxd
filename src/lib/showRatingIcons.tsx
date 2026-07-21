import type { ComponentType } from "react";

export type RatingIconProps = {
  filled: boolean;
  className?: string;
  style?: React.CSSProperties;
};

export type RatingIcon = ComponentType<RatingIconProps>;

// Lucide-react Star icon path (24×24 viewBox) — pixel-identical to the default
// StarRating icon so custom-color stars match the silhouette of regular stars.
const STAR_PATH =
  "M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z";

/**
 * Factory: creates a star icon component filled with a custom gradient.
 * The star silhouette is always the lucide Star path — only the fill color
 * changes per show.  Unfilled stars render as a low-opacity neutral outline,
 * matching the default StarRating's empty state.
 */
function createGradientStarIcon(
  gradientId: string,
  gradient: React.ReactNode,
): RatingIcon {
  return function GradientStarIcon({ filled, className, style }: RatingIconProps) {
    if (!filled) {
      return (
        <svg viewBox="0 0 24 24" className={className} style={style} fill="none">
          <path
            d={STAR_PATH}
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </svg>
      );
    }
    return (
      <svg viewBox="0 0 24 24" className={className} style={style} fill="none">
        <defs>{gradient}</defs>
        <path d={STAR_PATH} fill={`url(#${gradientId})`} />
      </svg>
    );
  };
}

// ---------------------------------------------------------------------------
// Game of Thrones — fire/ember gradient (dark #6b1e0c → bright #f2872e)
// ---------------------------------------------------------------------------

const GotStarIcon = createGradientStarIcon(
  "got-star-grad",
  <linearGradient id="got-star-grad" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%" stopColor="#6b1e0c" />
    <stop offset="100%" stopColor="#f2872e" />
  </linearGradient>,
);

// ---------------------------------------------------------------------------
// House of the Dragon — ice gradient (dark #1c3a52 → bright #cfe8f5)
// Paired as fire/ice opposite of Game of Thrones.
// ---------------------------------------------------------------------------

const HotdStarIcon = createGradientStarIcon(
  "hotd-star-grad",
  <linearGradient id="hotd-star-grad" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%" stopColor="#1c3a52" />
    <stop offset="100%" stopColor="#cfe8f5" />
  </linearGradient>,
);

// ---------------------------------------------------------------------------
// A Knight of the Seven Kingdoms — steel gradient (dark #3f434c → light #cdd2d9)
// ---------------------------------------------------------------------------

const KnightStarIcon = createGradientStarIcon(
  "knight-star-grad",
  <linearGradient id="knight-star-grad" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%" stopColor="#3f434c" />
    <stop offset="100%" stopColor="#cdd2d9" />
  </linearGradient>,
);

// ---------------------------------------------------------------------------
// Loki — gold gradient (dark #6b5314 → bright #f0c24e)
// ---------------------------------------------------------------------------

const LokiStarIcon = createGradientStarIcon(
  "loki-star-grad",
  <linearGradient id="loki-star-grad" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%" stopColor="#6b5314" />
    <stop offset="100%" stopColor="#f0c24e" />
  </linearGradient>,
);

// ---------------------------------------------------------------------------
// Twin Peaks — warm brown gradient (dark #3f2814 → tawny #c99a63)
// ---------------------------------------------------------------------------

const TwinPeaksStarIcon = createGradientStarIcon(
  "twin-peaks-star-grad",
  <linearGradient id="twin-peaks-star-grad" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%" stopColor="#3f2814" />
    <stop offset="100%" stopColor="#c99a63" />
  </linearGradient>,
);

// ---------------------------------------------------------------------------
// Lost — brass gradient (dark #5c4620 → bright #e8b84b)
// ---------------------------------------------------------------------------

const LostStarIcon = createGradientStarIcon(
  "lost-star-grad",
  <linearGradient id="lost-star-grad" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%" stopColor="#5c4620" />
    <stop offset="100%" stopColor="#e8b84b" />
  </linearGradient>,
);

// ---------------------------------------------------------------------------
// You — cold blue gradient (dark navy #14283c → icy cyan #6fc7e0)
// ---------------------------------------------------------------------------

const YouStarIcon = createGradientStarIcon(
  "you-star-grad",
  <linearGradient id="you-star-grad" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%" stopColor="#14283c" />
    <stop offset="100%" stopColor="#6fc7e0" />
  </linearGradient>,
);

// ---------------------------------------------------------------------------
// Dexter — red gradient (dark #5c0b10 → bright #d43a44)
// ---------------------------------------------------------------------------

const DexterStarIcon = createGradientStarIcon(
  "dexter-star-grad",
  <linearGradient id="dexter-star-grad" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%" stopColor="#5c0b10" />
    <stop offset="100%" stopColor="#d43a44" />
  </linearGradient>,
);

// ---------------------------------------------------------------------------
// Breaking Bad — toxic teal gradient (dark #0a3a34 → bright #5eead4)
// ---------------------------------------------------------------------------

const BreakingBadStarIcon = createGradientStarIcon(
  "breaking-bad-star-grad",
  <linearGradient id="breaking-bad-star-grad" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stopColor="#0a3a34" />
    <stop offset="100%" stopColor="#5eead4" />
  </linearGradient>,
);

// ---------------------------------------------------------------------------
// Daredevil — crimson gradient (dark #4a0a10 → bright #c8202b)
// ---------------------------------------------------------------------------

const DaredevilStarIcon = createGradientStarIcon(
  "daredevil-star-grad",
  <linearGradient id="daredevil-star-grad" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%" stopColor="#4a0a10" />
    <stop offset="100%" stopColor="#c8202b" />
  </linearGradient>,
);

// ---------------------------------------------------------------------------
// Stranger Things — festive multi-color gradient (red → teal → gold → pink)
// sweeping horizontally across the star shape.
// ---------------------------------------------------------------------------

const StrangerThingsStarIcon = createGradientStarIcon(
  "stranger-things-star-grad",
  <linearGradient id="stranger-things-star-grad" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0%" stopColor="#d9463a" />
    <stop offset="33%" stopColor="#3ab6a8" />
    <stop offset="66%" stopColor="#e8c23a" />
    <stop offset="100%" stopColor="#d94a8c" />
  </linearGradient>,
);

// ---------------------------------------------------------------------------
// Registry — keyed by TMDB show ID
// ---------------------------------------------------------------------------

export const showRatingIcons: Record<number, RatingIcon> = {
  1399: GotStarIcon, // Game of Thrones (2011) — fire/ember star
  94997: HotdStarIcon, // House of the Dragon (2022) — ice star
  224372: KnightStarIcon, // A Knight of the Seven Kingdoms (2026) — steel star
  84958: LokiStarIcon, // Loki (2021) — gold star
  1920: TwinPeaksStarIcon, // Twin Peaks (1990) — warm brown star
  4607: LostStarIcon, // Lost (2004) — brass star
  78191: YouStarIcon, // You (2018) — cold blue star
  1405: DexterStarIcon, // Dexter (2006) — red star
  1396: BreakingBadStarIcon, // Breaking Bad (2008) — toxic teal star
  61889: DaredevilStarIcon, // Marvel's Daredevil (2015) — crimson star
  66732: StrangerThingsStarIcon, // Stranger Things (2016) — festive gradient star
};

export function getShowRatingIcon(showId: number): RatingIcon | undefined {
  return showRatingIcons[showId];
}
