#!/usr/bin/env node
/**
 * One-time resolution script: builds src/lib/fanartPosterMap.ts
 *
 * For each show in the curated list below:
 *   1. Resolves the TMDB show ID via searchShows() (if not hardcoded)
 *   2. Fetches external_ids from TMDB to get the TheTVDB id
 *   3. Queries fanart.tv /tv/{tvdb_id} for poster artwork
 *   4. Picks the highest-voted tvposter URL
 *   5. Writes the result to src/lib/fanartPosterMap.ts
 *
 * Usage:
 *   VITE_FANART_API_KEY=yourkey node scripts/resolve-fanart-posters.mjs
 *
 * Or set it in .env and run:
 *   node scripts/resolve-fanart-posters.mjs
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, "..");

// Load .env manually (no dotenv dependency needed)
const envPath = join(projectRoot, ".env");
if (existsSync(envPath)) {
  const envContent = readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const match = line.match(/^VITE_FANART_API_KEY=(.+)$/);
    if (match) {
      process.env.VITE_FANART_API_KEY = match[1].trim();
    }
    const tmdbMatch = line.match(/^VITE_TMDB_API_KEY=(.+)$/);
    if (tmdbMatch && !process.env.VITE_TMDB_API_KEY) {
      process.env.VITE_TMDB_API_KEY = tmdbMatch[1].trim();
    }
    const tmdbTokenMatch = line.match(/^VITE_TMDB_READ_TOKEN=(.+)$/);
    if (tmdbTokenMatch && !process.env.VITE_TMDB_READ_TOKEN) {
      process.env.VITE_TMDB_READ_TOKEN = tmdbTokenMatch[1].trim();
    }
  }
}

const FANART_API_KEY = process.env.VITE_FANART_API_KEY;
if (!FANART_API_KEY) {
  console.error("ERROR: VITE_FANART_API_KEY not set. Add it to .env or pass as env var.");
  process.exit(1);
}

const TMDB_BASE = "https://api.themoviedb.org/3";
let TMDB_AUTH = "";
if (process.env.VITE_TMDB_READ_TOKEN) {
  TMDB_AUTH = `Bearer ${process.env.VITE_TMDB_READ_TOKEN}`;
} else if (process.env.VITE_TMDB_API_KEY) {
  TMDB_AUTH = null; // will use query param
} else {
  console.error("ERROR: No TMDB credentials found in .env (need VITE_TMDB_READ_TOKEN or VITE_TMDB_API_KEY)");
  process.exit(1);
}

async function tmdbFetch(path) {
  const url = TMDB_AUTH
    ? `${TMDB_BASE}${path}`
    : `${TMDB_BASE}${path}${path.includes("?") ? "&" : "?"}api_key=${process.env.VITE_TMDB_API_KEY}`;
  const headers = TMDB_AUTH ? { Authorization: TMDB_AUTH } : {};
  const res = await fetch(url, { headers });
  if (!res.ok) {
    throw new Error(`TMDB ${path} returned ${res.status}`);
  }
  return res.json();
}

async function searchShow(name) {
  const data = await tmdbFetch(`/search/tv?query=${encodeURIComponent(name)}&page=1`);
  if (!data.results || data.results.length === 0) return null;
  return data.results[0];
}

async function getExternalIds(seriesId) {
  return tmdbFetch(`/tv/${seriesId}/external_ids`);
}

async function getFanartPosters(tvdbId) {
  try {
    const res = await fetch(`https://webservice.fanart.tv/v3/tv/${tvdbId}`, {
      headers: { "api-key": FANART_API_KEY },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

function pickBestPoster(data) {
  const posters = data.tvposter ?? data.hdposter ?? [];
  if (posters.length === 0) return null;
  const best = posters.reduce((top, current) => {
    const topLikes = parseInt(top.likes, 10) || 0;
    const currentLikes = parseInt(current.likes, 10) || 0;
    return currentLikes > topLikes ? current : top;
  });
  return best.url || null;
}

// ---------------------------------------------------------------------------
// Curated show list - ~55 widely popular / iconic / prestige titles
// Some have hardcoded TMDB IDs (from showRatingIcons), others are searched by name.
// ---------------------------------------------------------------------------

const HARDCODED_IDS = {
  "Game of Thrones": 1399,
  "House of the Dragon": 94997,
  "Loki": 84958,
  "Twin Peaks": 1920,
  "Lost": 4607,
  "You": 78191,
  "Dexter": 1405,
  "Breaking Bad": 1396,
  "Daredevil": 61889,
  "Stranger Things": 66732,
};

const SHOWS_TO_RESOLVE = [
  "Game of Thrones",
  "House of the Dragon",
  "Breaking Bad",
  "Stranger Things",
  "The Last of Us",
  "Loki",
  "Twin Peaks",
  "Lost",
  "Dexter",
  "Daredevil",
  "You",
  "The Wire",
  "True Detective",
  "Fargo",
  "Better Call Saul",
  "Chernobyl",
  "The Boys",
  "Succession",
  "The Bear",
  "Severance",
  "The Sopranos",
  "The Office",
  "Friends",
  "Parks and Recreation",
  "The West Wing",
  "Mad Men",
  "The Walking Dead",
  "The Crown",
  "Black Mirror",
  "Mindhunter",
  "Peaky Blinders",
  "Sherlock",
  "Doctor Who",
  "The Mandalorian",
  "Wednesday",
  "Bridgerton",
  "Dark",
  "Money Heist",
  "Squid Game",
  "Arcane",
  "Attack on Titan",
  "Death Note",
  "Fullmetal Alchemist Brotherhood",
  "Steins;Gate",
  "Vikings",
  "The Witcher",
  "Ozark",
  "Narcos",
  "Yellowstone",
  "The Simpsons",
  "South Park",
  "Rick and Morty",
  "BoJack Horseman",
  "Band of Brothers",
  "The Pacific",
];

async function main() {
  console.log(`\nResolving ${SHOWS_TO_RESOLVE.length} shows...\n`);

  const results = {};
  let resolved = 0;
  let skipped = 0;

  for (const showName of SHOWS_TO_RESOLVE) {
    let tmdbId = HARDCODED_IDS[showName];
    let year = null;

    if (!tmdbId) {
      const searchResult = await searchShow(showName);
      if (!searchResult) {
        console.log(`  SKIP: "${showName}" - not found on TMDB`);
        skipped++;
        continue;
      }
      tmdbId = searchResult.id;
      year = searchResult.first_air_date ? searchResult.first_air_date.substring(0, 4) : "?";
    }

    // Get TVDB id
    let externalIds;
    try {
      externalIds = await getExternalIds(tmdbId);
    } catch (e) {
      console.log(`  SKIP: "${showName}" (TMDB ${tmdbId}) - external_ids failed: ${e.message}`);
      skipped++;
      continue;
    }

    const tvdbId = externalIds.tvdb_id;
    if (!tvdbId) {
      console.log(`  SKIP: "${showName}" (TMDB ${tmdbId}) - no TVDB id`);
      skipped++;
      continue;
    }

    // Get fanart posters
    const fanartData = await getFanartPosters(tvdbId);
    if (!fanartData) {
      console.log(`  SKIP: "${showName}" (TMDB ${tmdbId}, TVDB ${tvdbId}) - fanart.tv returned nothing`);
      skipped++;
      continue;
    }

    const posterUrl = pickBestPoster(fanartData);
    if (!posterUrl) {
      console.log(`  SKIP: "${showName}" (TMDB ${tmdbId}, TVDB ${tvdbId}) - no tvposter in fanart response`);
      skipped++;
      continue;
    }

    results[tmdbId] = posterUrl;
    resolved++;
    console.log(`  OK: "${showName}" - TMDB ${tmdbId}, TVDB ${tvdbId}, year ${year ?? "?"}`);
    console.log(`       → ${posterUrl}`);

    // Small delay to be nice to the APIs
    await new Promise((r) => setTimeout(r, 300));
  }

  console.log(`\n${resolved} resolved, ${skipped} skipped out of ${SHOWS_TO_RESOLVE.length}\n`);

  // Write the map file
  const mapContent = `/**
 * Static map of TMDB show IDs to fanart.tv poster URLs.
 *
 * Populated by scripts/resolve-fanart-posters.mjs.
 * This is shipped with the app - no runtime fanart.tv API calls are made.
 * Shows not in this map fall back to TMDB posters via bestPosterUrl().
 *
 * ${resolved} shows resolved from fanart.tv.
 */

export const fanartPosterMap: Record<number, string> = ${JSON.stringify(results, null, 2)
    .replace(/^/gm, " ")
    .replace(/^ {/, "{")
    .trimStart()};
`;

  const mapPath = join(projectRoot, "src", "lib", "fanartPosterMap.ts");
  writeFileSync(mapPath, mapContent);
  console.log(`Written to ${mapPath}\n`);
}

main().catch((e) => {
  console.error("Fatal error:", e);
  process.exit(1);
});
