import { useMemo } from "react";
import { posterUrl, backdropUrl, type TVShow } from "@/lib/tmdb";

interface AuthCollageProps {
  shows: TVShow[];
}

/**
 * Diagonal, overlapping collage of 2-3 real show backdrop/poster images,
 * clipped with an angled bottom edge, fading into the page background.
 * Occupies the top ~40% of the viewport.
 */
export function AuthCollage({ shows }: AuthCollageProps) {
  // Pick up to 3 shows with backdrop images, fall back to posters
  const images = useMemo(() => {
    return shows.slice(0, 3).map((show, i) => {
      const url = show.backdrop_path
        ? backdropUrl(show.backdrop_path, "w780")
        : posterUrl(show.poster_path, "w500");
      return { url, isBackdrop: !!show.backdrop_path, index: i };
    });
  }, [shows]);

  if (images.length === 0) {
    return (
      <div className="relative h-[40vh] min-h-[280px] w-full overflow-hidden bg-secondary">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/40 to-background" />
      </div>
    );
  }

  return (
    <div
      className="relative h-[40vh] min-h-[280px] w-full overflow-hidden"
      style={{
        clipPath: "polygon(0 0, 100% 0, 100% 82%, 0 100%)",
      }}
    >
      {/* Image layers — overlapping with different offsets */}
      {images.map((img, i) => {
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
            <img
              src={img.url}
              alt=""
              className="h-full w-full object-cover"
              loading="eager"
            />
          </div>
        );
      })}

      {/* Gradient fade to background at bottom */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background pointer-events-none" />

      {/* Subtle dark overlay for text legibility if needed */}
      <div className="absolute inset-0 bg-background/10 pointer-events-none" />
    </div>
  );
}
