import { useCallback, useEffect, useMemo, useState } from "react";
import { MessageCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useSocial } from "@/context/SocialContext";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ReviewCard, type ReviewWithAuthor } from "@/components/shows/ReviewCard";

interface ReviewFeedProps {
  showId: number;
}

type SortTab = "newest" | "liked" | "friends";

const PAGE_SIZE = 5;

type LogRow = {
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
};

type ProfileRow = {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
};

export function ReviewFeed({ showId }: ReviewFeedProps) {
  const { following } = useSocial();
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState<ReviewWithAuthor[]>([]);
  const [tab, setTab] = useState<SortTab>("newest");
  const [page, setPage] = useState(1);

  const loadReviews = useCallback(async () => {
    setLoading(true);
    try {
      const { data: logs } = await supabase
        .from("user_logs")
        .select("*")
        .eq("show_id", showId)
        .not("review", "is", null)
        .neq("review", "")
        .order("created_at", { ascending: false })
        .limit(50);

      if (!logs || logs.length === 0) {
        setReviews([]);
        return;
      }

      const typedLogs = logs as LogRow[];

      const userIds = [...new Set(typedLogs.map((l) => l.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("*")
        .in("id", userIds);

      const profileMap = new Map<string, ProfileRow>();
      (profiles ?? []).forEach((p) => {
        const row = p as ProfileRow;
        profileMap.set(row.id, row);
      });

      const logIds = typedLogs.map((l) => l.id);
      const { data: likes } = await supabase
        .from("review_likes")
        .select("log_id")
        .in("log_id", logIds);

      const likeCounts = new Map<string, number>();
      (likes ?? []).forEach((l) => {
        const id = (l as { log_id: string }).log_id;
        likeCounts.set(id, (likeCounts.get(id) ?? 0) + 1);
      });

      const { data: comments } = await supabase
        .from("comments")
        .select("log_id")
        .in("log_id", logIds);

      const commentCounts = new Map<string, number>();
      (comments ?? []).forEach((c) => {
        const id = (c as { log_id: string }).log_id;
        commentCounts.set(id, (commentCounts.get(id) ?? 0) + 1);
      });

      const merged: ReviewWithAuthor[] = typedLogs.map((l) => {
        const profile = profileMap.get(l.user_id);
        return {
          id: l.id,
          user_id: l.user_id,
          show_id: l.show_id,
          show_name: l.show_name,
          watched_date: l.watched_date,
          rating: l.rating == null ? null : Number(l.rating),
          review: l.review,
          rewatch: l.rewatch,
          contains_spoiler: l.contains_spoiler,
          created_at: l.created_at,
          author_username: profile?.username ?? "unknown",
          author_display_name: profile?.display_name ?? profile?.username ?? "Unknown",
          author_avatar_url: profile?.avatar_url ?? null,
          like_count: likeCounts.get(l.id) ?? 0,
          comment_count: commentCounts.get(l.id) ?? 0,
        };
      });

      setReviews(merged);
    } finally {
      setLoading(false);
    }
  }, [showId]);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  useEffect(() => {
    setPage(1);
  }, [tab]);

  const sortedReviews = useMemo(() => {
    let list = [...reviews];
    if (tab === "liked") {
      list.sort((a, b) => b.like_count - a.like_count || b.created_at.localeCompare(a.created_at));
    } else if (tab === "friends") {
      list = list.filter((r) => following.has(r.user_id));
    } else {
      list.sort((a, b) => b.created_at.localeCompare(a.created_at));
    }
    return list;
  }, [reviews, tab, following]);

  const visibleReviews = sortedReviews.slice(0, page * PAGE_SIZE);
  const hasMore = visibleReviews.length < sortedReviews.length;

  const tabs: { key: SortTab; label: string }[] = [
    { key: "newest", label: "Newest" },
    { key: "liked", label: "Most Liked" },
    { key: "friends", label: "Friends Only" },
  ];

  return (
    <div className="w-full max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
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
