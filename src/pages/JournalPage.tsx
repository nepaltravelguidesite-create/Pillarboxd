import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useUserData } from "@/context/UserDataContext";
import { useSocial, type UserEpisode } from "@/context/SocialContext";
import { useAuth } from "@/context/AuthContext";
import { useUI } from "@/context/UIContext";
import { posterUrl } from "@/lib/tmdb";
import { Calendar, Check, Star, Heart, Activity } from "lucide-react";

// ---------------------------------------------------------------------------
// JournalPage — /journal route
// Unified activity feed of the user's recent actions: diary logs, episode
// watches, ratings, and likes. Sorted by created_at / watched_at descending.
// ---------------------------------------------------------------------------

type ActivityKind = "log" | "episode" | "rating" | "like";

interface ActivityItem {
  id: string;
  kind: ActivityKind;
  timestamp: string; // ISO string used for sorting
  showId: number;
  showName: string;
  posterPath: string | null;
  description: string;
}

export default function JournalPage() {
  const { user, authState } = useAuth();
  const { openAuthModal } = useUI();
  const { userLogs } = useUserData();
  const { userEpisodes } = useSocial();

  // -------------------------------------------------------------------------
  // Build a unified, sorted activity feed.
  // -------------------------------------------------------------------------
  const activities = useMemo<ActivityItem[]>(() => {
    const logs: ActivityItem[] = userLogs.map((l) => ({
      id: `log-${l.id}`,
      kind: "log" as const,
      timestamp: l.created_at,
      showId: l.show_id,
      showName: l.show_name,
      posterPath: l.show_poster_path,
      description: buildLogDescription(l),
    }));

    const episodes: ActivityItem[] = userEpisodes.map((e: UserEpisode) => ({
      id: `ep-${e.id}`,
      kind: "episode" as const,
      timestamp: e.watched_at,
      showId: e.show_id,
      showName: e.show_name,
      posterPath: e.show_poster_path,
      description: buildEpisodeDescription(e),
    }));

    return [...logs, ...episodes].sort((a, b) =>
      a.timestamp < b.timestamp ? 1 : a.timestamp > b.timestamp ? -1 : 0
    );
  }, [userLogs, userEpisodes]);

  // -------------------------------------------------------------------------
  // Loading state
  // -------------------------------------------------------------------------
  if (authState === "loading") {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-sm text-muted-foreground">Loading your journal…</div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Not signed in — prompt
  // -------------------------------------------------------------------------
  if (!user) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-4">
        <div className="flex flex-col items-center gap-4 max-w-sm text-center">
          <div className="size-14 rounded-full bg-primary/10 flex items-center justify-center">
            <Activity className="size-7 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground tracking-tight">
              Sign in to view your journal
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              See a unified feed of your recent watches, ratings, and likes.
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
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Empty state
  // -------------------------------------------------------------------------
  if (activities.length === 0) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
          <JournalHeader />
          <div className="mt-12 flex flex-col items-center justify-center text-center gap-3">
            <div className="size-14 rounded-full bg-secondary/40 flex items-center justify-center">
              <Activity className="size-7 text-muted-foreground" />
            </div>
            <h2 className="text-base font-semibold text-foreground">
              No activity yet
            </h2>
            <p className="text-sm text-muted-foreground max-w-xs">
              Watch episodes, log shows, and rate titles to populate your
              journal.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Feed
  // -------------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <JournalHeader />

        <ol className="mt-8 space-y-3">
          {activities.map((item) => (
            <ActivityRow key={item.id} item={item} />
          ))}
        </ol>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Header
// ---------------------------------------------------------------------------

function JournalHeader() {
  return (
    <header>
      <h1 className="font-display text-3xl sm:text-4xl font-bold text-foreground">
        Journal
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Your recent activity — diary entries, episodes watched, ratings, and
        likes.
      </p>
    </header>
  );
}

// ---------------------------------------------------------------------------
// Activity row — icon + description + timestamp, with poster thumbnail
// ---------------------------------------------------------------------------

function ActivityRow({ item }: { item: ActivityItem }) {
  const Icon = ICON_FOR_KIND[item.kind];
  const iconClass = ICON_CLASS_FOR_KIND[item.kind];

  return (
    <li className="flex items-center gap-3 rounded-lg border border-border bg-secondary/20 p-3 sm:p-4">
      {/* Icon badge */}
      <div
        className={`shrink-0 inline-flex items-center justify-center size-9 rounded-full ${iconClass}`}
      >
        <Icon className="size-4" />
      </div>

      {/* Poster thumbnail */}
      <Link
        to={`/show/${item.showId}`}
        className="shrink-0"
        aria-label={`Open ${item.showName}`}
      >
        <img
          src={posterUrl(item.posterPath, "w92")}
          alt={item.showName}
          loading="lazy"
          className="w-9 h-[54px] rounded object-cover bg-secondary/40"
        />
      </Link>

      {/* Description + timestamp */}
      <div className="min-w-0 flex-1">
        <p className="text-sm text-foreground/90 leading-snug">
          {item.description}
        </p>
        <time
          dateTime={item.timestamp}
          className="mt-0.5 block text-xs text-muted-foreground"
        >
          {formatRelative(item.timestamp)}
        </time>
      </div>
    </li>
  );
}

// ---------------------------------------------------------------------------
// Icon + color mapping per activity kind
// ---------------------------------------------------------------------------

const ICON_FOR_KIND: Record<ActivityKind, typeof Calendar> = {
  log: Calendar,
  episode: Check,
  rating: Star,
  like: Heart,
};

const ICON_CLASS_FOR_KIND: Record<ActivityKind, string> = {
  log: "bg-primary/10 text-primary",
  episode: "bg-emerald-500/10 text-emerald-500",
  rating: "bg-amber-500/10 text-amber-500",
  like: "bg-rose-500/10 text-rose-500",
};

// ---------------------------------------------------------------------------
// Description builders
// ---------------------------------------------------------------------------

function buildLogDescription(log: {
  seasons_watched: number;
  episodes_watched: number;
  rewatch: boolean;
  show_name: string;
}): string {
  const parts: string[] = [];
  if (log.seasons_watched > 0) {
    parts.push(
      `${log.seasons_watched} ${log.seasons_watched === 1 ? "season" : "seasons"}`
    );
  }
  if (log.episodes_watched > 0) {
    parts.push(
      `${log.episodes_watched} ${log.episodes_watched === 1 ? "episode" : "episodes"}`
    );
  }
  const watched = parts.length > 0 ? parts.join(" + ") : "a session";
  const prefix = log.rewatch ? `Rewatched ${watched} of` : `Watched ${watched} of`;
  return `${prefix} ${log.show_name}`;
}

function buildEpisodeDescription(ep: {
  season_number: number;
  episode_number: number;
  episode_name: string | null;
  rewatch: boolean;
  show_name: string;
}): string {
  const epLabel = `S${ep.season_number}E${ep.episode_number}`;
  const name = ep.episode_name ? ` “${ep.episode_name}”` : "";
  const verb = ep.rewatch ? "Rewatched" : "Watched";
  return `${verb} ${epLabel}${name} of ${ep.show_name}`;
}

// ---------------------------------------------------------------------------
// Relative timestamp formatter
// ---------------------------------------------------------------------------

function formatRelative(iso: string): string {
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return "";
  const diffMs = Date.now() - then.getTime();
  const sec = Math.round(diffMs / 1000);
  const min = Math.round(sec / 60);
  const hr = Math.round(min / 60);
  const day = Math.round(hr / 24);

  if (sec < 60) return "just now";
  if (min < 60) return `${min} ${min === 1 ? "minute" : "minutes"} ago`;
  if (hr < 24) return `${hr} ${hr === 1 ? "hour" : "hours"} ago`;
  if (day < 7) return `${day} ${day === 1 ? "day" : "days"} ago`;
  if (day < 365) {
    return then.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  }
  return then.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
