import { useState, memo } from "react";
import { Link } from "react-router-dom";
import { Tv, Star, Heart, Bookmark } from "lucide-react";
import { posterUrl, type TVShow } from "@/lib/tmdb";
import { useUserData } from "@/context/UserDataContext";
import { useUI } from "@/context/UIContext";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import { getShowRatingIcon } from "@/lib/showRatingIcons";

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
  const { getShowData, toggleLike, toggleWatchlist } = useUserData();
  const { openAuthModal } = useUI();
  const { user } = useAuth();

  const showData = getShowData(show.id);
  const liked = showData?.liked ?? false;
  const watchlisted = showData?.watchlisted ?? false;

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
          "relative aspect-poster rounded-lg overflow-hidden bg-muted border border-border/50",
          "transition-all duration-300 ease-out",
          "group-hover:border-primary/60 group-hover:shadow-xl group-hover:shadow-black/40",
          "group-hover:-translate-y-1"
        )}
      >
        {/* Skeleton shimmer while loading */}
        {!imgLoaded && !imgError && (
          <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-muted to-secondary/50" />
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
            src={posterUrl(show.poster_path, "w342")}
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
    </Link>
  );
}

export const ShowPosterCard = memo(ShowPosterCardInner);
