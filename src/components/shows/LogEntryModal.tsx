import { useState, useEffect } from "react";
import { useUserData } from "@/context/UserDataContext";
import { posterUrl, type TVShow } from "@/lib/tmdb";
import { cn } from "@/lib/utils";
import { StarRating } from "@/components/shows/StarRating";
import { getShowRatingIcon } from "@/lib/showRatingIcons";
import { Loader2, Calendar } from "lucide-react";
import { toast } from "sonner";
import { VibeTagPicker, type VibeTagValue } from "@/components/shows/VibeTag";

interface LogEntryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  show: TVShow;
}

export function LogEntryModal({ open, onOpenChange, show }: LogEntryModalProps) {
  const { addLog } = useUserData();

  const [watchedDate, setWatchedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [rating, setRating] = useState<number | null>(null);
  const [review, setReview] = useState("");
  const [containsSpoilers, setContainsSpoilers] = useState(false);
  const [rewatch, setRewatch] = useState(false);
  const [vibeTag, setVibeTag] = useState<VibeTagValue | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const ratingIcon = getShowRatingIcon(show.id);

  useEffect(() => {
    if (open) {
      setWatchedDate(new Date().toISOString().slice(0, 10));
      setRating(null);
      setReview("");
      setContainsSpoilers(false);
      setRewatch(false);
      setVibeTag(null);
      setSubmitting(false);
    }
  }, [open, show.id]);

  if (!open) return null;

  const year = show.first_air_date ? new Date(show.first_air_date).getFullYear() : "";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (rating === null) return;
    setSubmitting(true);
    try {
      await addLog({
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
        vibe_tag: vibeTag,
      });
      toast.success("Review published!");
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to publish review");
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

        {/* Header */}
        <div className="px-5 pt-3 pb-2 flex items-center justify-between">
          <h2 className="font-display text-base font-bold text-foreground">Write a Review</h2>
          <button
            onClick={() => onOpenChange(false)}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 pb-5 space-y-4">
          {/* Selected show */}
          <div className="flex items-center gap-3 py-2">
            <div className="w-12 h-18 rounded-md overflow-hidden bg-muted shrink-0">
              {show.poster_path ? (
                <img src={posterUrl(show.poster_path, "w92")} alt={show.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-secondary/30" />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{show.name}</p>
              {year && <p className="text-xs text-muted-foreground">{year}</p>}
            </div>
          </div>

          {/* Date watched */}
          <div className="space-y-1.5">
            <label htmlFor="log-date" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Date Watched
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <input
                id="log-date"
                type="date"
                value={watchedDate}
                onChange={(e) => setWatchedDate(e.target.value)}
                className={cn(
                  "h-11 w-full rounded-md border border-input bg-background/40",
                  "pl-10 pr-3 text-sm text-foreground",
                  "focus:outline-none focus:border-ring focus:ring-2 focus:ring-ring/40",
                  "transition-colors"
                )}
              />
            </div>
          </div>

          {/* Quick-tag pills */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Quick Tag <span className="normal-case text-muted-foreground/60">(optional)</span>
            </label>
            <VibeTagPicker value={vibeTag} onChange={setVibeTag} />
          </div>

          {/* Star rating — large, tappable */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Rating
            </label>
            <div className="flex items-center justify-center py-3 rounded-md border border-border/40 bg-background/20">
              <StarRating
                value={rating}
                onChange={setRating}
                size="lg"
                icon={ratingIcon}
              />
            </div>
          </div>

          {/* Review text */}
          <div className="space-y-1.5">
            <label htmlFor="log-review" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Review
            </label>
            <textarea
              id="log-review"
              value={review}
              onChange={(e) => setReview(e.target.value)}
              rows={4}
              placeholder="Share your thoughts on this show..."
              className={cn(
                "w-full rounded-md border border-input bg-background/40",
                "px-3 py-2.5 text-sm text-foreground",
                "placeholder:text-muted-foreground resize-none",
                "focus:outline-none focus:border-ring focus:ring-2 focus:ring-ring/40",
                "transition-colors"
              )}
            />
          </div>

          {/* Rewatch toggle */}
          <label className="flex items-center gap-2.5 cursor-pointer">
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

          {/* Publish button — disabled until rating is set */}
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
            {submitting ? <Loader2 className="size-4 animate-spin" /> : "Publish"}
          </button>

          {rating === null && (
            <p className="text-center text-xs text-muted-foreground">
              Set a rating to publish your review
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
