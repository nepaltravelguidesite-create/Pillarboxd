import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useSocial } from "@/context/SocialContext";
import { useUserData } from "@/context/UserDataContext";
import { useTrendingShows } from "@/hooks/use-tmdb";
import { type TVShow } from "@/lib/tmdb";
import { ShowPosterCard } from "@/components/shows/ShowPosterCard";
import { ContinueWatchingCard } from "@/components/shows/ContinueWatchingCard";
import { MobileListCard } from "@/components/shows/MobileListCard";
import { MobileReviewCard } from "@/components/shows/MobileReviewCard";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { ReviewWithAuthor } from "@/components/shows/ReviewCard";

type LogRow = {
  id: string;
  user_id: string;
  show_id: number;
  show_name: string;
  show_poster_path: string | null;
  show_first_air_date: string | null;
  watched_date: string;
  rating: number | null;
  review: string;
  rewatch: boolean;
  contains_spoiler: boolean;
  vibe_tag: string | null;
  created_at: string;
};

type ProfileRow = {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
};

type ListRow = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  is_public: boolean;
  is_editorial: boolean;
  like_count: number;
  item_count: number;
  created_at: string;
  updated_at: string;
};

type ListItemRow = {
  show_poster_path: string | null;
};

export function HomePage() {
  const { user } = useAuth();
  const { following, isListLiked } = useSocial();
  const { userShows } = useUserData();
  const { data: trending } = useTrendingShows("week");

  const watchingShows = user
    ? userShows
        .filter((s) => s.status === "watching")
        .slice(0, 10)
    : [];

  const [reviews, setReviews] = useState<ReviewWithAuthor[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [lists, setLists] = useState<ListRow[]>([]);
  const [listItems, setListItems] = useState<Record<string, (string | null)[]>>({});
  const [listCurators, setListCurators] = useState<Record<string, ProfileRow>>({});
  const [listsLoading, setListsLoading] = useState(true);

  // Fetch friends' reviews
  const loadReviews = useCallback(async () => {
    setReviewsLoading(true);
    try {
      const { data: logs } = await supabase
        .from("user_logs")
        .select("*")
        .not("review", "is", null)
        .neq("review", "")
        .order("created_at", { ascending: false })
        .limit(20);

      if (!logs || logs.length === 0) {
        setReviews([]);
        return;
      }

      const typedLogs = logs as LogRow[];

      // Filter to friends + own
      const visibleLogs = typedLogs.filter(
        (l) => following.has(l.user_id) || l.user_id === user?.id
      );

      if (visibleLogs.length === 0) {
        setReviews([]);
        return;
      }

      const userIds = [...new Set(visibleLogs.map((l) => l.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("*")
        .in("id", userIds);

      const profileMap = new Map<string, ProfileRow>();
      (profiles ?? []).forEach((p) => {
        profileMap.set(p.id, p as ProfileRow);
      });

      const logIds = visibleLogs.map((l) => l.id);
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

      const merged: ReviewWithAuthor[] = visibleLogs.map((l) => {
        const profile = profileMap.get(l.user_id);
        return {
          id: l.id,
          user_id: l.user_id,
          show_id: l.show_id,
          show_name: l.show_name,
          show_poster_path: l.show_poster_path,
          show_first_air_date: l.show_first_air_date,
          watched_date: l.watched_date,
          rating: l.rating == null ? null : Number(l.rating),
          review: l.review,
          rewatch: l.rewatch,
          contains_spoiler: l.contains_spoiler,
          vibe_tag: l.vibe_tag,
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
      setReviewsLoading(false);
    }
  }, [following, user?.id]);

  // Fetch popular lists
  const loadLists = useCallback(async () => {
    setListsLoading(true);
    try {
      const { data: listData } = await supabase
        .from("lists")
        .select("*")
        .eq("is_public", true)
        .order("like_count", { ascending: false })
        .limit(10);

      if (!listData || listData.length === 0) {
        setLists([]);
        return;
      }

      const typedLists = listData as ListRow[];
      setLists(typedLists);

      // Fetch curator profiles
      const userIds = [...new Set(typedLists.map((l) => l.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("*")
        .in("id", userIds);

      const profileMap: Record<string, ProfileRow> = {};
      (profiles ?? []).forEach((p) => {
        const row = p as ProfileRow;
        profileMap[row.id] = row;
      });
      setListCurators(profileMap);

      // Fetch first 3 poster paths for each list
      const itemsPromises = typedLists.map(async (list) => {
        const { data: items } = await supabase
          .from("list_items")
          .select("show_poster_path")
          .eq("list_id", list.id)
          .order("position", { ascending: true })
          .limit(3);

        const paths = (items ?? []).map(
          (item) => (item as ListItemRow).show_poster_path
        );
        return { listId: list.id, paths };
      });

      const results = await Promise.all(itemsPromises);
      const itemsMap: Record<string, (string | null)[]> = {};
      results.forEach((r) => {
        itemsMap[r.listId] = r.paths;
      });
      setListItems(itemsMap);
    } finally {
      setListsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  useEffect(() => {
    loadLists();
  }, [loadLists]);

  const firstName = user?.displayName?.split(" ")[0] ?? "there";

  return (
    <div className="w-full max-w-screen-lg mx-auto px-4 py-4 space-y-6 md:px-6 md:py-8 md:space-y-8">
      {/* Header row */}
      <div className="flex items-start justify-between">
        <div className="space-y-0.5">
          {user ? (
            <>
              <h1 className="font-display text-xl font-bold text-foreground tracking-tight">
                Hello, {firstName}!
              </h1>
              <p className="text-xs text-muted-foreground">
                What are you watching today?
              </p>
            </>
          ) : (
            <>
              <h1 className="font-display text-xl font-bold text-foreground tracking-tight">
                Welcome to Aftershow
              </h1>
              <p className="text-xs text-muted-foreground">
                Track, rate, and discuss every show you've ever watched.
              </p>
            </>
          )}
        </div>
        {user && (
          <div className="flex items-center gap-2">
            <div className="relative">
              <Avatar className="size-9 border border-border/40">
                <AvatarImage src={user?.avatarUrl} alt={user?.displayName} />
                <AvatarFallback className="bg-secondary text-foreground text-xs font-semibold">
                  {user?.displayName?.charAt(0).toUpperCase() ?? "?"}
                </AvatarFallback>
              </Avatar>
              {/* Online status dot */}
              <span className="absolute bottom-0 right-0 size-2.5 rounded-full bg-status-watched border-2 border-nav" />
            </div>
          </div>
        )}
      </div>

      {/* Continue Watching — only for logged-in users with shows in progress */}
      {user && watchingShows.length > 0 && (
        <section className="space-y-3">
          <SectionHeader title="Continue Watching" />
          <HorizontalScrollRow>
            {watchingShows.map((s) => (
              <ContinueWatchingCard
                key={s.id}
                show={{
                  id: s.show_id,
                  name: s.show_name,
                  poster_path: s.show_poster_path,
                  backdrop_path: s.show_backdrop_path,
                  first_air_date: s.show_first_air_date ?? "",
                  vote_average: 0,
                  vote_count: 0,
                  popularity: 0,
                  genre_ids: [],
                  original_name: s.show_name,
                  origin_country: [],
                  original_language: "",
                  overview: "",
                } as TVShow}
                backdropPath={s.show_backdrop_path}
                className="shrink-0"
              />
            ))}
          </HorizontalScrollRow>
        </section>
      )}

      {/* Popular This Month — horizontal scroll-snap row */}
      <section className="space-y-3">
        <SectionHeader title="Popular This Month" />
        <HorizontalScrollRow>
          {(trending?.results ?? []).slice(0, 10).map((show: TVShow) => (
            <ShowPosterCard
              key={show.id}
              show={show}
              size="sm"
              showRating={false}
              className="shrink-0"
            />
          ))}
          {trending === undefined && (
            <ScrollSkeletonRow count={6} />
          )}
        </HorizontalScrollRow>
      </section>

      {/* Popular Lists This Month */}
      <section className="space-y-3">
        <SectionHeader title="Popular Lists This Month" />
        {listsLoading ? (
          <HorizontalScrollRow>
            <ScrollSkeletonRow count={3} cardWidth="w-44" />
          </HorizontalScrollRow>
        ) : lists.length === 0 ? (
          <p className="text-sm text-muted-foreground px-1">No lists yet.</p>
        ) : (
          <HorizontalScrollRow>
            {lists.slice(0, 6).map((list) => {
              const curator = listCurators[list.user_id];
              return (
                <MobileListCard
                  key={list.id}
                  list={list}
                  curatorName={curator?.display_name ?? curator?.username ?? "Unknown"}
                  curatorAvatarUrl={curator?.avatar_url}
                  posterPaths={listItems[list.id] ?? []}
                  isLiked={isListLiked(list.id)}
                  className="shrink-0"
                />
              );
            })}
          </HorizontalScrollRow>
        )}
      </section>

      {/* Recent Friends' Reviews */}
      <section className="space-y-3">
        <SectionHeader title="Recent Friends' Reviews" />
        {reviewsLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-card rounded-2xl border border-border/50 p-4">
                <div className="flex items-start gap-3">
                  <Skeleton className="size-8 rounded-full shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3 w-40" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="w-10 rounded-lg shrink-0" style={{ aspectRatio: '2/3' }} />
                </div>
                <Skeleton className="h-3 w-full mt-3" />
                <Skeleton className="h-3 w-3/4 mt-1.5" />
              </div>
            ))}
          </div>
        ) : reviews.length === 0 ? (
          <div className="rounded-2xl border border-border/50 bg-card p-6 text-center space-y-2">
            <p className="text-sm font-medium text-foreground">No reviews from friends yet</p>
            <p className="text-xs text-muted-foreground">Follow other members to see their reviews and ratings here.</p>
            <a href="/members" className="inline-flex mt-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20 transition-colors">Discover Members</a>
          </div>
        ) : (
          <div className="space-y-3">
            {reviews.slice(0, 5).map((review) => (
              <MobileReviewCard
                key={review.id}
                review={review}
              />
            ))}
          </div>
        )}
      </section>

    </div>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">
        {title}
      </h2>
    </div>
  );
}

function HorizontalScrollRow({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0"
      style={{
        scrollSnapType: "x mandatory",
        scrollbarWidth: "none",
        msOverflowStyle: "none",
      }}
    >
      <style>{`div::-webkit-scrollbar { display: none; }`}</style>
      {children}
    </div>
  );
}

function ScrollSkeletonRow({ count, cardWidth = "w-24" }: { count: number; cardWidth?: string }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={cn("shrink-0", cardWidth)}>
          <Skeleton className={cn("aspect-poster w-full rounded-lg", cardWidth)} />
          <Skeleton className="h-3 w-3/4 mt-2" />
        </div>
      ))}
    </>
  );
}
