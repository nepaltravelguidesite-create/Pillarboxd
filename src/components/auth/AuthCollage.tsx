import { useMemo } from "react";
import { posterUrl, backdropUrl, type TVShow } from "@/lib/tmdb";

interface AuthCollageProps {
  shows: TVShow[];
  variant?: "mobile" | "desktop";
}

/**
 * Mobile variant: diagonal, overlapping collage of 2-3 backdrop/poster images,
 * clipped with an angled bottom edge, fading into the page background.
 *
 * Desktop variant: full-height staggered poster column, 4-5 posters with
 * slight alternating rotation, fading to background at left/top/bottom edges.
 */
export function AuthCollage({ shows, variant = "mobile" }: AuthCollageProps) {
  const mobileImages = useMemo(() => {
    return shows.slice(0, 3).map((show, i) => {
      const url = show.backdrop_path
        ? backdropUrl(show.backdrop_path, "w780")
        : posterUrl(show.poster_path, "w500");
      return { url, isBackdrop: !!show.backdrop_path, index: i };
    });
  }, [shows]);

  const desktopPosters = useMemo(() => {
    return shows.slice(0, 5).map((show, i) => ({
      url: posterUrl(show.poster_path, "w342"),
      index: i,
    }));
  }, [shows]);

  // ---------------------------------------------------------------------------
  // Mobile variant
  // ---------------------------------------------------------------------------
  if (variant === "mobile") {
    if (mobileImages.length === 0) {
      return (
        <div className="relative h-[40vh] min-h-[280px] w-full overflow-hidden bg-secondary">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/40 to-background" />
        </div>
      );
    }

    return (
      <div
        className="relative h-[40vh] min-h-[280px] w-full overflow-hidden"
        style={{ clipPath: "polygon(0 0, 100% 0, 100% 82%, 0 100%)" }}
      >
        {mobileImages.map((img, i) => {
          const widths = ["55%", "50%", "45%"];
          const lefts = ["0%", "22%", "48%"];
          const tops = ["0%", "8%", "4%"];
          const zIndices = [3, 2, 1];
          return (
            <div
              key={i}
              className="absolute overflow-hidden"
              style={{
                width: widths[i] || "45%",
                left: lefts[i] || "0%",
                top: tops[i] || "0%",
                zIndex: zIndices[i] || 1,
                height: "100%",
                borderRadius: i === 0 ? "0" : "12px 0 0 0",
                transform: `rotate(${i === 0 ? 0 : i === 1 ? -1.5 : 1.5}deg)`,
                boxShadow: i === 0 ? "none" : "0 8px 32px rgba(0,0,0,0.4)",
              }}
            >
              <img src={img.url} alt="" className="h-full w-full object-cover" loading="eager" />
            </div>
          );
        })}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background pointer-events-none" />
        <div className="absolute inset-0 bg-background/10 pointer-events-none" />
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Desktop variant — tall staggered poster column
  // ---------------------------------------------------------------------------
  if (desktopPosters.length === 0) {
    return (
      <div className="relative h-full w-full bg-secondary/30" />
    );
  }

  // Poster layout: stagger vertically across full height, slight alternating
  // rotation, overlapping. Width ~42% keeps aspect-ratio height small enough
  // that 5 posters fill a 100vh column with comfortable overlap.
  const posterConfigs = [
    { top: "-4%",  left: "6%",   rotate: "-3deg",   zIndex: 5, width: "44%", opacity: 1    },
    { top: "16%",  left: "38%",  rotate: "2.5deg",  zIndex: 4, width: "44%", opacity: 1    },
    { top: "34%",  left: "8%",   rotate: "-2deg",   zIndex: 3, width: "44%", opacity: 1    },
    { top: "52%",  left: "36%",  rotate: "3deg",    zIndex: 2, width: "44%", opacity: 0.92 },
    { top: "70%",  left: "10%",  rotate: "-1.5deg", zIndex: 1, width: "44%", opacity: 0.78 },
  ];

  return (
    <div className="relative h-full w-full overflow-hidden bg-background">
      {/* Actual posters */}
      {desktopPosters.map((poster, i) => {
        const cfg = posterConfigs[i] ?? posterConfigs[0];
        return (
          <div
            key={i}
            className="absolute overflow-hidden rounded-lg"
            style={{
              top: cfg.top,
              left: cfg.left,
              width: cfg.width,
              aspectRatio: "2/3",
              zIndex: cfg.zIndex,
              transform: `rotate(${cfg.rotate})`,
              opacity: cfg.opacity,
              boxShadow: "0 12px 40px rgba(0,0,0,0.55), 0 2px 8px rgba(0,0,0,0.3)",
            }}
          >
            <img
              src={poster.url}
              alt=""
              className="h-full w-full object-cover"
              loading="eager"
            />
          </div>
        );
      })}

      {/* Right edge fade — blends seamlessly into the form column */}
      <div className="absolute inset-y-0 right-0 w-40 bg-gradient-to-l from-background to-transparent pointer-events-none" style={{ zIndex: 20 }} />
      {/* Left edge fade */}
      <div className="absolute inset-y-0 left-0 w-20 bg-gradient-to-r from-background to-transparent pointer-events-none" style={{ zIndex: 20 }} />
      {/* Top fade */}
      <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-background to-transparent pointer-events-none" style={{ zIndex: 20 }} />
      {/* Bottom fade */}
      <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-background to-transparent pointer-events-none" style={{ zIndex: 20 }} />
      {/* Overall dark overlay for depth */}
      <div className="absolute inset-0 bg-background/15 pointer-events-none" style={{ zIndex: 19 }} />
    </div>
  );
}
