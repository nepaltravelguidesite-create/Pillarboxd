import { useEffect, useState } from "react";
import { Loader2, Calendar, Clock } from "lucide-react";
import { useSocial } from "@/context/SocialContext";
import { useUserData } from "@/context/UserDataContext";
import { getShowDetail, bestPosterUrl, type TVShowDetail, type Episode } from "@/lib/tmdb";

// TVShowDetail doesn't declare next_episode_to_air, but TMDB returns it by default.
interface ShowDetailWithNext extends TVShowDetail {
  next_episode_to_air?: Episode | null;
  last_episode_to_air?: Episode | null;
}

interface UpcomingEpisode {
  showId: number;
  showName: string;
  posterPath: string | null;
  episode: Episode;
}

function formatAirDate(airDate: string): string {
  const date = new Date(airDate + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (date.getTime() === today.getTime()) return "Today";
  if (date.getTime() === tomorrow.getTime()) return "Tomorrow";

  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function isWithinNext7Days(airDate: string): boolean {
  const date = new Date(airDate + "T00:00:00");
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const sevenDaysOut = new Date(now);
  sevenDaysOut.setDate(sevenDaysOut.getDate() + 7);
  return date >= now && date <= sevenDaysOut;
}

export function UpcomingEpisodes() {
  const { userEpisodes } = useSocial();
  const { userShows } = useUserData();

  const [upcoming, setUpcoming] = useState<UpcomingEpisode[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    // Tracked shows = shows the user has watched at least one episode of
    // UNION watchlisted shows.
    const episodeShowIds = new Set(userEpisodes.map((e) => e.show_id));
    const watchlistShowIds = new Set(
      userShows.filter((s) => s.watchlisted).map((s) => s.show_id)
    );
    const trackedShowIds = new Set([...episodeShowIds, ...watchlistShowIds]);

    if (trackedShowIds.size === 0) {
      setUpcoming([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    (async () => {
      try {
        const details = await Promise.all(
          Array.from(trackedShowIds).map((id) => getShowDetail(id))
        );

        if (cancelled) return;

        const upcomingEpisodes: UpcomingEpisode[] = [];

        for (const detail of details as ShowDetailWithNext[]) {
          const nextEp = detail.next_episode_to_air;
          if (nextEp && nextEp.air_date && isWithinNext7Days(nextEp.air_date)) {
            upcomingEpisodes.push({
              showId: detail.id,
              showName: detail.name,
              posterPath: detail.poster_path,
              episode: nextEp,
            });
          }
        }

        // Sort by air date ascending (soonest first)
        upcomingEpisodes.sort(
          (a, b) =>
            new Date(a.episode.air_date).getTime() -
            new Date(b.episode.air_date).getTime()
        );

        if (!cancelled) {
          setUpcoming(upcomingEpisodes);
          setLoading(false);
        }
      } catch (err) {
        console.error("[UpcomingEpisodes] Failed to load:", err);
        if (!cancelled) {
          setUpcoming([]);
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userEpisodes, userShows]);

  return (
    <section className="w-full" aria-label="Coming Up This Week">
      <div className="px-4 sm:px-6 lg:px-8 max-w-screen-xl mx-auto mb-3">
        <h2 className="font-display text-base sm:text-lg font-bold text-foreground tracking-tight flex items-center gap-2">
          <Calendar className="size-5 text-primary" />
          Coming Up This Week
        </h2>
      </div>

      <div className="px-4 sm:px-6 lg:px-8 max-w-screen-xl mx-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : upcoming.length === 0 ? (
          <div className="rounded-lg border border-border bg-card p-8 flex flex-col items-center justify-center text-center">
            <div className="flex items-center justify-center size-12 rounded-full bg-muted text-muted-foreground mb-3">
              <Calendar className="size-5" />
            </div>
            <p className="font-display text-foreground font-semibold">
              Nothing airing this week
            </p>
            <p className="text-sm text-muted-foreground mt-1 max-w-xs">
              Check back later or add more shows to your watchlist to see
              upcoming episodes here.
            </p>
          </div>
        ) : (
          <div className="rounded-lg border border-border bg-card divide-y divide-border overflow-hidden">
            {upcoming.map(({ showId, showName, posterPath, episode }) => (
              <div
                key={`${showId}-${episode.season_number}-${episode.episode_number}`}
                className="flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors"
              >
                <img
                  src={bestPosterUrl({ id: showId, poster_path: posterPath }, "w92")}
                  alt={showName}
                  className="size-10 rounded object-cover bg-muted shrink-0"
                  loading="lazy"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">
                    {showName}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {episode.name || `Episode ${episode.episode_number}`}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs font-medium text-muted-foreground tabular-nums">
                    S{episode.season_number}E{episode.episode_number}
                  </span>
                  <div className="flex items-center gap-1.5 text-xs font-medium text-primary">
                    <Clock className="size-3.5" />
                    {formatAirDate(episode.air_date)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
