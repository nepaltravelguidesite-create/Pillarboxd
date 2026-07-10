import { useTrendingShows, usePopularShows, useTopRatedShows, useOnTheAirShows } from "@/hooks/use-tmdb";
import { HeroBackdropBanner } from "@/components/shows/HeroBackdropBanner";
import { ShowCarousel } from "@/components/shows/ShowCarousel";

export function HomePage() {
  const trending = useTrendingShows("week");
  const popular = usePopularShows();
  const topRated = useTopRatedShows();
  const onTheAir = useOnTheAirShows();

  return (
    <div className="flex flex-col w-full gap-8 py-6">
      {/* Hero banner — trending */}
      <HeroBackdropBanner
        shows={trending.data?.results ?? []}
        loading={trending.loading}
      />

      {/* Trending this week */}
      <ShowCarousel
        title="Trending This Week"
        shows={trending.data?.results ?? []}
        loading={trending.loading}
        viewAllLink="/shows/trending"
        posterSize="md"
      />

      {/* Popular */}
      <ShowCarousel
        title="Popular Shows"
        shows={popular.data?.results ?? []}
        loading={popular.loading}
        viewAllLink="/shows/popular"
        posterSize="md"
      />

      {/* On the air */}
      <ShowCarousel
        title="Currently Airing"
        shows={onTheAir.data?.results ?? []}
        loading={onTheAir.loading}
        viewAllLink="/shows/on-the-air"
        posterSize="md"
      />

      {/* Top rated */}
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
