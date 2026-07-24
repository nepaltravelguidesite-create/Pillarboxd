import { useState } from "react";
import { Link } from "react-router-dom";
import { Heart, MessageCircle } from "lucide-react";
import { StarRating } from "@/components/shows/StarRating";
import { getShowRatingIcon } from "@/lib/showRatingIcons";
import { VibeTagBadge } from "@/components/shows/VibeTag";
import { useSocial } from "@/context/SocialContext";
import { useAuth } from "@/context/AuthContext";
import { useUI } from "@/context/UIContext";

export interface ReviewWithAuthor {
  id: string;
  user_id: string;
  show_id: number;
  show_name: string;
  show_poster_path?: string | null;
  show_first_air_date?: string | null;
  watched_date: string;
  rating: number | null;
  review: string;
  rewatch: boolean;
  contains_spoiler: boolean;
  vibe_tag?: string | null;
  season_number?: number | null;
  created_at: string;
  author_username: string;
  author_display_name: string;
  author_avatar_url: string | null;
  like_count: number;
  comment_count: number;
}

interface ReviewCardProps {
  review: ReviewWithAuthor;
  onExpand?: (review: ReviewWithAuthor) => void;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function ReviewCard({ review, onExpand }: ReviewCardProps) {
  const { isReviewLiked, toggleReviewLike } = useSocial();
  const { user } = useAuth();
  const { openAuthModal } = useUI();
  const [revealed, setRevealed] = useState(false);

  const liked = isReviewLiked(review.id);

  const handleLike = async () => {
    if (!user) {
      openAuthModal("signin");
      return;
    }
    await toggleReviewLike(review.id);
  };

  const handleComment = () => {
    onExpand?.(review);
  };

  return (
    <div className="py-5 border-b border-border/30 last:border-b-0">
      {/* Header: avatar + author + date */}
      <div className="flex items-center gap-2.5">
        <Link to={`/profile/${review.author_username}`} className="shrink-0">
          {review.author_avatar_url ? (
            <img
              src={review.author_avatar_url}
              alt={review.author_display_name}
              className="size-8 rounded-full object-cover bg-muted"
            />
          ) : (
            <div className="size-8 rounded-full bg-primary/15 text-primary flex items-center justify-center text-xs font-bold">
              {initials(review.author_display_name || review.author_username)}
            </div>
          )}
        </Link>
        <Link
          to={`/profile/${review.author_username}`}
          className="text-sm font-medium text-foreground hover:underline"
        >
          {review.author_display_name || review.author_username}
        </Link>
        <span className="text-muted-foreground/40 text-xs">·</span>
        <span className="text-xs text-muted-foreground">
          {formatDate(review.watched_date)}
          {review.rewatch && <span className="ml-1.5">Rewatched</span>}
        </span>
      </div>

      {/* Rating + vibe tag */}
      {review.rating != null && (
        <div className="mt-3 flex items-center gap-2">
          <StarRating
            value={review.rating}
            readOnly
            size="sm"
            icon={getShowRatingIcon(review.show_id)}
          />
          {review.vibe_tag && <VibeTagBadge value={review.vibe_tag} />}
        </div>
      )}
      {review.rating == null && review.vibe_tag && (
        <div className="mt-3">
          <VibeTagBadge value={review.vibe_tag} />
        </div>
      )}

      {/* Review text (spoiler handling) */}
      {review.review && (
        <div className="relative mt-3">
          {review.contains_spoiler && !revealed ? (
            <div className="relative">
              <p className="text-sm text-foreground/80 leading-7 blur-sm select-none">
                {review.review}
              </p>
              <div className="absolute inset-0 flex items-center justify-center">
                <button
                  type="button"
                  onClick={() => setRevealed(true)}
                  className="bg-background/80 backdrop-blur-sm border border-border rounded px-3 py-1.5 text-xs font-medium text-foreground hover:bg-background transition-colors"
                >
                  Show spoiler
                </button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-foreground/80 leading-7">
              {review.review}
            </p>
          )}
        </div>
      )}

      {/* Like + Comment row */}
      <div className="flex items-center gap-5 mt-4">
        <button
          type="button"
          onClick={handleLike}
          className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          aria-pressed={liked}
        >
          <Heart
            className={`size-4 ${liked ? "fill-primary text-primary" : ""}`}
          />
          <span>{review.like_count}</span>
        </button>
        <button
          type="button"
          onClick={handleComment}
          className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <MessageCircle className="size-4" />
          <span>{review.comment_count}</span>
        </button>
      </div>
    </div>
  );
}
