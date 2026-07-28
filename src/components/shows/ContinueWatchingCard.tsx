import { useState, useEffect, memo } from "react";
import { Link } from "react-router-dom";
import { Play, Tv, ChevronRight } from "lucide-react";
import { bestPosterUrl, backdropUrl, getShowSeason, type TVShow } from "@/lib/tmdb";
import { cn } from "@/lib/utils";

interface ContinueWatchingCardProps {
  show: TVShow;
  backdropPath?: string | null;
  className?: string;
}

function ContinueWatchingCardInner({ show, backdropPath, className }: ContinueWatchingCardProps) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [nextEpisode, setNextEpisode] = useState<{ season: number; episode: number; name: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const season1 = await getShowSeason(show.id, 1);
        if (cancelled || !season1.episodes || season1.episodes.length === 0) return;
        const firstUnwatched = season1.episodes.find((e) => e.air_date && new Date(e.air_date) <= new Date()) ?? season1.episodes[0];
        if (cancelled || !firstUnwatched) return;
        setNextEpisode({
          season: firstUnwatched.season_number,
          episode: firstUnwatched.episode_number,
          name: firstUnwatched.name,
        });
      } catch {
        // Season data unavailable — just show the card without episode info
      }
    })();
    return () => { cancelled = true; };
  }, [show.id]);

  const imgSrc = backdropPath
    ? backdropUrl(backdropPath, "w300")
    : bestPosterUrl(show, "w342");

  return (
    <Link
      to={`/show/${show.id}`}
      className={cn(
        "group block shrink-0 w-64 sm:w-72 rounded-xl overflow-hidden",
        "border border-border/40 bg-card",
        "transition-all duration-300 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-0.5",
        "focus:outline-none focus:ring-2 focus:ring-ring/40",
        className
      )}
    >
      <div className="relative h-32 sm:h-36 overflow-hidden bg-muted">
        {!imgLoaded && !imgError && <div className="absolute inset-0 animate-pulse bg-secondary/40" />}
        {imgError ? (
          <div className="absolute inset-0 flex items-center justify-center bg-secondary/30">
            <Tv className="size-8 text-muted-foreground/40" strokeWidth={1.5} />
          </div>
        ) : (
          <img
            src={imgSrc}
            alt={`${show.name}`}
            loading="lazy"
            onLoad={() => setImgLoaded(true)}
            onError={() => setImgError(true)}
            className={cn(
              "absolute inset-0 w-full h-full object-cover",
              "transition-all duration-500 group-hover:scale-105",
              imgLoaded ? "opacity-100" : "opacity-0"
            )}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <div className="flex items-center justify-center size-10 rounded-full bg-primary text-primary-foreground shadow-lg">
            <Play className="size-4 ml-0.5" fill="currentColor" />
          </div>
        </div>
        <div className="absolute bottom-2 left-3 right-3">
          <p className="text-sm font-bold text-white truncate leading-tight">{show.name}</p>
        </div>
      </div>
      {nextEpisode ? (
        <div className="flex items-center justify-between gap-2 px-3 py-2">
          <p className="text-xs text-muted-foreground truncate">
            Up next: <span className="text-foreground font-medium">S{nextEpisode.season}E{nextEpisode.episode}</span> — {nextEpisode.name}
          </p>
          <ChevronRight className="size-4 text-muted-foreground shrink-0 group-hover:text-primary transition-colors" />
        </div>
      ) : (
        <div className="flex items-center justify-between gap-2 px-3 py-2">
          <p className="text-xs text-muted-foreground truncate">{show.name}</p>
          <ChevronRight className="size-4 text-muted-foreground shrink-0 group-hover:text-primary transition-colors" />
        </div>
      )}
    </Link>
  );
}

export const ContinueWatchingCard = memo(ContinueWatchingCardInner);
