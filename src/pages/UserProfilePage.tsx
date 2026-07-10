import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useUserData, type UserLog } from "@/context/UserDataContext";
import { useSocial } from "@/context/SocialContext";
import { useUI } from "@/context/UIContext";
import { posterUrl } from "@/lib/tmdb";
import { cn } from "@/lib/utils";
import {
  Heart,
  Bookmark,
  Star,
  Calendar,
  Eye,
  RotateCcw,
  Tv,
  LogIn,
  Trash2,
  Play,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Diary Row
// ---------------------------------------------------------------------------

function DiaryRow({ log }: { log: UserLog }) {
  const { deleteLog } = useUserData();
  const [imgError, setImgError] = useState(false);

  const date = new Date(log.watched_date);
  const month = date.toLocaleString("en", { month: "short" });
  const day = date.getDate();
  const year = date.getFullYear();

  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-border/40 hover:bg-secondary/20 transition-colors px-2 -mx-2 rounded">
      {/* Date */}
      <div className="shrink-0 w-12 text-center">
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
          {month}
        </div>
        <div className="text-lg font-bold text-foreground leading-tight">{day}</div>
        <div className="text-[10px] text-muted-foreground">{year}</div>
      </div>

      {/* Poster */}
      <Link
        to={`/show/${log.show_id}`}
        className="shrink-0 w-10 h-15 rounded overflow-hidden bg-muted border border-border/50"
        style={{ aspectRatio: "2/3" }}
      >
        {log.show_poster_path && !imgError ? (
          <img
            src={posterUrl(log.show_poster_path, "w92")}
            alt={log.show_name}
            loading="lazy"
            onError={() => setImgError(true)}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-secondary/30">
            <Tv className="size-4 text-muted-foreground/30" strokeWidth={1} />
          </div>
        )}
      </Link>

      {/* Show info */}
      <div className="flex-1 min-w-0">
        <Link
          to={`/show/${log.show_id}`}
          className="text-sm font-medium text-foreground hover:text-primary transition-colors truncate block"
        >
          {log.show_name}
        </Link>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
          {log.episodes_watched > 0 && (
            <span className="text-[11px] text-muted-foreground">
              {log.episodes_watched} ep{log.episodes_watched !== 1 ? "s" : ""}
            </span>
          )}
          {log.seasons_watched > 0 && (
            <span className="text-[11px] text-muted-foreground">
              · {log.seasons_watched} season{log.seasons_watched !== 1 ? "s" : ""}
            </span>
          )}
          {log.rewatch && (
            <span className="flex items-center gap-0.5 text-[11px] text-accent">
              · <RotateCcw className="size-2.5" /> Rewatch
            </span>
          )}
        </div>
        {log.review && (
          <p className="text-xs text-muted-foreground/70 line-clamp-1 mt-0.5">
            {log.review}
          </p>
        )}
      </div>

      {/* Rating */}
      {log.rating !== null && (
        <div className="shrink-0 hidden sm:flex items-center gap-1">
          <Star className="size-3 text-primary fill-primary" />
          <span className="text-xs font-medium text-foreground">
            {log.rating.toFixed(1)}
          </span>
        </div>
      )}

      {/* Delete */}
      <button
        type="button"
        onClick={() => deleteLog(log.id)}
        aria-label="Delete log entry"
        className="shrink-0 flex items-center justify-center size-7 rounded text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 transition-colors"
      >
        <Trash2 className="size-3.5" />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Watchlist Grid
// ---------------------------------------------------------------------------

interface WatchlistCardProps {
  show: {
    show_id: number;
    show_name: string;
    show_poster_path: string | null;
    show_first_air_date: string | null;
    rating: number | null;
    liked: boolean;
    watchlisted: boolean;
  };
}

function WatchlistCard({ show }: WatchlistCardProps) {
  const [imgError, setImgError] = useState(false);
  const year = show.show_first_air_date
    ? show.show_first_air_date.slice(0, 4)
    : "";

  return (
    <Link
      to={`/show/${show.show_id}`}
      className="group block shrink-0 w-28 sm:w-32 focus:outline-none focus:ring-2 focus:ring-primary/40 rounded"
    >
      <div className="relative aspect-poster rounded overflow-hidden bg-muted border border-border/50 group-hover:border-primary/50 transition-colors">
        {show.show_poster_path && !imgError ? (
          <img
            src={posterUrl(show.show_poster_path, "w342")}
            alt={show.show_name}
            loading="lazy"
            onError={() => setImgError(true)}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 bg-secondary/30">
            <Tv className="size-6 text-muted-foreground/30" strokeWidth={1} />
            <span className="text-[10px] text-muted-foreground/50 text-center px-1.5 line-clamp-2">
              {show.show_name}
            </span>
          </div>
        )}

        {/* Hover overlay badges */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-center gap-2">
          {show.rating !== null && (
            <div className="flex items-center gap-1 bg-black/60 rounded px-1.5 py-0.5">
              <Star className="size-3 text-primary fill-primary" />
              <span className="text-xs font-bold text-foreground">
                {show.rating.toFixed(1)}
              </span>
            </div>
          )}
          {show.liked && (
            <div className="flex items-center gap-1 bg-black/60 rounded px-1.5 py-0.5">
              <Heart className="size-3 text-primary fill-primary" />
              <span className="text-[10px] font-medium text-foreground">Liked</span>
            </div>
          )}
          <span className="text-[10px] uppercase tracking-widest font-bold text-primary">
            View
          </span>
        </div>
      </div>

      <div className="mt-1.5 px-0.5">
        <p className="text-xs font-medium text-foreground truncate group-hover:text-primary transition-colors leading-tight">
          {show.show_name}
        </p>
        {year && (
          <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
            {year}
          </p>
        )}
      </div>
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Stat Card
// ---------------------------------------------------------------------------

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: typeof Heart;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1 px-3 py-3 rounded border border-border/50 bg-card/50">
      <Icon className={cn("size-5", color)} />
      <span className="text-lg font-bold text-foreground leading-tight">
        {value}
      </span>
      <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main UserProfilePage
// ---------------------------------------------------------------------------

export function UserProfilePage() {
  const { user } = useAuth();
  const { userShows, userLogs, loading } = useUserData();
  const { userEpisodes } = useSocial();
  const { openAuthModal } = useUI();
  const [activeTab, setActiveTab] = useState<"diary" | "watchlist" | "likes">(
    "diary"
  );

  // Compute stats
  const stats = useMemo(() => {
    const ratedShows = userShows.filter((s) => s.rating !== null);
    const likedShows = userShows.filter((s) => s.liked);
    const watchlistShows = userShows.filter((s) => s.watchlisted);
    const totalEpisodes = userLogs.reduce(
      (sum, log) => sum + (log.episodes_watched || 0),
      0
    );
    return {
      rated: ratedShows.length,
      liked: likedShows.length,
      watchlist: watchlistShows.length,
      logs: userLogs.length,
      episodes: totalEpisodes,
    };
  }, [userShows, userLogs]);

  const watchlistShows = useMemo(
    () => userShows.filter((s) => s.watchlisted),
    [userShows]
  );

  const likedShows = useMemo(
    () => userShows.filter((s) => s.liked),
    [userShows]
  );

  // Continue Watching: shows with watched episodes, find next unwatched
  const continueWatching = useMemo(() => {
    const showMap = new Map<number, { showId: number; showName: string; posterPath: string | null; watched: number }>();
    for (const ep of userEpisodes) {
      const existing = showMap.get(ep.show_id);
      if (existing) {
        existing.watched++;
      } else {
        showMap.set(ep.show_id, {
          showId: ep.show_id,
          showName: ep.show_name,
          posterPath: ep.show_poster_path,
          watched: 1,
        });
      }
    }
    return Array.from(showMap.values()).slice(0, 6);
  }, [userEpisodes]);

  // Not signed in
  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4">
        <div className="flex items-center justify-center size-16 rounded-full bg-secondary/30">
          <LogIn className="size-7 text-muted-foreground" />
        </div>
        <div className="text-center">
          <h1 className="text-lg font-bold text-foreground tracking-tight">
            Sign in to view your profile
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track shows, rate, and keep a diary of everything you watch.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => openAuthModal("signin")}
            className="h-9 px-4 flex items-center rounded bg-primary text-primary-foreground font-bold text-xs uppercase tracking-widest hover:bg-primary/90 transition-colors"
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => openAuthModal("signup")}
            className="h-9 px-4 flex items-center rounded border border-border text-foreground/70 hover:text-foreground hover:border-foreground/30 font-medium text-xs uppercase tracking-widest transition-colors"
          >
            Create Account
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="size-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Profile header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-8">
        <div className="flex items-center gap-4">
          {/* Avatar */}
          <div className="size-16 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center shrink-0">
            <span className="text-xl font-bold text-primary uppercase">
              {user.displayName.charAt(0)}
            </span>
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
              {user.displayName}
            </h1>
            <p className="text-sm text-muted-foreground">@{user.username}</p>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 sm:gap-3 mb-8">
        <StatCard
          icon={Calendar}
          label="Logs"
          value={stats.logs}
          color="text-accent"
        />
        <StatCard
          icon={Star}
          label="Rated"
          value={stats.rated}
          color="text-primary"
        />
        <StatCard
          icon={Heart}
          label="Liked"
          value={stats.liked}
          color="text-primary"
        />
        <StatCard
          icon={Bookmark}
          label="Watchlist"
          value={stats.watchlist}
          color="text-accent"
        />
        <StatCard
          icon={Eye}
          label="Episodes"
          value={stats.episodes}
          color="text-primary"
        />
      </div>

      {/* Continue Watching */}
      {continueWatching.length > 0 && (
        <div className="mb-8">
          <h2 className="text-base font-display font-bold text-foreground tracking-tight mb-3 flex items-center gap-2">
            <Play className="size-4 text-primary fill-primary" />
            Continue Watching
          </h2>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {continueWatching.map((item) => (
              <Link
                key={item.showId}
                to={`/show/${item.showId}`}
                className="group block shrink-0"
              >
                <div className="relative aspect-poster rounded-lg overflow-hidden bg-muted border border-border/50 group-hover:border-primary/50 transition-colors">
                  {item.posterPath ? (
                    <img
                      src={posterUrl(item.posterPath, "w342")}
                      alt={item.showName}
                      loading="lazy"
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-secondary/30">
                      <Tv className="size-6 text-muted-foreground/30" strokeWidth={1} />
                    </div>
                  )}
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-1.5">
                    <p className="text-[10px] text-primary font-semibold">
                      {item.watched} ep{item.watched !== 1 ? "s" : ""} watched
                    </p>
                  </div>
                </div>
                <p className="text-xs font-medium text-foreground truncate mt-1 group-hover:text-primary transition-colors">
                  {item.showName}
                </p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-border mb-4">
        {(
          [
            { key: "diary", label: "Diary", count: userLogs.length },
            { key: "watchlist", label: "Watchlist", count: watchlistShows.length },
            { key: "likes", label: "Likes", count: likedShows.length },
          ] as const
        ).map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold uppercase tracking-widest",
              "border-b-2 transition-colors duration-150 -mb-px",
              activeTab === tab.key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
            <span className="text-[10px] text-muted-foreground/70">
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      {/* Diary */}
      {activeTab === "diary" && (
        <div>
          {userLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Calendar className="size-8 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">
                No diary entries yet. Log a show to start your diary.
              </p>
              <Link
                to="/"
                className="text-xs text-accent hover:underline"
              >
                Browse shows
              </Link>
            </div>
          ) : (
            <div className="space-y-0">
              {userLogs.map((log) => (
                <DiaryRow key={log.id} log={log} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Watchlist */}
      {activeTab === "watchlist" && (
        <div>
          {watchlistShows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Bookmark className="size-8 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">
                Your watchlist is empty. Add shows you want to watch.
              </p>
              <Link to="/" className="text-xs text-accent hover:underline">
                Browse shows
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-3 sm:gap-4">
              {watchlistShows.map((show) => (
                <WatchlistCard key={show.id} show={show} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Likes */}
      {activeTab === "likes" && (
        <div>
          {likedShows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Heart className="size-8 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">
                No liked shows yet. Like a show to see it here.
              </p>
              <Link to="/" className="text-xs text-accent hover:underline">
                Browse shows
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-3 sm:gap-4">
              {likedShows.map((show) => (
                <WatchlistCard key={show.id} show={show} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
