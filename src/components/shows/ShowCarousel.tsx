import { useRef, useCallback, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ShowPosterCard } from "@/components/shows/ShowPosterCard";
import type { TVShow } from "@/lib/tmdb";
import { cn } from "@/lib/utils";

interface ShowCarouselProps {
  title: string;
  shows: TVShow[];
  loading?: boolean;
  viewAllLink?: string;
  posterSize?: "sm" | "md" | "lg";
  children?: ReactNode;
}

function PosterSkeleton({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const widthClass = {
    sm: "w-24 sm:w-28",
    md: "w-32 sm:w-36",
    lg: "w-40 sm:w-48",
  }[size];

  return (
    <div className={cn("shrink-0", widthClass)}>
      <div className="aspect-poster rounded overflow-hidden bg-muted animate-pulse" />
      <div className="mt-1.5 h-3 w-3/4 rounded bg-muted animate-pulse" />
      <div className="mt-1 h-2.5 w-1/2 rounded bg-muted/70 animate-pulse" />
    </div>
  );
}

export function ShowCarousel({
  title,
  shows,
  loading = false,
  viewAllLink,
  posterSize = "md",
}: ShowCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollBy = useCallback((direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const container = scrollRef.current;
    const scrollAmount = container.clientWidth * 0.8;
    container.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  }, []);

  const canScrollLeft = true; // always allow, scroll will just stop at edges
  const canScrollRight = true;

  return (
    <section className="w-full" aria-label={title}>
      {/* Header row */}
      <div className="flex items-center justify-between px-4 sm:px-6 lg:px-8 max-w-screen-xl mx-auto mb-3">
        <h2 className="text-base sm:text-lg font-bold text-foreground tracking-tight">
          {title}
        </h2>

        <div className="flex items-center gap-2">
          {viewAllLink && (
            <Link
              to={viewAllLink}
              className="text-[11px] uppercase tracking-widest font-semibold text-accent hover:underline transition-colors"
            >
              View All
            </Link>
          )}

          {/* Scroll buttons */}
          <div className="hidden sm:flex items-center gap-1">
            <button
              type="button"
              onClick={() => scrollBy("left")}
              disabled={!canScrollLeft}
              aria-label={`Scroll ${title} left`}
              className={cn(
                "flex items-center justify-center size-7 rounded",
                "border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30",
                "transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
              )}
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => scrollBy("right")}
              disabled={!canScrollRight}
              aria-label={`Scroll ${title} right`}
              className={cn(
                "flex items-center justify-center size-7 rounded",
                "border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30",
                "transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
              )}
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Scrolling row */}
      <div
        ref={scrollRef}
        className={cn(
          "flex gap-3 sm:gap-4 overflow-x-auto scroll-smooth",
          "px-4 sm:px-6 lg:px-8 max-w-screen-xl mx-auto",
          "pb-2",
          "snap-x snap-mandatory",
          "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        )}
      >
        {loading
          ? Array.from({ length: 8 }).map((_, i) => (
              <PosterSkeleton key={i} size={posterSize} />
            ))
          : shows.map((show, i) => (
              <div key={show.id} className="snap-start pb-fade-in" style={{ animationDelay: `${i * 40}ms` }}>
                <ShowPosterCard show={show} size={posterSize} />
              </div>
            ))}
      </div>
    </section>
  );
}
