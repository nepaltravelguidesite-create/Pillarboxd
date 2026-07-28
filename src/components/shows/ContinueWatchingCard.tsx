import { useState, useEffect, memo } from "react";
import { Link } from "react-router-dom";
import { Play, Tv, ChevronRight, Check, CheckCircle2, CalendarClock, Loader2 } from "lucide-react";
import { bestPosterUrl, backdropUrl, getShowDetail, getShowSeason, type TVShow, type TVShowDetail, type Episode } from "@/lib/tmdb";
import { useSocial } from "@/context/SocialContext";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

interface ShowDetailWithNext extends TVShowDetail {
  next_episode_to_air?: Episode | null;
  last_episode_to_air?: Episode | null;
}

interface ContinueWatchingCardProps {
  show: TVShow;
  backdropPath?: string | null;
  className?: string;
}

interface NextEpisodeInfo {
  season: number;
  episode: number;
  name: string;
  runtime: number | null;
}

function formatDaysUntilAir(airDate: string): string {
  const date = new Date(airDate + "T00:00:00");
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const diff = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diff <= 0) return "airs today";
  if (diff === 1) return "airs tomorrow";
  return `airs in ${diff} days`;
}

function ContinueWatchingCardInner({ show, backdropPath, className }: ContinueWatchingCardProps) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [nextEpisode, setNextEpisode] = useState<NextEpisodeInfo | null>(null);
  const [caughtUp, setCaughtUp] = useState(false);
  const [nextAirDate, setNextAirDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);

  const { userEpisodes, toggleEpisode, getShowProgress } = useSocial();
  const { user } = useAuth();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        const detail = (await getShowDetail(show.id, [])) as ShowDetailWithNext;
        if (cancelled || !detail.seasons) return;

        const realSeasons = detail.seasons.filter((s) => s.season_number > 0);
        const progress = getShowProgress(show.id, realSeasons);

        // Find which season the user is currently on
        let foundNext: NextEpisodeInfo | null = null;
        let isCaughtUp = false;

        for (const season of realSeasons.sort((a, b) => a.season_number - b.season_number)) {
          const seasonProgress = progress.perSeason.get(season.season_number);
          const watchedInSeason = seasonProgress?.watched ?? 0;

          if (watchedInSeason < season.episode_count) {
            // User has unwatched episodes in this season — find the first one
            try {
              const seasonDetail = await getShowSeason(show.id, season.season_number);
              if (cancelled) return;

              const watchedEpNumbers = new Set(
                userEpisodes
                  .filter((e) => e.show_id === show.id && e.season_number === season.season_number)
                  .map((e) => e.episode_number)
              );

              const now = new Date();
              const firstUnwatched = seasonDetail.episodes?.find(
                (e) =>
                  !watchedEpNumbers.has(e.episode_number) &&
                  e.air_date &&
                  new Date(e.air_date + "T00:00:00") <= now
              );

              if (firstUnwatched) {
                foundNext = {
                  season: firstUnwatched.season_number,
                  episode: firstUnwatched.episode_number,
                  name: firstUnwatched.name,
                  runtime: (firstUnwatched.runtime || detail.episode_run_time?.[0]) ?? null,
                };
              } else {
                // All aired episodes in this season are watched
                isCaughtUp = true;
              }
            } catch {
              // Season data unavailable
            }
            break;
          }
        }

        if (!foundNext) {
          isCaughtUp = true;
        }

        // Check for next episode to air
        const nextToAir = detail.next_episode_to_air;
        if (nextToAir?.air_date) {
          setNextAirDate(nextToAir.air_date);
        } else {
          setNextAirDate(null);
        }

        if (cancelled) return;
        setNextEpisode(foundNext);
        setCaughtUp(isCaughtUp);
        setLoading(false);
      } catch {
        if (!cancelled) {
          setNextEpisode(null);
          setCaughtUp(false);
          setLoading(false);
        }
      }
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show.id, userEpisodes.length]);

  const handleMarkWatched = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!nextEpisode || !user || marking) return;

    setMarking(true);
    try {
      await toggleEpisode(
        show,
        nextEpisode.season,
        nextEpisode.episode,
        nextEpisode.name,
        nextEpisode.runtime
      );
    } finally {
      setMarking(false);
    }
  };

  const imgSrc = backdropPath
    ? backdropUrl(backdropPath, "w300")
    : bestPosterUrl(show, "w342");

  return (
    <Link
      to={`/show/${show.id}`}
      className={cn(
        "group block shrink-0 w-64 sm:w-72 rounded-xl overflow-hidden",
        "border border-border/40 bg-card",
        "transition-all duration-300 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-0.5",
        "focus:outline-none focus:ring-2 focus:ring-ring/40",
        className
      )}
    >
      <div className="relative h-32 sm:h-36 overflow-hidden bg-muted">
        {!imgLoaded && !imgError && <div className="absolute inset-0 animate-pulse bg-secondary/40" />}
        {imgError ? (
          <div className="absolute inset-0 flex items-center justify-center bg-secondary/30">
            <Tv className="size-8 text-muted-foreground/40" strokeWidth={1.5} />
          </div>
        ) : (
          <img
            src={imgSrc}
            alt={`${show.name}`}
            loading="lazy"
            onLoad={() => setImgLoaded(true)}
            onError={() => setImgError(true)}
            className={cn(
              "absolute inset-0 w-full h-full object-cover",
              "transition-all duration-500 group-hover:scale-105",
              imgLoaded ? "opacity-100" : "opacity-0"
            )}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <div className="flex items-center justify-center size-10 rounded-full bg-primary text-primary-foreground shadow-lg">
            <Play className="size-4 ml-0.5" fill="currentColor" />
          </div>
        </div>
        <div className="absolute bottom-2 left-3 right-3">
          <p className="text-sm font-bold text-white truncate leading-tight">{show.name}</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 px-3 py-2.5">
          <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
          <p className="text-xs text-muted-foreground">Finding next episode…</p>
        </div>
      ) : caughtUp ? (
        <div className="px-3 py-2.5 space-y-1">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="size-4 text-emerald-500 dark:text-emerald-400 shrink-0" />
            <p className="text-xs font-medium text-foreground">You're all caught up</p>
          </div>
          {nextAirDate && (
            <p className="text-[11px] text-muted-foreground flex items-center gap-1 pl-5">
              <CalendarClock className="size-3" />
              Next episode {formatDaysUntilAir(nextAirDate)}
            </p>
          )}
        </div>
      ) : nextEpisode ? (
        <div className="space-y-1.5 px-3 py-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground truncate">
              Up next: <span className="text-foreground font-medium">S{nextEpisode.season}E{nextEpisode.episode}</span>
            </p>
            <ChevronRight className="size-4 text-muted-foreground shrink-0 group-hover:text-primary transition-colors" />
          </div>
          <p className="text-xs text-muted-foreground truncate">{nextEpisode.name}</p>
          {user && (
            <button
              type="button"
              onClick={handleMarkWatched}
              disabled={marking}
              className={cn(
                "w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg",
                "text-xs font-medium transition-colors",
                "bg-secondary text-secondary-foreground hover:bg-primary hover:text-primary-foreground",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              {marking ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Check className="size-3.5" />
              )}
              Mark S{nextEpisode.season}E{nextEpisode.episode} Watched
            </button>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-between gap-2 px-3 py-2">
          <p className="text-xs text-muted-foreground truncate">{show.name}</p>
          <ChevronRight className="size-4 text-muted-foreground shrink-0 group-hover:text-primary transition-colors" />
        </div>
      )}
    </Link>
  );
}

export const ContinueWatchingCard = memo(ContinueWatchingCardInner);
