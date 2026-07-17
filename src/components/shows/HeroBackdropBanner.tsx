import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Star, Play, Info, ChevronLeft, ChevronRight, Tv } from "lucide-react";
import { backdropUrl, type TVShow } from "@/lib/tmdb";
import { cn } from "@/lib/utils";

interface HeroBackdropBannerProps {
  shows: TVShow[];
  loading?: boolean;
}

export function HeroBackdropBanner({ shows, loading = false }: HeroBackdropBannerProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [imgLoaded, setImgLoaded] = useState<Record<number, boolean>>({});
  const [imgError, setImgError] = useState<Record<number, boolean>>({});

  const heroShows = shows.slice(0, 5);

  // Auto-advance every 7 seconds
  useEffect(() => {
    if (heroShows.length <= 1) return;
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % heroShows.length);
    }, 7000);
    return () => clearInterval(timer);
  }, [heroShows.length]);

  // Reset image states when shows change
  useEffect(() => {
    setImgLoaded({});
    setImgError({});
    setActiveIndex(0);
  }, [shows]);

  if (loading || heroShows.length === 0) {
    return (
      <div className="relative w-full aspect-[16/9] sm:aspect-[21/9] max-h-[520px] bg-muted animate-pulse">
        <div className="absolute inset-0 bg-gradient-to-br from-muted to-secondary/30" />
      </div>
    );
  }

  const activeShow = heroShows[activeIndex];
  const year = activeShow.first_air_date
    ? activeShow.first_air_date.slice(0, 4)
    : "";
  const rating = activeShow.vote_average > 0
    ? activeShow.vote_average.toFixed(1)
    : null;

  function goTo(idx: number) {
    setActiveIndex((idx + heroShows.length) % heroShows.length);
  }

  return (
    <section
      className="relative w-full aspect-[16/9] sm:aspect-[21/9] max-h-[520px] overflow-hidden bg-muted"
      aria-label="Featured shows"
      aria-roledescription="carousel"
    >
      {/* Backdrop slides */}
      {heroShows.map((show, idx) => {
        const loaded = imgLoaded[idx];
        const errored = imgError[idx];
        const isActive = idx === activeIndex;

        return (
          <div
            key={show.id}
            className={cn(
              "absolute inset-0 transition-opacity duration-700",
              isActive ? "opacity-100" : "opacity-0 pointer-events-none"
            )}
            aria-hidden={!isActive}
          >
            {/* Skeleton while loading */}
            {!loaded && !errored && (
              <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-muted to-secondary/50" />
            )}

            {/* Error fallback */}
            {errored ? (
              <div className="absolute inset-0 flex items-center justify-center bg-secondary/30">
                <Tv className="size-16 text-muted-foreground/30" strokeWidth={1} />
              </div>
            ) : (
              <img
                src={backdropUrl(show.backdrop_path, "w1280")}
                alt={`${show.name} backdrop`}
                loading={idx === 0 ? "eager" : "lazy"}
                onLoad={() => setImgLoaded((prev) => ({ ...prev, [idx]: true }))}
                onError={() => setImgError((prev) => ({ ...prev, [idx]: true }))}
                className={cn(
                  "absolute inset-0 w-full h-full object-cover",
                  "transition-opacity duration-500",
                  loaded ? "opacity-100" : "opacity-0"
                )}
              />
            )}

            {/* Gradient overlays for readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-background/80 via-transparent to-transparent" />
          </div>
        );
      })}

      {/* Content overlay */}
      <div className="absolute inset-0 flex items-end">
        <div className="w-full px-4 sm:px-6 lg:px-8 pb-8 sm:pb-10 lg:pb-12">
          <div className="max-w-screen-xl mx-auto">
            {/* Rank indicator */}
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] uppercase tracking-widest font-bold text-primary">
                Trending #{activeIndex + 1}
              </span>
            </div>

            {/* Title */}
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground tracking-tight max-w-2xl leading-tight">
              {activeShow.name}
            </h1>

            {/* Meta row */}
            <div className="flex items-center gap-3 mt-2">
              {year && (
                <span className="text-xs sm:text-sm text-muted-foreground">{year}</span>
              )}
              {rating && (
                <div className="flex items-center gap-1">
                  <Star className="size-3 text-primary fill-primary" />
                  <span className="text-xs sm:text-sm font-medium text-foreground">{rating}</span>
                </div>
              )}
            </div>

            {/* Overview */}
            {activeShow.overview && (
              <p className="hidden sm:block mt-3 text-sm text-foreground/70 max-w-xl line-clamp-2 leading-relaxed">
                {activeShow.overview}
              </p>
            )}

            {/* CTA buttons */}
            <div className="flex items-center gap-2 mt-4">
              <Link
                to={`/show/${activeShow.id}`}
                className={cn(
                  "flex items-center gap-1.5 h-9 px-4 rounded",
                  "bg-primary text-primary-foreground font-bold text-xs uppercase tracking-widest",
                  "hover:bg-primary/90 active:scale-95",
                  "transition-all duration-150"
                )}
              >
                <Play className="size-3.5 fill-primary-foreground" />
                <span>View</span>
              </Link>
              <Link
                to={`/show/${activeShow.id}`}
                className={cn(
                  "flex items-center gap-1.5 h-9 px-4 rounded",
                  "border border-border bg-background/50 backdrop-blur-sm",
                  "text-foreground/80 hover:text-foreground hover:border-foreground/30",
                  "font-medium text-xs uppercase tracking-widest",
                  "transition-all duration-150"
                )}
              >
                <Info className="size-3.5" />
                <span>Details</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Arrow controls */}
      {heroShows.length > 1 && (
        <>
          <button
            type="button"
            onClick={() => goTo(activeIndex - 1)}
            aria-label="Previous featured show"
            className={cn(
              "absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-10",
              "flex items-center justify-center size-9 rounded-full",
              "bg-black/40 backdrop-blur-sm text-foreground/80 hover:text-foreground hover:bg-black/60",
              "transition-all duration-150"
            )}
          >
            <ChevronLeft className="size-5" />
          </button>
          <button
            type="button"
            onClick={() => goTo(activeIndex + 1)}
            aria-label="Next featured show"
            className={cn(
              "absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-10",
              "flex items-center justify-center size-9 rounded-full",
              "bg-black/40 backdrop-blur-sm text-foreground/80 hover:text-foreground hover:bg-black/60",
              "transition-all duration-150"
            )}
          >
            <ChevronRight className="size-5" />
          </button>
        </>
      )}

      {/* Dot indicators */}
      {heroShows.length > 1 && (
        <div className="absolute bottom-3 right-4 sm:right-6 flex items-center gap-1.5 z-10">
          {heroShows.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => goTo(idx)}
              aria-label={`Go to featured show ${idx + 1}`}
              className={cn(
                "h-1.5 rounded-full transition-all duration-200",
                idx === activeIndex
                  ? "w-6 bg-primary"
                  : "w-1.5 bg-foreground/40 hover:bg-foreground/60"
              )}
            />
          ))}
        </div>
      )}
    </section>
  );
}
