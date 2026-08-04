import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AftershowLogo } from "@/components/brand/AftershowLogo";
import { Button } from "@/components/ui/button";
import { useTrendingShows } from "@/hooks/use-tmdb";
import { backdropUrl, type TVShow } from "@/lib/tmdb";

const WELCOME_KEY = "aftershow:welcome-seen";

function pickBestBackdrop(shows: TVShow[]): string | null {
  const withBackdrop = shows.filter((s) => s.backdrop_path);
  if (withBackdrop.length === 0) return null;
  // Pick the most popular show that has a backdrop - trending results are
  // already sorted by popularity, so the first match is the best choice.
  return backdropUrl(withBackdrop[0].backdrop_path, "w780");
}

export function WelcomeScreen({ onDone }: { onDone: () => void }) {
  const navigate = useNavigate();
  const [show, setShow] = useState(false);
  const { data: trending } = useTrendingShows("week");

  const backdropSrc = useMemo(
    () => pickBestBackdrop(trending?.results ?? []),
    [trending],
  );

  useEffect(() => {
    if (localStorage.getItem(WELCOME_KEY)) {
      onDone();
      return;
    }
    setShow(true);
  }, [onDone]);

  if (!show) return null;

  const handleStart = () => {
    localStorage.setItem(WELCOME_KEY, "1");
    navigate("/login");
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background md:hidden">
      {/* Top ~58%: hero backdrop image with bottom fade into background */}
      <div className="relative h-[58vh] w-full overflow-hidden">
        {backdropSrc ? (
          <img
            src={backdropSrc}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-secondary" />
        )}
        {/* Gradient fade from transparent to background at bottom edge */}
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-b from-transparent to-background" />
      </div>

      {/* Content area - overlaps the fade boundary */}
      <div className="flex flex-1 flex-col items-center px-6 -mt-10 relative z-10">
        <AftershowLogo size={44} className="text-primary" />

        <p className="mt-6 max-w-xs text-center font-display text-lg italic leading-snug text-muted-foreground">
          "Every episode. Every season. Every show worth talking about."
        </p>

        <div className="mt-8 w-full max-w-xs">
          <Button
            onClick={handleStart}
            size="lg"
            className="w-full h-12 text-base font-semibold"
          >
            Get Started
          </Button>
        </div>
      </div>
    </div>
  );
}
