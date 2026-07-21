/**
 * Static map of TMDB show IDs to fanart.tv poster URLs.
 *
 * Populated by a one-time resolution script (scripts/resolve-fanart-posters.mjs).
 * This is shipped with the app — no runtime fanart.tv API calls are made.
 * Shows not in this map fall back to TMDB posters via bestPosterUrl().
 */

// This map will be populated by running scripts/resolve-fanart-posters.mjs
// with VITE_FANART_API_KEY set in .env. Until then it is empty and all
// shows use TMDB posters.
export const fanartPosterMap: Record<number, string> = {};
