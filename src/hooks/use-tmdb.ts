import { useEffect, useState, useRef } from "react";
import {
  getTrendingShows,
  getPopularShows,
  getTopRatedShows,
  getAiringTodayShows,
  getOnTheAirShows,
  getShowDetail,
  searchShows,
  discoverShows,
  type TVShow,
  type TVShowDetail,
  type TMDBPage,
  type DiscoverTVParams,
} from "@/lib/tmdb";

// ---------------------------------------------------------------------------
// Generic async hook state shape
// ---------------------------------------------------------------------------

interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

function useAsyncHook<T>(
  fetcher: () => Promise<T>,
  deps: React.DependencyList
): AsyncState<T> {
  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    loading: true,
    error: null,
  });

  // Use a ref to track the latest request so stale responses are ignored
  const reqIdRef = useRef(0);

  useEffect(() => {
    const reqId = ++reqIdRef.current;
    setState({ data: null, loading: true, error: null });

    fetcher()
      .then((data) => {
        if (reqId !== reqIdRef.current) return;
        setState({ data, loading: false, error: null });
      })
      .catch((err) => {
        if (reqId !== reqIdRef.current) return;
        const msg = err instanceof Error ? err.message : "Failed to load data";
        setState({ data: null, loading: false, error: msg });
      });

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return state;
}

// ---------------------------------------------------------------------------
// Trending shows (this week)
// ---------------------------------------------------------------------------

export function useTrendingShows(timeWindow: "day" | "week" = "week") {
  return useAsyncHook<TMDBPage<TVShow>>(
    () => getTrendingShows(timeWindow),
    [timeWindow]
  );
}

// ---------------------------------------------------------------------------
// Popular shows
// ---------------------------------------------------------------------------

export function usePopularShows(page = 1) {
  return useAsyncHook<TMDBPage<TVShow>>(
    () => getPopularShows(page),
    [page]
  );
}

// ---------------------------------------------------------------------------
// Top rated shows
// ---------------------------------------------------------------------------

export function useTopRatedShows(page = 1) {
  return useAsyncHook<TMDBPage<TVShow>>(
    () => getTopRatedShows(page),
    [page]
  );
}

// ---------------------------------------------------------------------------
// Airing today
// ---------------------------------------------------------------------------

export function useAiringTodayShows(page = 1) {
  return useAsyncHook<TMDBPage<TVShow>>(
    () => getAiringTodayShows(page),
    [page]
  );
}

// ---------------------------------------------------------------------------
// On the air
// ---------------------------------------------------------------------------

export function useOnTheAirShows(page = 1) {
  return useAsyncHook<TMDBPage<TVShow>>(
    () => getOnTheAirShows(page),
    [page]
  );
}

// ---------------------------------------------------------------------------
// Show detail
// ---------------------------------------------------------------------------

export function useShowDetail(showId: number | null) {
  return useAsyncHook<TVShowDetail | null>(
    () => (showId ? getShowDetail(showId) : Promise.resolve(null)),
    [showId]
  );
}

// ---------------------------------------------------------------------------
// Discover shows with filters
// ---------------------------------------------------------------------------

export function useDiscoverShows(params: DiscoverTVParams) {
  const key = JSON.stringify(params);
  return useAsyncHook<TMDBPage<TVShow>>(
    () => discoverShows(params),
    [key]
  );
}

// ---------------------------------------------------------------------------
// Search shows (for search results page — not the live dropdown)
// ---------------------------------------------------------------------------

export function useSearchShows(query: string, page = 1) {
  return useAsyncHook<TMDBPage<TVShow> | null>(
    () =>
      query.trim().length > 0
        ? searchShows(query.trim(), page)
        : Promise.resolve(null),
    [query, page]
  );
}
