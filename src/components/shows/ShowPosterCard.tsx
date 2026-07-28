import { useState, useEffect, memo } from "react";
import { Link } from "react-router-dom";
import { Tv, Star, Heart, Bookmark, Play } from "lucide-react";
import { bestPosterUrl, getShowDetail, type TVShow } from "@/lib/tmdb";
import { useUserData } from "@/context/UserDataContext";
import { useUI } from "@/context/UIContext";
import { useAuth } from "@/context/AuthContext";
import { useSocial } from "@/context/SocialContext";
import { cn } from "@/lib/utils";
import { getShowRatingIcon } from "@/lib/showRatingIcons";
import { StatusBadge, StatusSelectPopover } from "@/components/shows/QuickStatusControl";

interface ShowPosterCardProps {
  show: TVShow;
  size?: "sm" | "md" | "lg";
  showTitle?: boolean;
  showRating?: boolean;
  className?: string;
}

const SIZE_CLASSES: Record<NonNullable<ShowPosterCardProps["size"]>, string> = {
  sm: "w-24 sm:w-28",
  md: "w-32 sm:w-36",
  lg: "w-40 sm:w-48",
};

function ShowPosterCardInner({
  show,
  size = "md",
  showTitle = true,
  showRating = true,
  className,
}: ShowPosterCardProps) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [seasons, setSeasons] = useState<{ season_number: number; episode_count: number }[]>([]);
  const { getShowData, toggleLike, toggleWatchlist } = useUserData();
  const { openAuthModal } = useUI();
  const { user } = useAuth();
  const { getShowProgress } = useSocial();

  const showData = getShowData(show.id);
  const liked = showData?.liked ?? false;
  const watchlisted = showData?.watchlisted ?? false;
  const status = showData?.status ?? null;

  // Fetch season metadata for progress bar when show is being watched
  useEffect(() => {
    if (status !== "watching") { setSeasons([]); return; }
    let cancelled = false;
    (async () => {
      try {
        const detail = await getShowDetail(show.id, []);
        if (!cancelled) setSeasons(detail.seasons ?? []);
      } catch { if (!cancelled) setSeasons([]); }
    })();
    return () => { cancelled = true; };
  }, [show.id, status]);

  const progress = status === "watching" && seasons.length > 0
    ? getShowProgress(show.id, seasons)
    : null;
  const progressPct = progress && progress.total > 0
    ? Math.min(100, Math.round((progress.watched / progress.total) * 100))
    : 0;

  const year = show.first_air_date ? show.first_air_date.slice(0, 4) : "";
  const rating = show.vote_average > 0 ? show.vote_average.toFixed(1) : null;

  function guard(fn: () => void) {
    if (!user) {
      openAuthModal("signin");
      return;
    }
    fn();
  }

  return (
    <Link
      to={`/show/${show.id}`}
      className={cn(
        "group block shrink-0",
        SIZE_CLASSES[size],
        "focus:outline-none focus:ring-2 focus:ring-ring/40 rounded-lg",
        className
      )}
    >
      {/* Poster */}
      <div
        className={cn(
          "relative aspect-poster rounded-lg overflow-hidden bg-muted border border-border/40",
          "transition-all duration-300 ease-out pb-poster-glow",
          "group-hover:border-primary/50 group-hover:shadow-2xl group-hover:shadow-primary/10",
          "group-hover:-translate-y-1"
        )}
      >
        {/* Skeleton shimmer while loading */}
        {!imgLoaded && !imgError && (
          <div className="absolute inset-0 pb-shimmer" />
        )}

        {/* Error fallback */}
        {imgError ? (
          <div
            role="img"
            aria-label={`${show.name} poster unavailable`}
            className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-secondary/30"
          >
            <Tv className="size-8 text-muted-foreground/40" strokeWidth={1.5} />
            <span className="text-[10px] text-muted-foreground/60 text-center px-2 line-clamp-2 leading-tight">
              {show.name}
            </span>
          </div>
        ) : (
          <img
            src={bestPosterUrl(show, "w342")}
            alt={`${show.name} poster`}
            loading="lazy"
            onLoad={() => setImgLoaded(true)}
            onError={() => setImgError(true)}
            className={cn(
              "absolute inset-0 w-full h-full object-cover",
              "transition-all duration-500",
              "group-hover:scale-105",
              imgLoaded ? "opacity-100 pb-fade-in" : "opacity-0"
            )}
          />
        )}

        {/* Status badge */}
        <StatusBadge status={status} />

        {/* Rating badge */}
        {showRating && rating && (
          <div className="absolute bottom-1.5 right-1.5 flex items-center gap-0.5 rounded-md bg-black/75 px-1.5 py-0.5 backdrop-blur-sm">
            {(() => {
              const Icon = getShowRatingIcon(show.id);
              if (Icon) {
                return (
                  <Icon
                    filled
                    className="size-2.5"
                    style={{ width: 10, height: 10 }}
                  />
                );
              }
              return (
                <Star className="size-2.5 text-primary fill-primary" strokeWidth={0} />
              );
            })()}
            <span className="text-[10px] font-bold text-foreground">{rating}</span>
          </div>
        )}

        {/* Hover overlay with quick actions */}
        <div
          className={cn(
            "absolute inset-0 flex flex-col items-center justify-center gap-2",
            "bg-black/65 opacity-0 group-hover:opacity-100",
            "transition-opacity duration-200"
          )}
        >
          {/* Quick action buttons */}
          <div className="flex items-center gap-1.5">
            <StatusSelectPopover show={show} align="center">
              <button
                type="button"
                aria-label="Set status"
                className={cn(
                  "flex items-center justify-center size-8 rounded-full",
                  "border border-border/50 backdrop-blur-sm",
                  "transition-all duration-150 hover:scale-110 active:scale-95",
                  status
                    ? "bg-primary text-background border-primary"
                    : "bg-black/40 text-foreground/80 hover:text-foreground"
                )}
              >
                <Play className="size-4" strokeWidth={2} fill={status ? "currentColor" : "none"} />
              </button>
            </StatusSelectPopover>

            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                guard(() => toggleLike(show));
              }}
              aria-label={liked ? "Unlike" : "Like"}
              className={cn(
                "flex items-center justify-center size-8 rounded-full",
                "border border-border/50 backdrop-blur-sm",
                "transition-all duration-150 hover:scale-110 active:scale-95",
                liked
                  ? "bg-primary text-background border-primary"
                  : "bg-black/40 text-foreground/80 hover:text-foreground"
              )}
            >
              <Heart className="size-4" strokeWidth={2} fill={liked ? "currentColor" : "none"} />
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                guard(() => toggleWatchlist(show));
              }}
              aria-label={watchlisted ? "Remove from watchlist" : "Add to watchlist"}
              className={cn(
                "flex items-center justify-center size-8 rounded-full",
                "border border-border/50 backdrop-blur-sm",
                "transition-all duration-150 hover:scale-110 active:scale-95",
                watchlisted
                  ? "bg-accent text-background border-accent"
                  : "bg-black/40 text-foreground/80 hover:text-foreground"
              )}
            >
              <Bookmark className="size-4" strokeWidth={2} fill={watchlisted ? "currentColor" : "none"} />
            </button>
          </div>

          {/* View link hint */}
          <span className="text-[10px] uppercase tracking-widest font-bold text-primary mt-1">
            View
          </span>
        </div>
      </div>

      {/* Title + year */}
      {showTitle && (
        <div className="mt-1.5 px-0.5">
          <p className="text-xs font-medium text-foreground truncate leading-tight group-hover:text-primary transition-colors duration-150">
            {show.name}
          </p>
          {year && (
            <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
              {year}
            </p>
          )}
        </div>
      )}

      {/* Progress bar for watching shows */}
      {progress && progress.watched > 0 && (
        <div className="mt-1 px-0.5">
          <div className="h-1 w-full rounded-full bg-secondary overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5 tabular-nums">
            {progress.watched}/{progress.total} episodes
          </p>
        </div>
      )}
    </Link>
  );
}

export const ShowPosterCard = memo(ShowPosterCardInner);
