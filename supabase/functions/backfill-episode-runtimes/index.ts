import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const TMDB_BASE = "https://api.themoviedb.org/3";
const TMDB_TOKEN = Deno.env.get("TMDB_READ_TOKEN") ?? Deno.env.get("TMDB_API_KEY");

interface UserEpisodeRow {
  id: string;
  show_id: number;
  season_number: number;
  episode_number: number;
}

interface TMDBEpisode {
  episode_number: number;
  season_number: number;
  runtime: number | null;
}

interface TMDBSeasonDetail {
  episodes: TMDBEpisode[];
}

interface TMDBShowDetail {
  episode_run_time: number[];
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    // 1. Fetch all distinct (show_id, season_number, episode_number) where runtime_minutes is null
    const { data: nullRows, error: fetchErr } = await supabase
      .from("user_episodes")
      .select("id, show_id, season_number, episode_number")
      .is("runtime_minutes", null);

    if (fetchErr) {
      return new Response(
        JSON.stringify({ error: "Failed to fetch episodes needing backfill", details: fetchErr.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!nullRows || nullRows.length === 0) {
      return new Response(
        JSON.stringify({ message: "No episodes need backfill", updated: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Group by show_id for efficient season fetching
    const byShow = new Map<number, UserEpisodeRow[]>();
    for (const row of nullRows as UserEpisodeRow[]) {
      const arr = byShow.get(row.show_id) ?? [];
      arr.push(row);
      byShow.set(row.show_id, arr);
    }

    let updated = 0;
    const errors: string[] = [];

    // 2. For each show, fetch show detail (for fallback episode_run_time) and each needed season
    for (const [showId, rows] of byShow) {
      try {
        if (!TMDB_TOKEN) {
          errors.push(`No TMDB credentials for show ${showId}`);
          continue;
        }

        // Fetch show detail for episode_run_time fallback
        const showRes = await fetch(`${TMDB_BASE}/tv/${showId}`, {
          headers: TMDB_TOKEN.length > 50
            ? { Authorization: `Bearer ${TMDB_TOKEN}` }
            : {},
        });
        if (!showRes.ok) {
          errors.push(`Show ${showId}: TMDB ${showRes.status}`);
          continue;
        }
        const showDetail = (await showRes.json()) as TMDBShowDetail;
        const fallbackRuntime = showDetail.episode_run_time?.[0] ?? null;

        // Collect unique season numbers for this show
        const seasonNumbers = [...new Set(rows.map((r) => r.season_number))];

        // Build a lookup map: "season-episode" -> runtime
        const runtimeMap = new Map<string, number | null>();

        for (const seasonNum of seasonNumbers) {
          const seasonRes = await fetch(
            `${TMDB_BASE}/tv/${showId}/season/${seasonNum}`,
            {
              headers: TMDB_TOKEN.length > 50
                ? { Authorization: `Bearer ${TMDB_TOKEN}` }
                : {},
            }
          );
          if (!seasonRes.ok) {
            errors.push(`Show ${showId} season ${seasonNum}: TMDB ${seasonRes.status}`);
            continue;
          }
          const seasonDetail = (await seasonRes.json()) as TMDBSeasonDetail;
          for (const ep of seasonDetail.episodes ?? []) {
            runtimeMap.set(
              `${ep.season_number}-${ep.episode_number}`,
              ep.runtime && ep.runtime > 0 ? ep.runtime : fallbackRuntime
            );
          }
        }

        // 3. Update each row with its runtime
        for (const row of rows) {
          const runtime = runtimeMap.get(`${row.season_number}-${row.episode_number}`) ?? null;
          if (runtime && runtime > 0) {
            const { error: updateErr } = await supabase
              .from("user_episodes")
              .update({ runtime_minutes: runtime })
              .eq("id", row.id);
            if (updateErr) {
              errors.push(`Row ${row.id}: ${updateErr.message}`);
            } else {
              updated++;
            }
          }
          // If still null, leave it — the Stats page falls back to a default
        }
      } catch (err) {
        errors.push(`Show ${showId}: ${String(err)}`);
      }
    }

    return new Response(
      JSON.stringify({
        message: "Backfill complete",
        updated,
        totalNeeded: nullRows.length,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
