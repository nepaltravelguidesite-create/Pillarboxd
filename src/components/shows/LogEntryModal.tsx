import { useState, useEffect } from "react";
import { useUserData, type UserLog } from "@/context/UserDataContext";
import { type TVShow } from "@/lib/tmdb";
import { cn } from "@/lib/utils";
import { StarRating } from "@/components/shows/StarRating";
import { getShowRatingIcon } from "@/lib/showRatingIcons";
import { Loader2, Calendar, X, Star } from "lucide-react";
import { toast } from "sonner";

type Season = {
  id: number;
  name: string;
  season_number: number;
  episode_count: number;
  poster_path: string | null;
  air_date: string;
  overview: string;
};

interface LogEntryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  show: TVShow;
  seasons?: Season[];
  initialRating?: number | null;
  initialSeasonNumber?: number | null;
  existingLog?: UserLog | null;
  showLogs?: UserLog[];
  onSuccess?: () => void;
}

export function LogEntryModal({
  open,
  onOpenChange,
  show,
  seasons = [],
  initialRating = null,
  initialSeasonNumber = null,
  existingLog = null,
  showLogs = [],
  onSuccess,
}: LogEntryModalProps) {
  const { addLog, updateLog } = useUserData();

  const isEditMode = !!existingLog;

  const [watchedDate, setWatchedDate] = useState<string | null>(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [rating, setRating] = useState<number | null>(null);
  const [review, setReview] = useState("");
  const [containsSpoilers, setContainsSpoilers] = useState(false);
  const [rewatch, setRewatch] = useState(false);
  const [seasonNumber, setSeasonNumber] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const ratingIcon = getShowRatingIcon(show.id);

  // Only show real seasons (skip season 0 specials)
  const realSeasons = seasons.filter((s) => s.season_number > 0);

  useEffect(() => {
    if (open) {
      if (existingLog) {
        setWatchedDate(existingLog.watched_date ?? null);
        setRating(existingLog.rating);
        setReview(existingLog.review ?? "");
        setContainsSpoilers(existingLog.contains_spoiler);
        setRewatch(existingLog.rewatch);
        setSeasonNumber(existingLog.season_number);
      } else {
        setWatchedDate(new Date().toISOString().slice(0, 10));
        setRating(initialRating);
        setReview("");
        setContainsSpoilers(false);
        setRewatch(false);
        setSeasonNumber(initialSeasonNumber);
      }
      setSubmitting(false);
    }
  }, [open, show.id, initialRating, initialSeasonNumber, existingLog]);

  function handleScopeChange(seasonNum: number | null) {
    setSeasonNumber(seasonNum);
    const existing = showLogs.find(
      (l) => l.show_id === show.id && l.season_number === seasonNum
    );
    if (existing) {
      setWatchedDate(existing.watched_date ?? null);
      setRating(existing.rating);
      setReview(existing.review ?? "");
      setContainsSpoilers(existing.contains_spoiler);
      setRewatch(existing.rewatch);
    } else {
      setWatchedDate(new Date().toISOString().slice(0, 10));
      setRating(seasonNum === null ? initialRating : null);
      setReview("");
      setContainsSpoilers(false);
      setRewatch(false);
    }
  }

  if (!open) return null;

  const headerText = isEditMode ? "Edit Your Review" : "Write a Review";
  const submitText = isEditMode ? "Save Changes" : "Publish";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (rating === null) return;
    setSubmitting(true);
    try {
      const payload = {
        show_id: show.id,
        show_name: show.name,
        show_poster_path: show.poster_path,
        show_backdrop_path: show.backdrop_path,
        show_first_air_date: show.first_air_date,
        watched_date: watchedDate,
        seasons_watched: 0,
        episodes_watched: 1,
        review: review.trim() || null,
        rewatch,
        rating,
        contains_spoiler: containsSpoilers,
        season_number: seasonNumber,
      };

      if (isEditMode && existingLog) {
        await updateLog(existingLog.id, payload);
        toast.success("Review updated!");
      } else {
        await addLog(payload);
        toast.success("Review published!");
      }
      onSuccess?.();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save review");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />

      {/* Modal — bottom sheet on mobile, centered on desktop */}
      <div
        className={cn(
          "relative w-full sm:max-w-md bg-card border border-border/60 rounded-t-2xl sm:rounded-2xl shadow-xl shadow-black/40",
          "max-h-[90vh] overflow-y-auto"
        )}
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        {/* Drag handle (mobile only) */}
        <div className="sm:hidden flex justify-center pt-2 pb-1">
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>

        {/* Compact header: show title + close button in one line */}
        <div className="px-5 pt-2 pb-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <h2 className="font-display text-base font-bold text-foreground shrink-0">
              {headerText}
            </h2>
            <span className="text-xs text-muted-foreground truncate">{show.name}</span>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 pb-5 space-y-3">
          {/* Season scope selector */}
          {realSeasons.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Scope
              </label>
              <div className="flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
                <ScopePill
                  active={seasonNumber === null}
                  onClick={() => handleScopeChange(null)}
                  label="Overall Show"
                  rating={showLogs.find((l) => l.show_id === show.id && l.season_number === null)?.rating ?? null}
                />
                {realSeasons.map((s) => {
                  const seasonLog = showLogs.find(
                    (l) => l.show_id === show.id && l.season_number === s.season_number && l.rating != null
                  );
                  return (
                    <ScopePill
                      key={s.id}
                      active={seasonNumber === s.season_number}
                      onClick={() => handleScopeChange(s.season_number)}
                      label={s.name}
                      rating={seasonLog?.rating ?? null}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* Star rating — primary, near top */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Rating
            </label>
            <div className="flex items-center justify-center py-2.5 rounded-md border border-border/40 bg-background/20">
              <StarRating
                value={rating}
                onChange={setRating}
                size="lg"
                icon={ratingIcon}
              />
            </div>
          </div>

          {/* Review text — primary, near top */}
          <div className="space-y-1.5">
            <label htmlFor="log-review" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Review
            </label>
            <textarea
              id="log-review"
              value={review}
              onChange={(e) => setReview(e.target.value)}
              rows={3}
              placeholder="Share your thoughts..."
              className={cn(
                "w-full rounded-md border border-input bg-background/40",
                "px-3 py-2.5 text-sm text-foreground",
                "placeholder:text-muted-foreground resize-none",
                "focus:outline-none focus:border-ring focus:ring-2 focus:ring-ring/40",
                "transition-colors"
              )}
            />
          </div>

          {/* Secondary controls below the fold */}
          {/* Date watched — optional */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between">
              <label htmlFor="log-date" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Date Watched
              </label>
              {watchedDate && (
                <button
                  type="button"
                  onClick={() => setWatchedDate(null)}
                  className="text-xs text-muted-foreground/70 hover:text-foreground transition-colors"
                >
                  I don't remember
                </button>
              )}
            </div>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
              <input
                id="log-date"
                type="date"
                value={watchedDate ?? ""}
                onChange={(e) => setWatchedDate(e.target.value || null)}
                className={cn(
                  "h-11 w-full rounded-md border border-input bg-background/40",
                  "pl-10 pr-3 text-sm text-foreground",
                  "focus:outline-none focus:border-ring focus:ring-2 focus:ring-ring/40",
                  "transition-colors"
                )}
              />
            </div>
          </div>

          {/* Rewatch toggle */}
          <label className="flex items-center gap-2.5 cursor-pointer pt-1">
            <button
              type="button"
              role="switch"
              aria-checked={rewatch}
              onClick={() => setRewatch(!rewatch)}
              className={cn(
                "relative h-5 w-9 rounded-full transition-colors",
                rewatch ? "bg-primary" : "bg-secondary"
              )}
            >
              <span className={cn(
                "absolute top-0.5 left-0.5 size-4 rounded-full bg-white transition-transform",
                rewatch && "translate-x-4"
              )} />
            </button>
            <span className="text-sm text-foreground">Rewatch</span>
          </label>

          {/* Spoiler checkbox — only if review has text */}
          {review.trim() && (
            <label className="flex items-center gap-2.5 cursor-pointer">
              <button
                type="button"
                role="checkbox"
                aria-checked={containsSpoilers}
                onClick={() => setContainsSpoilers(!containsSpoilers)}
                className={cn(
                  "size-4.5 rounded border transition-colors flex items-center justify-center",
                  containsSpoilers ? "bg-primary border-primary" : "border-input"
                )}
              >
                {containsSpoilers && (
                  <svg viewBox="0 0 12 12" className="size-3 text-primary-foreground"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
                )}
              </button>
              <span className="text-sm text-foreground">Contains spoilers</span>
            </label>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={rating === null || submitting}
            className={cn(
              "flex items-center justify-center w-full h-11 rounded-md",
              "bg-primary text-primary-foreground font-semibold text-sm",
              "hover:-translate-y-px hover:bg-primary/90 hover:shadow-md hover:shadow-primary/25",
              "active:translate-y-0 active:scale-[0.98]",
              "transition-all duration-150",
              "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none"
            )}
          >
            {submitting ? <Loader2 className="size-4 animate-spin" /> : submitText}
          </button>

          {rating === null && (
            <p className="text-center text-xs text-muted-foreground">
              Set a rating to {isEditMode ? "save your review" : "publish your review"}
            </p>
          )}
        </form>
      </div>
    </div>
  );
}

function ScopePill({ active, onClick, label, rating }: { active: boolean; onClick: () => void; label: string; rating?: number | null }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
        active
          ? "bg-primary text-primary-foreground"
          : "bg-secondary text-muted-foreground hover:text-foreground"
      )}
    >
      {label}
      {rating != null && (
        <span className="flex items-center gap-0.5">
          <Star className="size-3 fill-current" />
          {rating}
        </span>
      )}
    </button>
  );
}
