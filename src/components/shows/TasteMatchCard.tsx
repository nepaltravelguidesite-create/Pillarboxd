import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { bestPosterUrl, type TVShow } from "@/lib/tmdb";
import { StarRating } from "@/components/shows/StarRating";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface TasteMatchCardProps {
  profileUserId: string;
  profileDisplayName: string;
}

interface CommonRating {
  show_id: number;
  show_name: string;
  show_poster_path: string | null;
  my_rating: number;
  their_rating: number;
}

export function TasteMatchCard({ profileUserId, profileDisplayName }: TasteMatchCardProps) {
  const { user } = useAuth();
  const [data, setData] = useState<{
    common: CommonRating[];
    matchPct: number;
    closeCount: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || user.id === profileUserId) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      // Fetch my ratings
      const { data: myLogs } = await supabase
        .from("user_logs")
        .select("show_id, show_name, show_poster_path, rating")
        .eq("user_id", user.id)
        .not("rating", "is", null);

      // Fetch their ratings
      const { data: theirLogs } = await supabase
        .from("user_logs")
        .select("show_id, show_name, show_poster_path, rating")
        .eq("user_id", profileUserId)
        .not("rating", "is", null);

      if (cancelled || !myLogs || !theirLogs) {
        setLoading(false);
        return;
      }

      // Build a map of my ratings by show_id (take the highest rating per show)
      const myMap = new Map<number, { rating: number; name: string; poster: string | null }>();
      for (const log of myLogs) {
        const r = log.rating as number;
        const existing = myMap.get(log.show_id);
        if (!existing || r > existing.rating) {
          myMap.set(log.show_id, { rating: r, name: log.show_name, poster: log.show_poster_path });
        }
      }

      // Build a map of their ratings by show_id (take the highest)
      const theirMap = new Map<number, { rating: number; name: string; poster: string | null }>();
      for (const log of theirLogs) {
        const r = log.rating as number;
        const existing = theirMap.get(log.show_id);
        if (!existing || r > existing.rating) {
          theirMap.set(log.show_id, { rating: r, name: log.show_name, poster: log.show_poster_path });
        }
      }

      // Find common shows
      const common: CommonRating[] = [];
      for (const [showId, mine] of myMap) {
        const theirs = theirMap.get(showId);
        if (theirs) {
          common.push({
            show_id: showId,
            show_name: mine.name,
            show_poster_path: mine.poster,
            my_rating: mine.rating,
            their_rating: theirs.rating,
          });
        }
      }

      if (common.length === 0) {
        if (!cancelled) setLoading(false);
        return;
      }

      // Compute compatibility: percentage where both ratings are within 1 star
      let closeCount = 0;
      let totalDiff = 0;
      for (const c of common) {
        const diff = Math.abs(c.my_rating - c.their_rating);
        if (diff <= 1) closeCount++;
        totalDiff += diff;
      }
      const matchPct = Math.round((closeCount / common.length) * 100);

      // Sort by highest combined rating for display
      common.sort((a, b) => (b.my_rating + b.their_rating) - (a.my_rating + a.their_rating));

      if (!cancelled) {
        setData({ common, matchPct, closeCount });
        setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [user, profileUserId]);

  if (loading || !data || data.common.length === 0) return null;

  const topShows = data.common.slice(0, 3);
  const matchColor = data.matchPct >= 75 ? "text-primary" : data.matchPct >= 50 ? "text-foreground" : "text-muted-foreground";

  return (
    <div className="rounded-xl border border-border/50 bg-card p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles className="size-4 text-primary" />
        <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">Taste Match</h2>
      </div>

      <div className="flex items-baseline gap-2">
        <span className={cn("font-display text-3xl font-bold", matchColor)}>
          {data.matchPct}%
        </span>
        <span className="text-sm text-muted-foreground">
          match with {profileDisplayName}
        </span>
      </div>

      <p className="text-sm text-muted-foreground">
        You and {profileDisplayName} have{" "}
        <span className="text-foreground font-medium">{data.common.length}</span>{" "}
        show{data.common.length === 1 ? "" : "s"} in common — your ratings are within 1 star on{" "}
        <span className="text-foreground font-medium">{data.closeCount}</span> of them.
      </p>

      {/* Top commonly rated shows */}
      <div className="flex gap-3">
        {topShows.map((show) => {
          const tvShow: TVShow = {
            id: show.show_id,
            name: show.show_name,
            original_name: show.show_name,
            overview: "",
            poster_path: show.show_poster_path,
            backdrop_path: null,
            first_air_date: "",
            vote_average: 0,
            vote_count: 0,
            popularity: 0,
            genre_ids: [],
            origin_country: [],
            original_language: "",
          };
          return (
            <div key={show.show_id} className="w-16 shrink-0 space-y-1">
              <div className="aspect-poster rounded-md overflow-hidden bg-muted border border-border/30">
                {show.show_poster_path ? (
                  <img
                    src={bestPosterUrl(tvShow, "w185")}
                    alt={show.show_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full" />
                )}
              </div>
              <p className="text-[10px] text-muted-foreground truncate">{show.show_name}</p>
              <div className="flex items-center gap-0.5">
                <span className="text-[9px] text-primary/70">You</span>
                <StarRating value={show.my_rating} readOnly size="sm" />
              </div>
              <div className="flex items-center gap-0.5">
                <span className="text-[9px] text-muted-foreground">Them</span>
                <StarRating value={show.their_rating} readOnly size="sm" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
