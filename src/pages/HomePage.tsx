import { useEffect, useState } from "react";
import { useTrendingShows, usePopularShows, useTopRatedShows, useOnTheAirShows } from "@/hooks/use-tmdb";
import { HeroBackdropBanner } from "@/components/shows/HeroBackdropBanner";
import { ShowCarousel } from "@/components/shows/ShowCarousel";
import { UpcomingEpisodes } from "@/components/shows/UpcomingEpisodes";
import { getShowDetail, type TVShow } from "@/lib/tmdb";
import { useAuth } from "@/context/AuthContext";
import { useUserData } from "@/context/UserDataContext";

export function HomePage() {
  const trending = useTrendingShows("week");
  const popular = usePopularShows();
  const topRated = useTopRatedShows();
  const onTheAir = useOnTheAirShows();

  const { user } = useAuth();
  const { userShows } = useUserData();

  const isSignedIn = !!user;

  // Find the user's highest-rated show for "Recommended For You"
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
      } catch (err) {
        console.error("[HomePage] Failed to load recommendations:", err);
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
    <div className="flex flex-col w-full gap-8 py-6">
      {/* 1. Hero banner — trending */}
      <HeroBackdropBanner
        shows={trending.data?.results ?? []}
        loading={trending.loading}
      />

      {/* 2. Trending this week */}
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
    </div>
  );
}
