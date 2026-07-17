import { createClient } from "npm:@supabase/supabase-js@2";
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const TMDB_TOKEN = "eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiIxZThkODFiYTcxNTZiNThmNTUzNDRkZGE0ZDZiMGNmMiIsIm5iZiI6MTc4MzY3MTAwMC4wNDEsInN1YiI6IjZhNTBhOGQ4MjAyMGM4NTBhMzdhYWQxOSIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.N0yT_cc7XJ0jNoxv9-2Y_855fmbWXfwinoBBgjT3DRs";
const TMDB_BASE = "https://api.themoviedb.org/3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface Show {
  id: number;
  name: string;
  poster_path: string | null;
  first_air_date: string;
  vote_average: number;
  vote_count: number;
}

interface ListConfig {
  title: string;
  description: string;
  type: "genre" | "keyword" | "origin" | "data" | "curated";
  with_genres?: string;
  with_keywords?: string;
  with_origin_country?: string;
  sort_by?: string;
  vote_count_gte?: string;
  with_type?: string;
  searchQueries?: string[];
  fallbackToGenre?: string;
}

const LISTS: ListConfig[] = [
  // === GENRE-FILTERED (9) ===
  { title: "Crime & Corruption", description: "From cartels to con artists, the shows where everyone's dirty and the money's dirtier.", type: "genre", with_genres: "80", sort_by: "popularity.desc" },
  { title: "Sci-Fi & Fantasy Worlds", description: "Escapist universes so rich you'll forget what year it is.", type: "genre", with_genres: "10765", sort_by: "popularity.desc" },
  { title: "War & Political Drama", description: "Power, patriotism, and the human cost of both.", type: "genre", with_genres: "10768", sort_by: "popularity.desc" },
  { title: "Action & Adventure", description: "Punches thrown, stakes raised, no thoughts required.", type: "genre", with_genres: "10759", sort_by: "popularity.desc" },
  { title: "Animated for Grown-Ups", description: "Animation that deals with adult themes without the Pixar sheen.", type: "genre", with_genres: "16", sort_by: "vote_average.desc", vote_count_gte: "100" },
  { title: "Documentaries Worth Your Time", description: "True stories, told well. No filler, no fluff.", type: "genre", with_genres: "99", sort_by: "popularity.desc" },
  { title: "Reality TV Guilty Pleasures", description: "You know you shouldn't. You will anyway.", type: "genre", with_genres: "10764", sort_by: "popularity.desc" },
  { title: "Mystery & Whodunits", description: "Everyone's a suspect, including you.", type: "genre", with_genres: "9648", sort_by: "popularity.desc" },
  { title: "Family Watch Together", description: "The rare shows that work for ages 8 to 80.", type: "genre", with_genres: "10751", sort_by: "popularity.desc" },

  // === KEYWORD-FILTERED (12) ===
  { title: "Horror & the Unsettling", description: "Sleep is overrated anyway.", type: "keyword", with_keywords: "315058", sort_by: "popularity.desc" },
  { title: "Rom-Coms to Fall For", description: "Will-they-won't-they, but make it charming.", type: "keyword", with_keywords: "9840", with_genres: "35", sort_by: "popularity.desc" },
  { title: "True Crime Deep Dives", description: "The cases that keep you up at 3am reading Reddit threads.", type: "keyword", with_keywords: "33722", sort_by: "popularity.desc" },
  { title: "Post-Apocalyptic & Dystopian", description: "Civilization ended, but the drama didn't.", type: "keyword", with_keywords: "4565|359337", sort_by: "popularity.desc" },
  { title: "Spy & Espionage", description: "Double agents, double crosses, and very tense passport control.", type: "keyword", with_keywords: "470|5265", sort_by: "popularity.desc" },
  { title: "Legal & Medical Drama", description: "Objections, diagnoses, and very attractive professionals.", type: "keyword", with_keywords: "10909|258786", sort_by: "popularity.desc" },
  { title: "Superhero & Comic Adaptations", description: "Capes optional, gravitas mandatory.", type: "keyword", with_keywords: "9715|9717", sort_by: "popularity.desc" },
  { title: "Based on Books", description: "The source material was better. Usually.", type: "keyword", with_keywords: "818", sort_by: "popularity.desc" },
  { title: "Dark Comedy", description: "Laughing through the discomfort.", type: "keyword", with_keywords: "10123", sort_by: "popularity.desc" },
  { title: "Music & Musicians", description: "Behind the music, on the screen.", type: "keyword", with_keywords: "283297", sort_by: "popularity.desc" },
  { title: "Sports Drama", description: "The thrill of victory, the agony of the timeout.", type: "keyword", with_keywords: "333328", sort_by: "popularity.desc" },
  { title: "Slow Burn Dramas", description: "Patience required. Payoff guaranteed.", type: "keyword", with_keywords: "277551", sort_by: "popularity.desc", fallbackToGenre: "18" },

  // === ORIGIN-FILTERED (2) ===
  { title: "Anime Essentials", description: "The Japanese animation canon, no filler included.", type: "origin", with_origin_country: "JP", with_genres: "16", sort_by: "popularity.desc" },
  { title: "K-Drama Obsessions", description: "Squid Game was just the beginning.", type: "origin", with_origin_country: "KR", sort_by: "popularity.desc" },

  // === DATA-DRIVEN (1) ===
  { title: "Binge in a Weekend", description: "Short, punchy, and dangerously finishable.", type: "data", with_type: "2", sort_by: "popularity.desc", vote_count_gte: "50" },

  // === HAND-CURATED (4) ===
  { title: "Emmy & Award Winners", description: "The shows that took home the hardware.", type: "curated", searchQueries: ["Breaking Bad", "Game of Thrones", "The Crown", "Succession", "The Sopranos", "Mad Men", "Schitt's Creek", "The Handmaid's Tale", "Chernobyl", "The Queen's Gambit", "Fargo", "Better Call Saul", "The Wire", "Ted Lasso", "The Marvelous Mrs Maisel", "Veep", "Ozark", "The Morning Show", "House of the Dragon", "Shogun", "The Bear", "Beef", "The West Wing", "Saturday Night Live", "RuPauls Drag Race"] },
  { title: "Underrated Gems", description: "Cult favorites and critical darlings you probably missed.", type: "curated", searchQueries: ["The Leftovers", "Halt and Catch Fire", "The Americans", "Mr Robot", "Patriot", "The Knick", "Rectify", "The Expanse", "Station Eleven", "Barry", "Atlanta", "Better Things", "The Good Fight", "Dark", "Babylon Berlin", "The Terror", "Lodge 49", "Devs", "Legion", "Man Seeking Woman", "Baskets", "Youre the Worst", "Casual", "Togetherness"] },
  { title: "Shows That Ended Too Soon", description: "Gone before their time, mourned by the few who watched.", type: "curated", searchQueries: ["Firefly", "Deadwood", "Freaks and Geeks", "My So-Called Life", "Pushing Daisies", "Hannibal", "Mindhunter", "Santa Clarita Diet", "The Society", "I Am Not Okay With This", "Agent Carter", "Happy Endings", "Enlisted", "Bunheads", "Terriers", "Better Off Ted", "Party Down", "Dead Like Me", "Wonderfalls", "Almost Human", "The Finder", "The OA", "Constantine", "Hell on Wheels", "Damages"] },
  { title: "Prestige Limited Series", description: "One season, one story, zero filler.", type: "curated", searchQueries: ["Chernobyl", "The Queen's Gambit", "The Night Of", "Olive Kitteridge", "Band of Brothers", "The Pacific", "John Adams", "The White Lotus", "Mare of Easttown", "Sharp Objects", "The North Water", "The Serpent", "Small Axe", "I May Destroy You", "The Underground Railroad", "Station Eleven", "The Patient", "The Staircase", "Under the Banner of Heaven", "The Sympathizer", "Lessons in Chemistry", "All the Light We Cannot See", "A Murder at the End of the World", "Ripley", "The Gilded Age"] },
];

async function tmdbGet(endpoint: string, params: Record<string, string> = {}): Promise<any> {
  const url = new URL(TMDB_BASE + endpoint);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url, { headers: { Authorization: `Bearer ${TMDB_TOKEN}` } });
  if (!res.ok) throw new Error(`TMDB ${res.status}: ${endpoint}`);
  return res.json();
}

async function fetchShowsForList(config: ListConfig): Promise<Show[]> {
  const shows: Show[] = [];
  const seen = new Set<number>();

  if (config.type === "curated" && config.searchQueries) {
    for (const q of config.searchQueries) {
      try {
        const data = await tmdbGet("/search/tv", { query: q, page: "1" });
        if (data.results && data.results.length > 0) {
          const r = data.results[0];
          if (r.id && !seen.has(r.id)) {
            seen.add(r.id);
            shows.push({
              id: r.id, name: r.name || r.original_name || q,
              poster_path: r.poster_path ?? null,
              first_air_date: r.first_air_date || "",
              vote_average: r.vote_average || 0, vote_count: r.vote_count || 0,
            });
          }
        }
      } catch { /* skip failed search */ }
    }
    return shows;
  }

  // Genre / keyword / origin / data — use discover endpoint
  const params: Record<string, string> = { sort_by: config.sort_by || "popularity.desc", page: "1" };
  if (config.with_genres) params.with_genres = config.with_genres;
  if (config.with_keywords) params.with_keywords = config.with_keywords;
  if (config.with_origin_country) params.with_origin_country = config.with_origin_country;
  if (config.with_type) params.with_type = config.with_type;
  if (config.vote_count_gte) params["vote_count.gte"] = config.vote_count_gte;
  else params["vote_count.gte"] = "10";

  const data = await tmdbGet("/discover/tv", params);
  if (data.results) {
    for (const r of data.results) {
      if (r.id && !seen.has(r.id)) {
        seen.add(r.id);
        shows.push({
          id: r.id, name: r.name || r.original_name || "Unknown",
          poster_path: r.poster_path ?? null,
          first_air_date: r.first_air_date || "",
          vote_average: r.vote_average || 0, vote_count: r.vote_count || 0,
        });
      }
    }
  }

  // Fallback for slow burn if too few results
  if (config.fallbackToGenre && shows.length < 10) {
    const fbParams: Record<string, string> = {
      with_genres: config.fallbackToGenre, sort_by: "vote_average.desc",
      "vote_count.gte": "500", page: "1",
    };
    const fbData = await tmdbGet("/discover/tv", fbParams);
    shows.length = 0;
    seen.clear();
    if (fbData.results) {
      for (const r of fbData.results) {
        if (r.id && !seen.has(r.id)) {
          seen.add(r.id);
          shows.push({
            id: r.id, name: r.name || r.original_name || "Unknown",
            poster_path: r.poster_path ?? null,
            first_air_date: r.first_air_date || "",
            vote_average: r.vote_average || 0, vote_count: r.vote_count || 0,
          });
        }
      }
    }
  }

  return shows.slice(0, 25);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Delete existing editorial lists (cascade removes list_items)
    const { error: delError } = await supabase.from("lists").delete().eq("is_editorial", true);
    if (delError) console.error("Delete error:", delError.message);

    const results: { title: string; count: number; status: string; error?: string }[] = [];

    for (const config of LISTS) {
      try {
        const shows = await fetchShowsForList(config);
        if (shows.length === 0) {
          results.push({ title: config.title, count: 0, status: "no_shows" });
          continue;
        }

        const { data: list, error: listErr } = await supabase.from("lists").insert({
          title: config.title, description: config.description,
          is_editorial: true, user_id: null, is_public: true,
        }).select().single();

        if (listErr) throw listErr;

        const items = shows.map((show, i) => ({
          list_id: list.id, show_id: show.id, show_name: show.name,
          show_poster_path: show.poster_path,
          show_first_air_date: show.first_air_date,
          position: i,
        }));

        const { error: itemsErr } = await supabase.from("list_items").insert(items);
        if (itemsErr) throw itemsErr;

        results.push({ title: config.title, count: shows.length, status: "ok" });
      } catch (err) {
        results.push({ title: config.title, count: 0, status: "error", error: err.message });
      }
    }

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
