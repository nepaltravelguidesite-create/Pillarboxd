import { useMemo, useState } from "react";
import { MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSocial } from "@/context/SocialContext";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ReviewCard } from "@/components/shows/ReviewCard";
import { useShowReviews } from "@/hooks/useShowReviews";

interface ReviewFeedProps {
  showId: number;
  className?: string;
}

type SortTab = "newest" | "liked" | "friends";

const PAGE_SIZE = 5;

export function ReviewFeed({ showId, className }: ReviewFeedProps) {
  const { following } = useSocial();
  const { reviews, loading } = useShowReviews(showId);
  const [tab, setTab] = useState<SortTab>("newest");
  const [page, setPage] = useState(1);

  // Only show reviews that have actual review text
  const reviewsWithText = useMemo(
    () => reviews.filter((r) => r.review && r.review.trim()),
    [reviews]
  );

  const sortedReviews = useMemo(() => {
    let list = [...reviewsWithText];
    if (tab === "liked") {
      list.sort((a, b) => b.like_count - a.like_count || b.created_at.localeCompare(a.created_at));
    } else if (tab === "friends") {
      list = list.filter((r) => following.has(r.user_id));
    } else {
      list.sort((a, b) => b.created_at.localeCompare(a.created_at));
    }
    return list;
  }, [reviewsWithText, tab, following]);

  const visibleReviews = sortedReviews.slice(0, page * PAGE_SIZE);
  const hasMore = visibleReviews.length < sortedReviews.length;

  const tabs: { key: SortTab; label: string }[] = [
    { key: "newest", label: "Newest" },
    { key: "liked", label: "Most Liked" },
    { key: "friends", label: "Friends Only" },
  ];

  return (
    <div className={cn("w-full max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-6", className)}>
      {/* Sort tabs */}
      <div className="flex items-center gap-3 mb-2">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`pb-1 text-xs font-medium transition-colors ${
              tab === t.key
                ? "text-foreground border-b border-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Loading skeleton */}
      {loading ? (
        <div className="divide-y divide-border/30">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="py-5">
              <div className="flex items-center gap-2.5">
                <Skeleton className="size-8 rounded-full" />
                <Skeleton className="h-3.5 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
              <div className="mt-3 space-y-2">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-4/5" />
              </div>
              <div className="mt-4 flex gap-5">
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-4 w-12" />
              </div>
            </div>
          ))}
        </div>
      ) : sortedReviews.length === 0 ? (
        <EmptyState
          icon={MessageCircle}
          title="No reviews yet"
          description="Be the first to share your thoughts on this show."
        />
      ) : (
        <>
          <div className="divide-y divide-border/30">
            {visibleReviews.map((review) => (
              <ReviewCard
                key={review.id}
                review={review}
                onExpand={(r) => {
                  window.dispatchEvent(
                    new CustomEvent("open-comment-thread", { detail: r })
                  );
                }}
              />
            ))}
          </div>
          {hasMore && (
            <div className="flex justify-center mt-6">
              <button
                type="button"
                onClick={() => setPage((p) => p + 1)}
                className="px-4 py-2 rounded-md bg-secondary text-foreground text-sm font-medium hover:bg-secondary/80 transition-colors"
              >
                Load More
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
