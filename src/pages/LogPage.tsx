import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useUserData, type UserLog } from "@/context/UserDataContext";
import { useAuth } from "@/context/AuthContext";
import { useUI } from "@/context/UIContext";
import { posterUrl } from "@/lib/tmdb";
import { StarRating } from "@/components/shows/StarRating";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Calendar, Trash2, RotateCcw, Eye, Star } from "lucide-react";

// ---------------------------------------------------------------------------
// LogPage — /log route
// Personal diary timeline of the user's own user_logs, grouped by date,
// with inline delete (the "editable inline" affordance).
// ---------------------------------------------------------------------------

export default function LogPage() {
  const { user, authState } = useAuth();
  const { openAuthModal } = useUI();
  const { userLogs, deleteLog, loading } = useUserData();

  // -------------------------------------------------------------------------
  // Group logs by watched_date (YYYY-MM-DD), most recent date first.
  // Within a date, preserve the context's created_at desc ordering.
  // -------------------------------------------------------------------------
  const grouped = useMemo(() => {
    const map = new Map<string, UserLog[]>();
    for (const log of userLogs) {
      const list = map.get(log.watched_date) ?? [];
      list.push(log);
      map.set(log.watched_date, list);
    }
    return Array.from(map.entries()).sort(([a], [b]) =>
      a < b ? 1 : a > b ? -1 : 0
    );
  }, [userLogs]);

  // -------------------------------------------------------------------------
  // Loading state
  // -------------------------------------------------------------------------
  if (authState === "loading" || (user && loading && userLogs.length === 0)) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-sm text-muted-foreground">Loading your diary…</div>
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
            <Calendar className="size-7 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground tracking-tight">
              Sign in to view your diary
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Keep a personal timeline of everything you watch.
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
  if (userLogs.length === 0) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
          <LogHeader />
          <div className="mt-12 flex flex-col items-center justify-center text-center gap-3">
            <div className="size-14 rounded-full bg-secondary/40 flex items-center justify-center">
              <Calendar className="size-7 text-muted-foreground" />
            </div>
            <h2 className="text-base font-semibold text-foreground">
              Your diary is empty
            </h2>
            <p className="text-sm text-muted-foreground max-w-xs">
              Log a show from its profile page to start building your watch
              timeline.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Timeline
  // -------------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <LogHeader />

        <div className="mt-8 space-y-10">
          {grouped.map(([date, logs]) => (
            <section key={date}>
              <DateHeader dateStr={date} count={logs.length} />
              <div className="mt-3 space-y-3">
                {logs.map((log) => (
                  <LogEntry
                    key={log.id}
                    log={log}
                    onDelete={() => deleteLog(log.id)}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Header
// ---------------------------------------------------------------------------

function LogHeader() {
  return (
    <header>
      <h1 className="font-display text-3xl sm:text-4xl font-bold text-foreground">
        Diary
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        A timeline of everything you've watched, grouped by day.
      </p>
    </header>
  );
}

// ---------------------------------------------------------------------------
// Date header — chronological reverse order (most recent first)
// ---------------------------------------------------------------------------

function DateHeader({ dateStr, count }: { dateStr: string; count: number }) {
  const label = formatDateLabel(dateStr);
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-border pb-2">
      <h2 className="font-display text-lg font-semibold text-foreground">
        {label}
      </h2>
      <span className="text-xs text-muted-foreground tabular-nums">
        {count} {count === 1 ? "entry" : "entries"}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Single log entry — poster thumbnail, show name link, episodes/seasons,
// rewatch badge, rating stars, review text, delete button (inline edit).
// ---------------------------------------------------------------------------

function LogEntry({
  log,
  onDelete,
}: {
  log: UserLog;
  onDelete: () => void;
}) {
  return (
    <article className="flex gap-3 sm:gap-4 rounded-lg border border-border bg-secondary/20 p-3 sm:p-4">
      {/* Poster thumbnail */}
      <Link
        to={`/show/${log.show_id}`}
        className="shrink-0"
        aria-label={`Open ${log.show_name}`}
      >
        <img
          src={posterUrl(log.show_poster_path, "w185")}
          alt={log.show_name}
          loading="lazy"
          className="w-12 h-[72px] sm:w-14 sm:h-[84px] rounded object-cover bg-secondary/40"
        />
      </Link>

      {/* Body */}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link
              to={`/show/${log.show_id}`}
              className="font-semibold text-foreground hover:text-primary transition-colors line-clamp-1"
            >
              {log.show_name}
            </Link>

            {/* Watch stats */}
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              {log.seasons_watched > 0 && (
                <span className="inline-flex items-center gap-1">
                  <Calendar className="size-3" />
                  {log.seasons_watched}{" "}
                  {log.seasons_watched === 1 ? "season" : "seasons"}
                </span>
              )}
              {log.episodes_watched > 0 && (
                <span className="inline-flex items-center gap-1">
                  <Eye className="size-3" />
                  {log.episodes_watched}{" "}
                  {log.episodes_watched === 1 ? "episode" : "episodes"}
                </span>
              )}
              {log.rewatch && (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-primary font-medium">
                  <RotateCcw className="size-3" />
                  Rewatch
                </span>
              )}
            </div>
          </div>

          {/* Delete (inline edit affordance) */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button
                type="button"
                aria-label="Delete this diary entry"
                title="Delete entry"
                className="shrink-0 inline-flex items-center justify-center size-8 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              >
                <Trash2 className="size-4" />
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete log entry?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently remove this diary entry.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  variant="destructive"
                  onClick={onDelete}
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        {/* Rating */}
        {log.rating !== null && (
          <div className="mt-2 flex items-center gap-1.5">
            <Star className="size-3.5 text-primary" />
            <StarRating value={log.rating} readOnly size="sm" />
            <span className="text-xs text-muted-foreground tabular-nums">
              {log.rating.toFixed(1)}
            </span>
          </div>
        )}

        {/* Review */}
        {log.review && (
          <p className="mt-2 text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">
            {log.review}
          </p>
        )}
      </div>
    </article>
  );
}

// ---------------------------------------------------------------------------
// Date formatting — friendly label with weekday, keeps YYYY-MM-DD as fallback
// ---------------------------------------------------------------------------

function formatDateLabel(dateStr: string): string {
  // dateStr is YYYY-MM-DD; parse as local date to avoid TZ shifts
  const parts = dateStr.split("-").map(Number);
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) {
    return dateStr;
  }
  const d = new Date(parts[0], parts[1] - 1, parts[2]);
  if (Number.isNaN(d.getTime())) return dateStr;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.round(
    (today.getTime() - d.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays === -1) return "Tomorrow";

  return d.toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
