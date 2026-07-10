import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StarRating } from "@/components/shows/StarRating";
import { useUserData } from "@/context/UserDataContext";
import { useUI } from "@/context/UIContext";
import { useAuth } from "@/context/AuthContext";
import { posterUrl, type TVShow } from "@/lib/tmdb";
import { cn } from "@/lib/utils";
import { Loader2, X, Calendar, Eye, RotateCcw, Star, BookOpen } from "lucide-react";

interface LogEntryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  show: TVShow;
}

export function LogEntryModal({ open, onOpenChange, show }: LogEntryModalProps) {
  const { addLog } = useUserData();
  const { openAuthModal } = useUI();
  const { user } = useAuth();

  const [watchedDate, setWatchedDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [seasonsWatched, setSeasonsWatched] = useState(0);
  const [episodesWatched, setEpisodesWatched] = useState(1);
  const [review, setReview] = useState("");
  const [rewatch, setRewatch] = useState(false);
  const [rating, setRating] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setWatchedDate(new Date().toISOString().slice(0, 10));
      setSeasonsWatched(0);
      setEpisodesWatched(1);
      setReview("");
      setRewatch(false);
      setRating(null);
    }
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;

    setSubmitting(true);
    try {
      await addLog({
        show_id: show.id,
        show_name: show.name,
        show_poster_path: show.poster_path,
        show_backdrop_path: show.backdrop_path,
        show_first_air_date: show.first_air_date || null,
        watched_date: watchedDate,
        seasons_watched: seasonsWatched,
        episodes_watched: episodesWatched,
        review: review.trim() || null,
        rewatch: rewatch,
        rating: rating,
      });
      onOpenChange(false);
    } catch (err) {
      console.error("[LogEntry] Failed to save log:", err);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[480px] p-0 gap-0 overflow-hidden bg-card border-border rounded-lg">
        {/* Close */}
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          aria-label="Close"
          className="absolute right-3 top-3 z-10 flex items-center justify-center size-7 rounded text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="size-4" />
        </button>

        {/* Header with show info */}
        <DialogHeader className="px-5 pt-5 pb-3 space-y-2 text-left">
          <DialogTitle className="text-base font-bold text-foreground tracking-tight">
            Log: {show.name}
          </DialogTitle>
          <div className="flex items-center gap-3">
            <img
              src={posterUrl(show.poster_path, "w92")}
              alt={show.name}
              className="w-10 h-15 rounded object-cover shrink-0"
              style={{ aspectRatio: "2/3" }}
            />
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground truncate">
                {show.first_air_date
                  ? show.first_air_date.slice(0, 4)
                  : "TBA"}{" "}
                · {show.vote_average > 0 ? `${show.vote_average.toFixed(1)} TMDB` : "Unrated"}
              </p>
              <p className="text-[11px] text-muted-foreground/70 line-clamp-1 mt-0.5">
                {show.overview}
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-5 pb-5 pt-2 space-y-4">
          {/* Date watched */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
              <Calendar className="size-3" />
              Date Watched
            </label>
            <input
              type="date"
              value={watchedDate}
              onChange={(e) => setWatchedDate(e.target.value)}
              required
              className="h-9 w-full rounded border border-border bg-background/50 px-3 text-sm text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-colors"
            />
          </div>

          {/* Episodes / seasons watched */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                <Eye className="size-3" />
                Seasons
              </label>
              <input
                type="number"
                min={0}
                max={100}
                value={seasonsWatched}
                onChange={(e) =>
                  setSeasonsWatched(Math.max(0, parseInt(e.target.value) || 0))
                }
                className="h-9 w-full rounded border border-border bg-background/50 px-3 text-sm text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-colors"
              />
            </div>
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                <Eye className="size-3" />
                Episodes
              </label>
              <input
                type="number"
                min={1}
                max={9999}
                value={episodesWatched}
                onChange={(e) =>
                  setEpisodesWatched(Math.max(1, parseInt(e.target.value) || 1))
                }
                className="h-9 w-full rounded border border-border bg-background/50 px-3 text-sm text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-colors"
              />
            </div>
          </div>

          {/* Rating */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
              <Star className="size-3" />
              Rating
            </label>
            <div className="flex items-center gap-3 h-9">
              <StarRating value={rating} onChange={setRating} size="lg" />
              <span className="text-sm text-muted-foreground">
                {rating !== null ? `${rating.toFixed(1)} stars` : "Not rated"}
              </span>
            </div>
          </div>

          {/* Rewatch toggle */}
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
              <RotateCcw className="size-3" />
              Rewatch
            </label>
            <button
              type="button"
              role="switch"
              aria-checked={rewatch}
              onClick={() => setRewatch(!rewatch)}
              className={cn(
                "relative w-10 h-5 rounded-full transition-colors duration-200",
                rewatch ? "bg-primary" : "bg-border"
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 size-4 rounded-full bg-foreground transition-transform duration-200",
                  rewatch ? "translate-x-5" : "translate-x-0.5"
                )}
              />
            </button>
          </div>

          {/* Review */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
              Review
            </label>
            <textarea
              value={review}
              onChange={(e) => setReview(e.target.value)}
              rows={4}
              placeholder="Share your thoughts..."
              className="w-full rounded border border-border bg-background/50 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-colors resize-y min-h-[80px]"
            />
          </div>

          {/* Submit */}
          <div className="flex items-center gap-2 pt-1">
            <button
              type="submit"
              disabled={submitting}
              className={cn(
                "flex items-center justify-center gap-2 flex-1 h-10 rounded",
                "bg-primary text-primary-foreground font-bold text-xs uppercase tracking-widest",
                "hover:bg-primary/90 active:scale-[0.98]",
                "transition-all duration-150",
                "disabled:opacity-60 disabled:cursor-not-allowed"
              )}
            >
              {submitting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <>
                  <BookOpen className="size-3.5" />
                  Save Log Entry
                </>
              )}
            </button>
          </div>

          {/* Not signed in hint */}
          {!user && (
            <p className="text-xs text-center text-muted-foreground pt-1">
              You need to{" "}
              <button
                type="button"
                onClick={() => {
                  onOpenChange(false);
                  openAuthModal("signin");
                }}
                className="text-accent hover:underline"
              >
                sign in
              </button>{" "}
              to save log entries.
            </p>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
