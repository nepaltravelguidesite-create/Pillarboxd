import { useState } from "react";
import { Link } from "react-router-dom";
import { StarRating } from "@/components/shows/StarRating";
import { posterUrl } from "@/lib/tmdb";
import { cn } from "@/lib/utils";
import { getShowRatingIcon } from "@/lib/showRatingIcons";
import { VibeTagBadge } from "@/components/shows/VibeTag";
import type { ReviewWithAuthor } from "@/components/shows/ReviewCard";

interface MobileReviewCardProps {
  review: ReviewWithAuthor;
}

export function MobileReviewCard({ review }: MobileReviewCardProps) {
  const [expanded, setExpanded] = useState(false);
  const ratingIcon = getShowRatingIcon(review.show_id);
  const year = review.show_first_air_date
    ? new Date(review.show_first_air_date).getFullYear()
    : "";

  return (
    <div className="flex gap-3 rounded-xl border border-border/50 bg-card p-3 shadow-sm shadow-black/20">
      {/* Left: avatar + name */}
      <div className="shrink-0">
        <Link to={`/profile/${review.author_username}`}>
          <div className="size-9 rounded-full bg-secondary border border-border/40 overflow-hidden">
            {review.author_avatar_url ? (
              <img
                src={review.author_avatar_url}
                alt={review.author_display_name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex items-center justify-center h-full text-xs font-semibold text-muted-foreground">
                {review.author_display_name?.charAt(0).toUpperCase() ?? "?"}
              </div>
            )}
          </div>
        </Link>
      </div>

      {/* Middle: content */}
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-1.5">
          <Link
            to={`/profile/${review.author_username}`}
            className="text-xs font-semibold text-foreground hover:text-accent transition-colors truncate"
          >
            {review.author_display_name}
          </Link>
          <span className="text-xs text-muted-foreground shrink-0">rated</span>
        </div>

        <Link
          to={`/show/${review.show_id}`}
          className="block text-sm font-medium text-foreground hover:text-accent transition-colors"
        >
          {review.show_name}
          {year && <span className="text-muted-foreground ml-1.5">{year}</span>}
        </Link>

        <div className="flex items-center gap-2">
          <StarRating
            value={review.rating}
            readOnly
            size="sm"
            icon={ratingIcon}
          />
          {review.vibe_tag && <VibeTagBadge value={review.vibe_tag} />}
        </div>

        {review.review && (
          <div className="pt-0.5">
            <p
              className={cn(
                "text-xs text-foreground/80 leading-relaxed",
                !expanded && "line-clamp-3"
              )}
            >
              {review.review}
            </p>
            {review.review.length > 150 && !expanded && (
              <button
                onClick={() => setExpanded(true)}
                className="text-xs text-accent hover:underline mt-0.5"
              >
                Read more
              </button>
            )}
          </div>
        )}
      </div>

      {/* Right: poster thumbnail */}
      <Link to={`/show/${review.show_id}`} className="shrink-0">
        <div className="w-12 h-18 rounded-md overflow-hidden bg-secondary/40">
          <img
            src={posterUrl(review.show_poster_path, "w92")}
            alt={review.show_name}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        </div>
      </Link>
    </div>
  );
}
