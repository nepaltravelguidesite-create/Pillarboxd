import { useState } from "react";
import { Link } from "react-router-dom";
import { Heart, MessageCircle } from "lucide-react";
import { StarRating } from "@/components/shows/StarRating";
import { useSocial } from "@/context/SocialContext";
import { useAuth } from "@/context/AuthContext";
import { useUI } from "@/context/UIContext";

export interface ReviewWithAuthor {
  id: string;
  user_id: string;
  show_id: number;
  show_name: string;
  watched_date: string;
  rating: number | null;
  review: string;
  rewatch: boolean;
  contains_spoiler: boolean;
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
    <div className="bg-card border border-border rounded-lg p-4">
      {/* Header: avatar + author + date */}
      <div className="flex items-center gap-3">
        <Link to={`/profile/${review.author_username}`} className="shrink-0">
          {review.author_avatar_url ? (
            <img
              src={review.author_avatar_url}
              alt={review.author_display_name}
              className="size-9 rounded-full object-cover bg-muted"
            />
          ) : (
            <div className="size-9 rounded-full bg-primary/15 text-primary flex items-center justify-center text-xs font-bold">
              {initials(review.author_display_name || review.author_username)}
            </div>
          )}
        </Link>
        <div className="flex-1 min-w-0">
          <Link
            to={`/profile/${review.author_username}`}
            className="text-sm font-medium text-foreground hover:underline"
          >
            {review.author_display_name || review.author_username}
          </Link>
          <div className="text-xs text-muted-foreground">
            {formatDate(review.watched_date)}
            {review.rewatch && <span className="ml-2">· Rewatched</span>}
          </div>
        </div>
      </div>

      {/* Rating */}
      {review.rating != null && (
        <div className="mt-3">
          <StarRating value={review.rating} readOnly size="sm" />
        </div>
      )}

      {/* Review text (spoiler handling) */}
      {review.review && (
        <div className="relative mt-2">
          {review.contains_spoiler && !revealed ? (
            <div className="relative">
              <p className="text-sm text-foreground/80 leading-relaxed blur-sm select-none">
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
            <p className="text-sm text-foreground/80 leading-relaxed">
              {review.review}
            </p>
          )}
        </div>
      )}

      {/* Like + Comment row */}
      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border/40">
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
