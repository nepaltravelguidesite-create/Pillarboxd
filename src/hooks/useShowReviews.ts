import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { ReviewWithAuthor } from "@/components/shows/ReviewCard";

type LogRow = {
  id: string;
  user_id: string;
  show_id: number;
  show_name: string;
  show_poster_path: string | null;
  show_backdrop_path: string | null;
  show_first_air_date: string | null;
  watched_date: string | null;
  rating: number | null;
  review: string | null;
  rewatch: boolean;
  contains_spoiler: boolean;
  vibe_tag: string | null;
  season_number: number | null;
  created_at: string;
};

type ProfileRow = {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
};

export function useShowReviews(showId: number | null) {
  const [reviews, setReviews] = useState<ReviewWithAuthor[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!showId) {
      setReviews([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data: logs } = await supabase
        .from("user_logs")
        .select("*")
        .eq("show_id", showId)
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

      const allMerged: ReviewWithAuthor[] = typedLogs.map((l) => {
        const profile = profileMap.get(l.user_id);
        return {
          id: l.id,
          user_id: l.user_id,
          show_id: l.show_id,
          show_name: l.show_name,
          show_poster_path: l.show_poster_path,
          show_first_air_date: l.show_first_air_date,
          watched_date: l.watched_date ?? "",
          rating: l.rating == null ? null : Number(l.rating),
          review: l.review ?? "",
          rewatch: l.rewatch,
          contains_spoiler: l.contains_spoiler,
          vibe_tag: l.vibe_tag,
          season_number: l.season_number,
          created_at: l.created_at,
          author_username: profile?.username ?? "unknown",
          author_display_name: profile?.display_name ?? profile?.username ?? "Unknown",
          author_avatar_url: profile?.avatar_url ?? null,
          like_count: likeCounts.get(l.id) ?? 0,
          comment_count: commentCounts.get(l.id) ?? 0,
        };
      });

      // Only one review per user per show: keep the most recent log (highest created_at)
      const seenUserIds = new Set<string>();
      const deduped = allMerged.filter((r) => {
        if (seenUserIds.has(r.user_id)) return false;
        seenUserIds.add(r.user_id);
        return true;
      });

      setReviews(deduped);
    } finally {
      setLoading(false);
    }
  }, [showId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { reviews, loading, refetch };
}
