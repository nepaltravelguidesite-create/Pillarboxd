import { useMemo } from "react";
import { backdropUrl, bestPosterUrl, type TVShow } from "@/lib/tmdb";

interface AuthCollageProps {
  shows: TVShow[];
  variant?: "mobile" | "desktop";
}

/**
 * Mobile variant: diagonal, overlapping collage of 2-3 backdrop/poster images,
 * clipped with an angled bottom edge, fading into the page background.
 *
 * Desktop variant: 4 vertical columns of posters scrolling upward on an
 * infinite loop, with alternating column speeds for a subtle parallax effect.
 * Each column's poster list is duplicated back-to-back so the translateY
 * animation loops seamlessly. Respects prefers-reduced-motion via CSS.
 */
export function AuthCollage({ shows, variant = "mobile" }: AuthCollageProps) {
  const mobileImages = useMemo(() => {
    return shows.slice(0, 3).map((show, i) => {
      const url = show.backdrop_path
        ? backdropUrl(show.backdrop_path, "w780")
        : bestPosterUrl(show, "w500");
      return { url, isBackdrop: !!show.backdrop_path, index: i };
    });
  }, [shows]);

  // Desktop: use up to 28 shows for enough variety across 4 columns
  const desktopPosters = useMemo(() => {
    return shows.slice(0, 28).map((show) => ({
      id: show.id,
      url: bestPosterUrl(show, "w342"),
    }));
  }, [shows]);

  // Split posters into 4 columns, duplicate each for seamless loop
  const columns = useMemo(() => {
    const cols: typeof desktopPosters[] = [[], [], [], []];
    desktopPosters.forEach((poster, i) => {
      cols[i % 4].push(poster);
    });
    // Duplicate each column's content so the scroll loop is seamless
    return cols.map((col) => [...col, ...col]);
  }, [desktopPosters]);

  // Per-column animation durations for parallax effect
  const colDurations = ["40s", "55s", "45s", "60s"];

  // ---------------------------------------------------------------------------
  // Mobile variant — unchanged
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
  // Desktop variant — auto-scrolling vertical poster columns
  // ---------------------------------------------------------------------------
  if (desktopPosters.length === 0) {
    return <div className="relative h-full w-full bg-secondary/30" />;
  }

  return (
    <div className="relative h-full w-full overflow-hidden bg-background">
      {/* Scrolling poster columns */}
      <div className="flex h-full w-full gap-3 px-3">
        {columns.map((colPosters, colIdx) => (
          <div
            key={colIdx}
            className="relative flex-1 overflow-hidden"
          >
            <div
              className="pb-scroll-col flex flex-col gap-3"
              style={{
                animationDuration: colDurations[colIdx],
              }}
            >
              {colPosters.map((poster, posterIdx) => (
                <div
                  key={`${poster.id}-${posterIdx}`}
                  className="relative w-full overflow-hidden rounded-lg shrink-0"
                  style={{
                    aspectRatio: "2/3",
                    boxShadow:
                      "0 8px 28px rgba(0,0,0,0.5), 0 2px 6px rgba(0,0,0,0.3)",
                  }}
                >
                  <img
                    src={poster.url}
                    alt=""
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Edge fades — blend posters into background */}
      <div className="absolute inset-y-0 right-0 w-40 bg-gradient-to-l from-background to-transparent pointer-events-none" style={{ zIndex: 20 }} />
      <div className="absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-background to-transparent pointer-events-none" style={{ zIndex: 20 }} />
      <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-background to-transparent pointer-events-none" style={{ zIndex: 20 }} />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-background to-transparent pointer-events-none" style={{ zIndex: 20 }} />
    </div>
  );
}
