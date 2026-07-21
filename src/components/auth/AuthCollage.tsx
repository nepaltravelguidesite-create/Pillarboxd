import { useMemo } from "react";
import { bestPosterUrl, type TVShow } from "@/lib/tmdb";

interface AuthCollageProps {
  shows: TVShow[];
  variant?: "mobile" | "desktop";
}

/**
 * Mobile variant: 2 vertical columns of posters scrolling upward continuously,
 * same infinite-loop technique as desktop but sized for mobile width.
 * Respects prefers-reduced-motion via CSS.
 *
 * Desktop variant: 4 vertical columns of posters scrolling upward on an
 * infinite loop, with alternating column speeds for a subtle parallax effect.
 * Each column's poster list is duplicated back-to-back so the translateY
 * animation loops seamlessly. Respects prefers-reduced-motion via CSS.
 */
export function AuthCollage({ shows, variant = "mobile" }: AuthCollageProps) {
  // Mobile: 2 columns, ~10 posters each (duplicated for seamless loop)
  const mobilePosters = useMemo(() => {
    return shows.slice(0, 20).map((show) => ({
      id: show.id,
      url: bestPosterUrl(show, "w342"),
    }));
  }, [shows]);

  const mobileColumns = useMemo(() => {
    const cols: typeof mobilePosters[] = [[], []];
    mobilePosters.forEach((poster, i) => {
      cols[i % 2].push(poster);
    });
    return cols.map((col) => [...col, ...col]);
  }, [mobilePosters]);

  const mobileColDurations = ["35s", "45s"];

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
    if (mobilePosters.length === 0) {
      return (
        <div className="relative h-[45vh] min-h-[300px] w-full overflow-hidden bg-secondary">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/40 to-background" />
        </div>
      );
    }

    return (
      <div className="relative h-[45vh] min-h-[300px] w-full overflow-hidden bg-background">
        {/* Scrolling poster columns */}
        <div className="flex h-full w-full gap-2 px-2">
          {mobileColumns.map((colPosters, colIdx) => (
            <div key={colIdx} className="relative flex-1 overflow-hidden">
              <div
                className="pb-scroll-col flex flex-col gap-2"
                style={{ animationDuration: mobileColDurations[colIdx] }}
              >
                {colPosters.map((poster, posterIdx) => (
                  <div
                    key={`${poster.id}-${posterIdx}`}
                    className="relative w-full overflow-hidden rounded-lg shrink-0"
                    style={{
                      aspectRatio: "2/3",
                      boxShadow:
                        "0 6px 20px rgba(0,0,0,0.5), 0 1px 4px rgba(0,0,0,0.3)",
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

        {/* Edge fades */}
        <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-background to-transparent pointer-events-none" style={{ zIndex: 20 }} />
        <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-background to-transparent pointer-events-none" style={{ zIndex: 20 }} />
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
