import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTrendingShows, usePopularShows, useTopRatedShows, useOnTheAirShows } from "@/hooks/use-tmdb";
import { HeroBackdropBanner } from "@/components/shows/HeroBackdropBanner";
import { ShowCarousel } from "@/components/shows/ShowCarousel";
import { UpcomingEpisodes } from "@/components/shows/UpcomingEpisodes";
import { getShowDetail, type TVShow } from "@/lib/tmdb";
import { useAuth } from "@/context/AuthContext";
import { useUserData } from "@/context/UserDataContext";
import { useUI } from "@/context/UIContext";
import { SEOMeta } from "@/components/SEOMeta";
import { Eye, Star, BarChart3, List, Users } from "lucide-react";

export function HomePage() {
  const trending = useTrendingShows("week");
  const popular = usePopularShows();
  const topRated = useTopRatedShows();
  const onTheAir = useOnTheAirShows();

  const { user } = useAuth();
  const { userShows } = useUserData();
  const { openAuthModal } = useUI();

  const isSignedIn = !!user;

  const ratedShows = userShows
    .filter((s) => s.rating !== null && (s.rating ?? 0) > 0)
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
  const topRatedShow = ratedShows[0] ?? null;

  const [recommendations, setRecommendations] = useState<TVShow[]>([]);
  const [loadingRecs, setLoadingRecs] = useState(false);

  useEffect(() => {
    let cancelled = false;

    if (!topRatedShow) {
      setRecommendations([]);
      return;
    }

    setLoadingRecs(true);

    (async () => {
      try {
        const detail = await getShowDetail(topRatedShow.show_id);
        if (cancelled) return;
        setRecommendations(detail.recommendations?.results ?? []);
      } catch {
        if (!cancelled) setRecommendations([]);
      } finally {
        if (!cancelled) setLoadingRecs(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [topRatedShow?.show_id]);

  const showRecommendations = isSignedIn && topRatedShow !== null;

  return (
    <div className="flex flex-col w-full">
      <SEOMeta
        title="Aftershow — Track every show you watch"
        description="Log episodes, rate shows, discover what's next. The TV tracker for people who care about what they watch."
        ogImage="/og-default.webp"
      />

      {/* 1. Hero banner — trending */}
      <HeroBackdropBanner
        shows={trending.data?.results ?? []}
        loading={trending.loading}
      />

      {/* Logged-out pitch — only shows for non-signed-in visitors */}
      {!isSignedIn && (
        <section className="w-full px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
          <div className="max-w-screen-xl mx-auto">
            <div className="flex flex-col items-center text-center gap-6 mb-10">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground tracking-tight font-display max-w-2xl leading-tight">
                The TV tracker for people who actually watch TV.
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground max-w-xl leading-relaxed">
                Not just "did you see it." Episode-by-episode tracking, season progress,
                ratings, reviews, and a calendar of what's airing next — for the shows you follow.
              </p>
              <div className="flex items-center gap-3 mt-2">
                <button
                  onClick={() => openAuthModal("signup")}
                  className="flex items-center gap-2 h-11 px-6 rounded bg-primary text-primary-foreground font-bold text-sm uppercase tracking-widest hover:bg-primary/90 active:scale-95 transition-all duration-150"
                >
                  Start tracking — it's free
                </button>
                <Link
                  to="/shows"
                  className="flex items-center gap-2 h-11 px-6 rounded border border-border bg-background/50 text-foreground/80 hover:text-foreground hover:border-foreground/30 font-medium text-sm uppercase tracking-widest transition-all duration-150"
                >
                  Browse shows
                </Link>
              </div>
            </div>

            {/* Feature highlights */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
              {[
                { icon: Eye, title: "Episode Tracking", desc: "Mark episodes watched, season by season. Know exactly where you left off." },
                { icon: Star, title: "Rate & Review", desc: "Five-star ratings, written reviews, spoiler tags. See what friends thought." },
                { icon: BarChart3, title: "Your Stats", desc: "Episodes watched, hours spent, genre breakdown. A year-in-review worth sharing." },
                { icon: List, title: "Lists & Discovery", desc: "Build curated lists. Get recommendations based on what you've loved." },
              ].map((f) => (
                <div
                  key={f.title}
                  className="flex flex-col gap-2 p-5 rounded-lg bg-card border border-border"
                >
                  <f.icon className="size-5 text-primary" />
                  <h3 className="text-sm font-bold text-foreground font-display">{f.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 2. Trending this week */}
      <div className="px-4 sm:px-6 lg:px-8 py-6 flex flex-col w-full gap-8">
        <ShowCarousel
          title="Trending This Week"
          shows={trending.data?.results ?? []}
          loading={trending.loading}
          viewAllLink="/shows/trending"
          posterSize="md"
        />

        {/* 3. Recommended for you — only if signed in + has rated shows */}
        {showRecommendations && (
          <ShowCarousel
            title={`Because you rated ${topRatedShow!.show_name}`}
            shows={recommendations}
            loading={loadingRecs}
            posterSize="md"
          />
        )}

        {/* 4. Upcoming episodes — only if signed in */}
        {isSignedIn && <UpcomingEpisodes />}

        {/* 5. Popular */}
        <ShowCarousel
          title="Popular Shows"
          shows={popular.data?.results ?? []}
          loading={popular.loading}
          viewAllLink="/shows/popular"
          posterSize="md"
        />

        {/* 6. On the air */}
        <ShowCarousel
          title="Currently Airing"
          shows={onTheAir.data?.results ?? []}
          loading={onTheAir.loading}
          viewAllLink="/shows/on-the-air"
          posterSize="md"
        />

        {/* 7. Top rated */}
        <ShowCarousel
          title="Top Rated Shows"
          shows={topRated.data?.results ?? []}
          loading={topRated.loading}
          viewAllLink="/shows/top-rated"
          posterSize="md"
        />

        {/* Logged-out social proof CTA at the bottom */}
        {!isSignedIn && (
          <section className="flex flex-col items-center text-center gap-4 py-10 border-t border-border">
            <Users className="size-8 text-primary" />
            <h3 className="text-xl font-bold text-foreground font-display">
              Join the community
            </h3>
            <p className="text-sm text-muted-foreground max-w-md">
              Follow other viewers, share reviews, and build lists together.
              Your next favorite show is one follow away.
            </p>
            <button
              onClick={() => openAuthModal("signup")}
              className="flex items-center gap-2 h-10 px-6 rounded bg-primary text-primary-foreground font-bold text-xs uppercase tracking-widest hover:bg-primary/90 active:scale-95 transition-all duration-150"
            >
              Create your account
            </button>
          </section>
        )}
      </div>
    </div>
  );
}
