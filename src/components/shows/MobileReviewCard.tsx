import { useState } from "react";
import { Link } from "react-router-dom";
import { StarRating } from "@/components/shows/StarRating";
import { bestPosterUrl } from "@/lib/tmdb";
import { cn } from "@/lib/utils";
import { getShowRatingIcon } from "@/lib/showRatingIcons";
import { VibeTagBadge } from "@/components/shows/VibeTag";
import { TagChips } from "@/components/shows/TagChips";
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
    <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-4">
      {/* Header: avatar + author + show link */}
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <Link to={`/profile/${review.author_username}`} className="shrink-0">
          <div className="size-8 rounded-full bg-secondary border border-border/40 overflow-hidden">
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

        {/* Meta */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Link
              to={`/profile/${review.author_username}`}
              className="text-sm font-semibold text-foreground hover:text-primary transition-colors"
            >
              {review.author_display_name}
            </Link>
            <span className="text-xs text-muted-foreground">reviewed</span>
            <Link
              to={`/show/${review.show_id}`}
              className="text-sm font-semibold text-foreground hover:text-primary transition-colors truncate"
            >
              {review.show_name}
              {year && <span className="text-muted-foreground font-normal ml-1">{year}</span>}
            </Link>
          </div>
          {/* Rating + vibe tag */}
          <div className="flex items-center gap-2 mt-1">
            <StarRating value={review.rating} readOnly size="sm" icon={ratingIcon} />
            {review.vibe_tag && <VibeTagBadge value={review.vibe_tag} />}
          </div>
        </div>

        {/* Poster */}
        <Link to={`/show/${review.show_id}`} className="shrink-0">
          <div className="w-10 rounded-lg overflow-hidden bg-secondary/40" style={{ aspectRatio: "2/3" }}>
            <img
              src={bestPosterUrl({ id: review.show_id, poster_path: review.show_poster_path }, "w92")}
              alt={review.show_name}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          </div>
        </Link>
      </div>

      {/* Personal tags */}
      {review.tags && review.tags.length > 0 && (
        <div className="mt-2">
          <TagChips tags={review.tags} size="xs" />
        </div>
      )}

      {/* Review text */}
      {review.review && (
        <div className="mt-3">
          <p
            className={cn(
              "text-sm text-foreground/80 leading-relaxed",
              !expanded && "line-clamp-3"
            )}
          >
            {review.review}
          </p>
          {review.review.length > 150 && !expanded && (
            <button
              onClick={() => setExpanded(true)}
              className="text-xs text-primary hover:underline mt-1"
            >
              Read more
            </button>
          )}
        </div>
      )}
    </div>
  );
}
