/**
 * TMDB API helper — exclusively targets /tv/ endpoints.
 *
 * Authentication:
 *   1. Set VITE_TMDB_READ_TOKEN  (Bearer auth — v4 Read Access Token, recommended)
 *   2. OR set VITE_TMDB_API_KEY  (query-param auth — v3 API key, fallback)
 *
 * Example .env:
 *   VITE_TMDB_READ_TOKEN=eyJhbGciOiJSUzI1NiJ9...
 *   VITE_TMDB_API_KEY=abc123...
 */

const BASE_URL = "https://api.themoviedb.org/3";
const IMAGE_BASE_URL = "https://image.tmdb.org/t/p";

const READ_TOKEN = import.meta.env.VITE_TMDB_READ_TOKEN as string | undefined;
const API_KEY = import.meta.env.VITE_TMDB_API_KEY as string | undefined;

if (!READ_TOKEN && !API_KEY) {
  console.warn(
    "[Pillarboxd] No TMDB credentials found. " +
      "Set VITE_TMDB_READ_TOKEN or VITE_TMDB_API_KEY in your .env file."
  );
}

// ---------------------------------------------------------------------------
// Image helpers
// ---------------------------------------------------------------------------

export type PosterSize =
  | "w92"
  | "w154"
  | "w185"
  | "w342"
  | "w500"
  | "w780"
  | "original";

export type BackdropSize = "w300" | "w780" | "w1280" | "original";

export type ProfileSize = "w45" | "w185" | "h632" | "original";

export function posterUrl(
  path: string | null | undefined,
  size: PosterSize = "w342"
): string {
  if (!path) return "/placeholder-poster.svg";
  return `${IMAGE_BASE_URL}/${size}${path}`;
}

export function backdropUrl(
  path: string | null | undefined,
  size: BackdropSize = "w1280"
): string {
  if (!path) return "/placeholder-backdrop.svg";
  return `${IMAGE_BASE_URL}/${size}${path}`;
}

export function profileUrl(
  path: string | null | undefined,
  size: ProfileSize = "w185"
): string {
  if (!path) return "/placeholder-profile.svg";
  return `${IMAGE_BASE_URL}/${size}${path}`;
}

// ---------------------------------------------------------------------------
// Core fetch wrapper
// ---------------------------------------------------------------------------

async function tmdbFetch<T>(
  endpoint: string,
  params: Record<string, string | number | boolean> = {}
): Promise<T> {
  const url = new URL(`${BASE_URL}${endpoint}`);

  if (READ_TOKEN) {
    // v4 Bearer auth — no API key in query string
    Object.entries(params).forEach(([k, v]) =>
      url.searchParams.set(k, String(v))
    );
    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${READ_TOKEN}`,
        "Content-Type": "application/json",
      },
    });
    if (!res.ok) {
      const body = await res.text();
      throw new TMDBError(res.status, body, endpoint);
    }
    return res.json() as Promise<T>;
  }

  if (API_KEY) {
    // v3 API key auth
    url.searchParams.set("api_key", API_KEY);
    Object.entries(params).forEach(([k, v]) =>
      url.searchParams.set(k, String(v))
    );
    const res = await fetch(url.toString());
    if (!res.ok) {
      const body = await res.text();
      throw new TMDBError(res.status, body, endpoint);
    }
    return res.json() as Promise<T>;
  }

  throw new TMDBError(
    401,
    "No TMDB credentials configured. Set VITE_TMDB_READ_TOKEN or VITE_TMDB_API_KEY.",
    endpoint
  );
}

export class TMDBError extends Error {
  status: number;
  body: string;
  endpoint: string;

  constructor(status: number, body: string, endpoint: string) {
    super(`TMDB ${status} on ${endpoint}: ${body}`);
    this.name = "TMDBError";
    this.status = status;
    this.body = body;
    this.endpoint = endpoint;
  }
}

// ---------------------------------------------------------------------------
// Shared TMDB types
// ---------------------------------------------------------------------------

export interface TMDBPage<T> {
  page: number;
  results: T[];
  total_pages: number;
  total_results: number;
}

export interface TVShow {
  id: number;
  name: string;
  original_name: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  first_air_date: string;
  vote_average: number;
  vote_count: number;
  popularity: number;
  genre_ids: number[];
  origin_country: string[];
  original_language: string;
}

export interface TVShowDetail extends Omit<TVShow, "genre_ids"> {
  genres: { id: number; name: string }[];
  number_of_seasons: number;
  number_of_episodes: number;
  episode_run_time: number[];
  networks: { id: number; name: string; logo_path: string | null }[];
  status: string;
  tagline: string;
  homepage: string;
  in_production: boolean;
  languages: string[];
  created_by: {
    id: number;
    name: string;
    profile_path: string | null;
  }[];
  seasons: {
    id: number;
    name: string;
    season_number: number;
    episode_count: number;
    poster_path: string | null;
    air_date: string;
    overview: string;
  }[];
  credits?: {
    cast: CastMember[];
    crew: CrewMember[];
  };
  videos?: {
    results: VideoResult[];
  };
  similar?: TMDBPage<TVShow>;
  recommendations?: TMDBPage<TVShow>;
}

export interface CastMember {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
  order: number;
}

export interface CrewMember {
  id: number;
  name: string;
  job: string;
  department: string;
  profile_path: string | null;
}

export interface VideoResult {
  id: string;
  key: string;
  name: string;
  site: string;
  type: string;
  official: boolean;
}

export interface Genre {
  id: number;
  name: string;
}

export interface Person {
  id: number;
  name: string;
  profile_path: string | null;
  known_for_department: string;
  popularity: number;
}

export interface SearchResult {
  id: number;
  media_type: "tv" | "person";
  name?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  first_air_date?: string;
  vote_average?: number;
  overview?: string;
  profile_path?: string | null;
  known_for_department?: string;
}

// ---------------------------------------------------------------------------
// TV Show endpoints
// ---------------------------------------------------------------------------

/** GET /tv/popular */
export function getPopularShows(page = 1): Promise<TMDBPage<TVShow>> {
  return tmdbFetch<TMDBPage<TVShow>>("/tv/popular", { page });
}

/** GET /tv/top_rated */
export function getTopRatedShows(page = 1): Promise<TMDBPage<TVShow>> {
  return tmdbFetch<TMDBPage<TVShow>>("/tv/top_rated", { page });
}

/** GET /tv/airing_today */
export function getAiringTodayShows(page = 1): Promise<TMDBPage<TVShow>> {
  return tmdbFetch<TMDBPage<TVShow>>("/tv/airing_today", { page });
}

/** GET /tv/on_the_air */
export function getOnTheAirShows(page = 1): Promise<TMDBPage<TVShow>> {
  return tmdbFetch<TMDBPage<TVShow>>("/tv/on_the_air", { page });
}

/** GET /tv/trending/tv/week  (uses trending endpoint but TV-only) */
export function getTrendingShows(
  timeWindow: "day" | "week" = "week",
  page = 1
): Promise<TMDBPage<TVShow>> {
  return tmdbFetch<TMDBPage<TVShow>>(`/trending/tv/${timeWindow}`, { page });
}

/** GET /tv/{series_id} with optional appended responses */
export function getShowDetail(
  seriesId: number,
  appendToResponse: string[] = ["credits", "videos", "similar", "recommendations"]
): Promise<TVShowDetail> {
  return tmdbFetch<TVShowDetail>(`/tv/${seriesId}`, {
    append_to_response: appendToResponse.join(","),
  });
}

/** GET /tv/{series_id}/season/{season_number} */
export function getShowSeason(
  seriesId: number,
  seasonNumber: number
): Promise<SeasonDetail> {
  return tmdbFetch<SeasonDetail>(`/tv/${seriesId}/season/${seasonNumber}`);
}

export interface SeasonDetail {
  id: number;
  name: string;
  overview: string;
  season_number: number;
  air_date: string;
  episodes: Episode[];
  poster_path: string | null;
}

export interface Episode {
  id: number;
  name: string;
  overview: string;
  episode_number: number;
  season_number: number;
  air_date: string;
  still_path: string | null;
  vote_average: number;
  vote_count: number;
  runtime: number;
}

/** GET /discover/tv with filtering */
export interface DiscoverTVParams {
  page?: number;
  sort_by?: string;
  with_genres?: string;
  first_air_date_year?: number;
  "first_air_date.gte"?: string;
  "first_air_date.lte"?: string;
  with_networks?: string;
  with_original_language?: string;
  "vote_average.gte"?: number;
  "vote_count.gte"?: number;
  with_status?: string;
  with_type?: string;
  timezone?: string;
}

export function discoverShows(
  params: DiscoverTVParams = {}
): Promise<TMDBPage<TVShow>> {
  return tmdbFetch<TMDBPage<TVShow>>("/discover/tv", {
    ...params,
    page: params.page ?? 1,
    sort_by: params.sort_by ?? "popularity.desc",
  } as Record<string, string | number | boolean>);
}

// ---------------------------------------------------------------------------
// Search endpoints
// ---------------------------------------------------------------------------

/** GET /search/tv — search TV shows only */
export function searchShows(
  query: string,
  page = 1
): Promise<TMDBPage<TVShow>> {
  return tmdbFetch<TMDBPage<TVShow>>("/search/tv", { query, page });
}

/** GET /search/multi — returns TV + person results */
export function searchMulti(
  query: string,
  page = 1
): Promise<TMDBPage<SearchResult>> {
  return tmdbFetch<TMDBPage<SearchResult>>("/search/multi", { query, page });
}

// ---------------------------------------------------------------------------
// Genre endpoints
// ---------------------------------------------------------------------------

/** GET /genre/tv/list */
export function getTVGenres(): Promise<{ genres: Genre[] }> {
  return tmdbFetch<{ genres: Genre[] }>("/genre/tv/list");
}

// ---------------------------------------------------------------------------
// People endpoints (cast/crew of TV shows)
// ---------------------------------------------------------------------------

/** GET /person/{person_id} */
export function getPerson(
  personId: number
): Promise<PersonDetail> {
  return tmdbFetch<PersonDetail>(`/person/${personId}`, {
    append_to_response: "tv_credits",
  });
}

export interface PersonDetail extends Person {
  biography: string;
  birthday: string | null;
  deathday: string | null;
  place_of_birth: string | null;
  homepage: string | null;
  also_known_as: string[];
  imdb_id: string;
  tv_credits?: {
    cast: (TVShow & { character: string; episode_count: number })[];
    crew: (TVShow & { job: string; department: string })[];
  };
}

// ---------------------------------------------------------------------------
// Watch Providers
// ---------------------------------------------------------------------------

export interface WatchProvider {
  provider_id: number;
  provider_name: string;
  logo_path: string | null;
  display_priority: number;
}

export interface WatchProvidersResult {
  link: string;
  flatrate: WatchProvider[];
  free: WatchProvider[];
  ads: WatchProvider[];
  rent: WatchProvider[];
  buy: WatchProvider[];
}

/** GET /tv/{series_id}/watch/providers — region-aware, falls back to US */
export function getWatchProviders(
  seriesId: number,
  region = "US"
): Promise<WatchProvidersResult> {
  return tmdbFetch<WatchProvidersResult>(
    `/tv/${seriesId}/watch/providers`,
    { watch_region: region }
  ).then((data) => {
    // TMDB returns results keyed by country code; extract the requested region
    const full = data as unknown as {
      id: number;
      results: Record<string, WatchProvidersResult>;
      link: string;
    };
    const regionData = full.results?.[region] ?? full.results?.["US"] ?? null;
    if (!regionData) {
      return { link: full.link ?? "", flatrate: [], free: [], ads: [], rent: [], buy: [] };
    }
    return regionData;
  });
}
