import { useState, useEffect, useCallback } from "react";
import {
  Bookmark,
  BookmarkCheck,
  Star,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useUI } from "@/context/UIContext";
import { useUserData } from "@/context/UserDataContext";
import { getPopularShows, type TVShow } from "@/lib/tmdb";
import { bestPosterUrl } from "@/lib/tmdb";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { StarRating } from "@/components/shows/StarRating";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const ONBOARDING_KEY = "aftershow_onboarding_complete";
const SHOWS_PER_STEP = 6;

// ---------------------------------------------------------------------------
// OnboardingFlow - first-time signup modal flow
// ---------------------------------------------------------------------------

export function OnboardingFlow() {
  const { user } = useAuth();
  const { authModalOpen } = useUI();
  const { userShows, setRating, toggleWatchlist } = useUserData();

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [shows, setShows] = useState<TVShow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Track ratings made during the flow by show id
  const [ratedShowIds, setRatedShowIds] = useState<Set<number>>(new Set());
  // Track watchlist toggles during the flow by show id
  const [watchlistedShowIds, setWatchlistedShowIds] = useState<Set<number>>(
    new Set(),
  );

  // -------------------------------------------------------------------------
  // Decide whether the flow should be shown.
  // Only show if: user signed in, onboarding not complete, no user shows,
  // and the auth modal is not currently open (so we don't overlap it).
  // -------------------------------------------------------------------------
  useEffect(() => {
    const alreadyDone = localStorage.getItem(ONBOARDING_KEY);
    const shouldShow =
      user && !alreadyDone && userShows.length === 0 && !authModalOpen;

    if (shouldShow && !open) {
      setOpen(true);
      setStep(0);
    } else if (!user && open) {
      // Signed out mid-flow - close and reset
      setOpen(false);
    }
  }, [user, userShows.length, authModalOpen, open]);

  // -------------------------------------------------------------------------
  // Fetch popular shows once when the modal opens.
  // We request two pages so steps 2 and 3 have different shows.
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [page1, page2] = await Promise.all([
          getPopularShows(1),
          getPopularShows(2),
        ]);
        if (cancelled) return;
        const combined = [...page1.results, ...page2.results].filter(
          (s) => s.poster_path,
        );
        setShows(combined);
      } catch (err) {
        console.error("[Onboarding] Failed to load shows:", err);
        setError("Couldn't load shows. Please try again later.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open]);

  const ratingShows = shows.slice(0, SHOWS_PER_STEP);
  const watchlistShows = shows.slice(SHOWS_PER_STEP, SHOWS_PER_STEP * 2);

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------

  const handleRate = useCallback(
    async (show: TVShow, rating: number | null) => {
      if (rating === null) {
        setRatedShowIds((prev) => {
          const next = new Set(prev);
          next.delete(show.id);
          return next;
        });
        return;
      }
      await setRating(show, rating);
      setRatedShowIds((prev) => new Set(prev).add(show.id));
    },
    [setRating],
  );

  const handleToggleWatchlist = useCallback(
    async (show: TVShow) => {
      const isAdding = !watchlistedShowIds.has(show.id);
      await toggleWatchlist(show);
      setWatchlistedShowIds((prev) => {
        const next = new Set(prev);
        if (isAdding) next.add(show.id);
        else next.delete(show.id);
        return next;
      });
    },
    [toggleWatchlist, watchlistedShowIds],
  );

  function handleComplete() {
    localStorage.setItem(ONBOARDING_KEY, "true");
    setOpen(false);
  }

  function handleSkip() {
    localStorage.setItem(ONBOARDING_KEY, "true");
    setOpen(false);
  }

  const canAdvance =
    step === 0 ||
    (step === 1 && ratedShowIds.size >= 1) ||
    (step === 2 && watchlistedShowIds.size >= 1) ||
    step === 3;

  // -------------------------------------------------------------------------
  // Progress dots
  // -------------------------------------------------------------------------

  const stepLabels = ["Welcome", "Rate", "Watchlist", "Done"];

  function ProgressDots() {
    return (
      <div className="flex items-center justify-center gap-1.5 pt-1">
        {stepLabels.map((label, idx) => (
          <div
            key={label}
            className={cn(
              "h-1.5 rounded-full transition-all duration-300",
              idx === step
                ? "w-6 bg-primary"
                : idx < step
                  ? "w-1.5 bg-primary/60"
                  : "w-1.5 bg-border",
            )}
          />
        ))}
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        className="sm:max-w-md max-h-[90vh] overflow-y-auto"
        showCloseButton
        onEscapeKeyDown={(e) => {
          // Don't let escape close mid-onboarding accidentally
          e.preventDefault();
        }}
        onInteractOutside={(e) => {
          // Prevent closing by clicking outside
          e.preventDefault();
        }}
      >
        <DialogHeader>
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-widest">
            <span>Step {Math.min(step + 1, 4)} of 4</span>
          </div>
          <ProgressDots />
        </DialogHeader>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="size-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-muted-foreground">Loading shows…</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="outline" size="sm" onClick={handleSkip}>
              Skip for now
            </Button>
          </div>
        ) : step === 0 ? (
          // -----------------------------------------------------------------
          // Step 1 - Welcome
          // -----------------------------------------------------------------
          <div className="flex flex-col items-center text-center py-6 gap-5">
            <div className="flex items-center justify-center size-16 rounded-full bg-primary/10">
              <Sparkles className="size-8 text-primary" />
            </div>
            <DialogTitle className="font-display text-2xl font-bold text-foreground">
              Welcome to Aftershow!
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground leading-relaxed max-w-sm">
              The show's over. Let's talk about it. Aftershow is your personal
              TV tracker. Rate shows you've watched, keep a watchlist of what's
              next, log episodes as you go, and follow friends to see what
              they're loving. Let's set you up in a few quick steps.
            </DialogDescription>
            <Button className="w-full" size="lg" onClick={() => setStep(1)}>
              Get Started
            </Button>
            <button
              type="button"
              onClick={handleSkip}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Skip setup
            </button>
          </div>
        ) : step === 1 ? (
          // -----------------------------------------------------------------
          // Step 2 - Rate a few shows
          // -----------------------------------------------------------------
          <div className="flex flex-col gap-4">
            <div>
              <DialogTitle className="font-display text-xl font-bold text-foreground">
                Rate a few shows
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground mt-1">
                Tap the stars to rate at least one show. This helps us
                personalize your recommendations.
              </DialogDescription>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {ratingShows.map((show) => {
                const rating =
                  userShows.find((s) => s.show_id === show.id)?.rating ?? null;
                return (
                  <div
                    key={show.id}
                    className="flex flex-col items-center gap-2 rounded-lg border border-border/60 bg-card/40 p-2"
                  >
                    <div className="relative aspect-poster w-full rounded-md overflow-hidden bg-muted">
                      <img
                        src={bestPosterUrl(show, "w342")}
                        alt={`${show.name} poster`}
                        loading="lazy"
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    </div>
                    <p className="text-[11px] font-medium text-foreground text-center line-clamp-1 leading-tight w-full">
                      {show.name}
                    </p>
                    <StarRating
                      value={rating}
                      size="sm"
                      onChange={(r) => handleRate(show, r)}
                    />
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-between gap-3 pt-1">
              <button
                type="button"
                onClick={handleSkip}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Skip setup
              </button>
              <Button
                size="lg"
                onClick={() => setStep(2)}
                disabled={!canAdvance}
              >
                Continue
              </Button>
            </div>
          </div>
        ) : step === 2 ? (
          // -----------------------------------------------------------------
          // Step 3 - Add to your watchlist
          // -----------------------------------------------------------------
          <div className="flex flex-col gap-4">
            <div>
              <DialogTitle className="font-display text-xl font-bold text-foreground">
                Add to your watchlist
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground mt-1">
                Tap the bookmark on at least one show you'd like to watch later.
              </DialogDescription>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {watchlistShows.map((show) => {
                const watchlisted =
                  watchlistedShowIds.has(show.id) ||
                  userShows.find((s) => s.show_id === show.id)?.watchlisted;
                return (
                  <div
                    key={show.id}
                    className="flex flex-col items-center gap-2 rounded-lg border border-border/60 bg-card/40 p-2"
                  >
                    <div className="relative aspect-poster w-full rounded-md overflow-hidden bg-muted">
                      <img
                        src={bestPosterUrl(show, "w342")}
                        alt={`${show.name} poster`}
                        loading="lazy"
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    </div>
                    <p className="text-[11px] font-medium text-foreground text-center line-clamp-1 leading-tight w-full">
                      {show.name}
                    </p>
                    <button
                      type="button"
                      onClick={() => handleToggleWatchlist(show)}
                      aria-label={
                        watchlisted
                          ? "Remove from watchlist"
                          : "Add to watchlist"
                      }
                      className={cn(
                        "flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-all duration-150 active:scale-95",
                        watchlisted
                          ? "bg-accent text-accent-foreground border-accent"
                          : "bg-background text-foreground/80 border-border hover:border-foreground/30 hover:text-foreground",
                      )}
                    >
                      {watchlisted ? (
                        <BookmarkCheck className="size-3.5" />
                      ) : (
                        <Bookmark className="size-3.5" />
                      )}
                      {watchlisted ? "Saved" : "Watchlist"}
                    </button>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-between gap-3 pt-1">
              <Button variant="ghost" size="sm" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button
                size="lg"
                onClick={() => setStep(3)}
                disabled={!canAdvance}
              >
                Continue
              </Button>
            </div>
          </div>
        ) : (
          // -----------------------------------------------------------------
          // Step 4 - You're all set!
          // -----------------------------------------------------------------
          <div className="flex flex-col items-center text-center py-6 gap-5">
            <div className="flex items-center justify-center size-16 rounded-full bg-primary/10">
              <CheckCircle2 className="size-8 text-primary" />
            </div>
            <DialogTitle className="font-display text-2xl font-bold text-foreground">
              You're all set!
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground leading-relaxed max-w-sm">
              You rated{" "}
              <span className="font-semibold text-foreground">
                {ratedShowIds.size}
              </span>{" "}
              {ratedShowIds.size === 1 ? "show" : "shows"} and added{" "}
              <span className="font-semibold text-foreground">
                {watchlistedShowIds.size}
              </span>{" "}
              {watchlistedShowIds.size === 1 ? "show" : "shows"} to your
              watchlist. Your profile is ready to go.
            </DialogDescription>

            <div className="flex items-center gap-6 w-full justify-center py-2">
              <div className="flex flex-col items-center gap-1">
                <div className="flex items-center justify-center size-10 rounded-full bg-secondary/60">
                  <Star className="size-5 text-primary fill-primary" />
                </div>
                <span className="text-lg font-bold text-foreground leading-tight">
                  {ratedShowIds.size}
                </span>
                <span className="text-[11px] text-muted-foreground uppercase tracking-wider">
                  Rated
                </span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <div className="flex items-center justify-center size-10 rounded-full bg-secondary/60">
                  <BookmarkCheck className="size-5 text-primary" />
                </div>
                <span className="text-lg font-bold text-foreground leading-tight">
                  {watchlistedShowIds.size}
                </span>
                <span className="text-[11px] text-muted-foreground uppercase tracking-wider">
                  Watchlist
                </span>
              </div>
            </div>

            <Button className="w-full" size="lg" onClick={handleComplete}>
              Start Exploring
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
