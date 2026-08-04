/**
 * fanart.tv API helper - secondary poster source for a curated set of shows.
 *
 * Authentication:
 *   Set VITE_FANART_API_KEY in your .env file.
 *   Get one at: https://fanart.tv/get-an-api-key/
 *
 * This module is only used by the one-time resolution script that produces
 * src/lib/fanartPosterMap.ts. The map itself is shipped statically - regular
 * users never hit fanart.tv at runtime.
 */

const BASE_URL = "https://webservice.fanart.tv/v3";

const API_KEY = import.meta.env.VITE_FANART_API_KEY as string | undefined;

if (!API_KEY) {
  console.warn(
    "[Aftershow] No fanart.tv API key found. " +
      "Set VITE_FANART_API_KEY in your .env file. " +
      "(Only needed for the poster resolution script - not at runtime.)",
  );
}

export interface FanartTvPoster {
  id: string;
  url: string;
  likes: string;
  lang: string;
}

export interface FanartTvResponse {
  name: string;
  thetvdb_id: string;
  tvposter?: FanartTvPoster[];
  hdposter?: FanartTvPoster[];
}

/**
 * GET /tv/{tvdb_id} - fetches artwork for a show keyed by TheTVDB id.
 * Returns the raw response or null if the request fails.
 */
export async function getFanartPosters(
  tvdbId: number | string,
): Promise<FanartTvResponse | null> {
  if (!API_KEY) return null;

  try {
    const res = await fetch(`${BASE_URL}/tv/${tvdbId}`, {
      headers: {
        "api-key": API_KEY,
      },
    });
    if (!res.ok) return null;
    return (await res.json()) as FanartTvResponse;
  } catch {
    return null;
  }
}

/**
 * Given a fanart.tv response, pick the highest-voted tvposter URL.
 * Falls back to hdposter if no tvposter entries exist.
 * Returns null if no suitable poster is found.
 */
export function pickBestFanartPoster(data: FanartTvResponse): string | null {
  const posters = data.tvposter ?? data.hdposter ?? [];
  if (posters.length === 0) return null;

  const best = posters.reduce((top, current) => {
    const topLikes = parseInt(top.likes, 10) || 0;
    const currentLikes = parseInt(current.likes, 10) || 0;
    return currentLikes > topLikes ? current : top;
  });

  return best.url || null;
}
