import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Calendar, Tv } from "lucide-react";
import {
  getOnTheAirShows,
  getPopularShows,
  getShowDetail,
  bestPosterUrl,
  type TVShowDetail,
  type Episode,
} from "@/lib/tmdb";
import { useUserData } from "@/context/UserDataContext";
import { useSocial } from "@/context/SocialContext";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { SEOMeta } from "@/components/SEOMeta";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ShowDetailWithEpisodes extends TVShowDetail {
  next_episode_to_air?: Episode | null;
  last_episode_to_air?: Episode | null;
}

interface ScheduleEntry {
  showId: number;
  showName: string;
  posterPath: string | null;
  firstAirDate: string | null;
  episode: Episode;
  numberOfSeasons: number;
}

type Tab = "released" | "upcoming";

// ---------------------------------------------------------------------------
// Module-level cache - keyed by show ID, expires after 10 minutes
// ---------------------------------------------------------------------------

const CACHE_TTL_MS = 10 * 60 * 1000;

interface CachedDetail {
  detail: ShowDetailWithEpisodes;
  ts: number;
}

const detailCache = new Map<number, CachedDetail>();

async function fetchDetailCached(id: number): Promise<ShowDetailWithEpisodes> {
  const cached = detailCache.get(id);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return cached.detail;
  }
  const detail = (await getShowDetail(id)) as ShowDetailWithEpisodes;
  detailCache.set(id, { detail, ts: Date.now() });
  return detail;
}

// IDs of the pool shows (on_the_air + popular), cached for the session
let poolCache: { ids: number[]; ts: number } | null = null;

async function fetchPoolIds(): Promise<number[]> {
  if (poolCache && Date.now() - poolCache.ts < CACHE_TTL_MS) {
    return poolCache.ids;
  }
  const [onAir, popular] = await Promise.all([
    getOnTheAirShows(1),
    getPopularShows(1),
  ]);
  const ids = Array.from(
    new Set([
      ...(onAir.results ?? []).map((s) => s.id),
      ...(popular.results ?? []).map((s) => s.id),
    ]),
  );
  poolCache = { ids, ts: Date.now() };
  return ids;
}

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------

function formatDateHeading(isoDate: string): string {
  const d = new Date(isoDate + "T00:00:00");
  const day = d.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase();
  const date = d.getDate();
  const month = d.toLocaleDateString("en-US", { month: "short" }).toUpperCase();
  return `${day} ${date} ${month}`;
}

function isWithinPastDays(isoDate: string, days: number): boolean {
  const d = new Date(isoDate + "T00:00:00");
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - days);
  return d >= cutoff && d <= now;
}

function isWithinFutureDays(isoDate: string, days: number): boolean {
  const d = new Date(isoDate + "T00:00:00");
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() + days);
  return d > now && d <= cutoff;
}

// ---------------------------------------------------------------------------
// Episode label
// ---------------------------------------------------------------------------

function episodeLabel(entry: ScheduleEntry): string {
  const { episode, numberOfSeasons } = entry;
  if (episode.season_number === 1 && episode.episode_number === 1) {
    return "New Show";
  }
  if (episode.episode_number === 1) {
    // Premiering a new season - "New Season" if it's the latest
    if (episode.season_number === numberOfSeasons) {
      return "New Season";
    }
    return `Season ${episode.season_number}`;
  }
  return `Episode ${episode.episode_number}`;
}

// ---------------------------------------------------------------------------
// Group entries by air date
// ---------------------------------------------------------------------------

function groupByDate(
  entries: ScheduleEntry[],
  tab: Tab,
): { date: string; entries: ScheduleEntry[] }[] {
  const map = new Map<string, ScheduleEntry[]>();
  for (const entry of entries) {
    const key = entry.episode.air_date;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(entry);
  }

  const sorted = Array.from(map.entries()).sort(([a], [b]) => {
    const diff = new Date(a).getTime() - new Date(b).getTime();
    return tab === "upcoming" ? diff : -diff;
  });

  return sorted.map(([date, entries]) => ({ date, entries }));
}

// ---------------------------------------------------------------------------
// Schedule card
// ---------------------------------------------------------------------------

function ScheduleCard({ entry }: { entry: ScheduleEntry }) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);
  const label = episodeLabel(entry);
  const isHighlight = label === "New Show" || label === "New Season";

  return (
    <Link
      to={`/show/${entry.showId}`}
      className="group flex flex-col gap-1.5 focus:outline-none focus:ring-2 focus:ring-ring/40 rounded-lg"
    >
      {/* Poster */}
      <div className="relative overflow-hidden rounded-lg bg-muted aspect-[2/3]">
        {!imgLoaded && !imgError && (
          <Skeleton className="absolute inset-0 rounded-lg" />
        )}
        {imgError ? (
          <div className="absolute inset-0 flex items-center justify-center bg-secondary/40">
            <Tv className="size-6 text-muted-foreground/40" strokeWidth={1.5} />
          </div>
        ) : (
          <img
            src={bestPosterUrl(
              { id: entry.showId, poster_path: entry.posterPath },
              "w342",
            )}
            alt={entry.showName}
            loading="lazy"
            onLoad={() => setImgLoaded(true)}
            onError={() => setImgError(true)}
            className={cn(
              "absolute inset-0 w-full h-full object-cover",
              "transition-all duration-500 group-hover:scale-[1.04]",
              imgLoaded ? "opacity-100" : "opacity-0",
            )}
          />
        )}
        {/* Highlight badge */}
        {isHighlight && (
          <div className="absolute top-1.5 left-1.5 z-10">
            <span className="inline-flex items-center rounded-full bg-primary/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-foreground backdrop-blur-sm">
              {label}
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="min-w-0">
        <p className="text-xs font-bold text-foreground truncate leading-tight group-hover:text-primary transition-colors">
          {entry.showName}
        </p>
        <p className="text-[11px] text-muted-foreground truncate leading-tight mt-0.5">
          {isHighlight
            ? entry.episode.name ||
              `S${entry.episode.season_number}E${entry.episode.episode_number}`
            : `S${entry.episode.season_number}E${entry.episode.episode_number}${entry.episode.name ? ` · ${entry.episode.name}` : ""}`}
        </p>
      </div>
    </Link>
  );
}

// ---------------------------------------------------------------------------
// ScheduleCardSkeleton
// ---------------------------------------------------------------------------

function ScheduleCardSkeleton() {
  return (
    <div className="flex flex-col gap-1.5">
      <Skeleton className="aspect-[2/3] rounded-lg w-full" />
      <Skeleton className="h-3 w-3/4 rounded" />
      <Skeleton className="h-2.5 w-1/2 rounded" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// DateSection
// ---------------------------------------------------------------------------

function DateSection({
  date,
  entries,
}: {
  date: string;
  entries: ScheduleEntry[];
}) {
  return (
    <div className="space-y-3">
      {/* Date heading */}
      <div className="flex items-baseline gap-3">
        <h2 className="font-display text-sm font-black uppercase tracking-widest text-muted-foreground">
          {formatDateHeading(date)}
        </h2>
        <div className="flex-1 h-px bg-border/40" />
      </div>
      {/* Card grid */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-3 sm:gap-4">
        {entries.map((entry) => (
          <ScheduleCard
            key={`${entry.showId}-${entry.episode.season_number}-${entry.episode.episode_number}`}
            entry={entry}
          />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab button
// ---------------------------------------------------------------------------

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-full transition-all duration-150",
        active
          ? "bg-primary/15 text-primary"
          : "text-muted-foreground hover:text-foreground hover:bg-secondary/50",
      )}
    >
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Main SchedulePage
// ---------------------------------------------------------------------------

export function SchedulePage() {
  const [tab, setTab] = useState<Tab>("upcoming");
  const [entries, setEntries] = useState<ScheduleEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const { userShows } = useUserData();
  const { userEpisodes } = useSocial();
  const cancelledRef = useRef(false);

  useEffect(() => {
    cancelledRef.current = false;
    setLoading(true);
    setEntries([]);

    (async () => {
      try {
        // 1. Build the pool of show IDs
        const globalIds = await fetchPoolIds();
        if (cancelledRef.current) return;

        const episodeShowIds = new Set(userEpisodes.map((e) => e.show_id));
        const watchlistShowIds = new Set(
          userShows
            .filter((s) => s.watchlisted || s.status)
            .map((s) => s.show_id),
        );
        const userShowIds = new Set([...episodeShowIds, ...watchlistShowIds]);
        const allIds = Array.from(
          new Set([...globalIds, ...Array.from(userShowIds)]),
        );

        // 2. Fetch details for all shows (cached)
        const details = await Promise.all(
          allIds.map((id) => fetchDetailCached(id)),
        );
        if (cancelledRef.current) return;

        // 3. Flatten into schedule entries
        const collected: ScheduleEntry[] = [];

        for (const detail of details) {
          const numberOfSeasons = detail.number_of_seasons ?? 1;

          // Released: last_episode_to_air within past 30 days
          const last = detail.last_episode_to_air;
          if (last?.air_date && isWithinPastDays(last.air_date, 30)) {
            collected.push({
              showId: detail.id,
              showName: detail.name,
              posterPath: detail.poster_path,
              firstAirDate: detail.first_air_date || null,
              episode: last,
              numberOfSeasons,
            });
          }

          // Upcoming: next_episode_to_air within next 60 days
          const next = detail.next_episode_to_air;
          if (next?.air_date && isWithinFutureDays(next.air_date, 60)) {
            collected.push({
              showId: detail.id,
              showName: detail.name,
              posterPath: detail.poster_path,
              firstAirDate: detail.first_air_date || null,
              episode: next,
              numberOfSeasons,
            });
          }
        }

        if (!cancelledRef.current) {
          setEntries(collected);
          setLoading(false);
        }
      } catch (err) {
        console.error("[SchedulePage] Failed to load:", err);
        if (!cancelledRef.current) {
          setEntries([]);
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelledRef.current = true;
    };
    // Only re-run when user show data changes - don't re-fetch on every render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userShows.length, userEpisodes.length]);

  // Filter entries for current tab
  const filtered = entries.filter((e) => {
    const d = new Date(e.episode.air_date + "T00:00:00");
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return tab === "upcoming" ? d > now : d <= now;
  });

  const grouped = groupByDate(filtered, tab);

  return (
    <>
      <SEOMeta title="Schedule" />
      <div className="min-h-screen">
        {/* Page header */}
        <div className="px-4 sm:px-6 lg:px-8 max-w-screen-xl mx-auto pt-6 pb-4">
          <div className="flex items-center gap-3 mb-5">
            <div className="flex items-center justify-center size-9 rounded-xl bg-primary/10 text-primary">
              <Calendar className="size-5" strokeWidth={2} />
            </div>
            <div>
              <h1 className="font-display text-2xl font-black tracking-tight text-foreground">
                Schedule
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                What's airing now and coming up next
              </p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1">
            <TabButton
              active={tab === "upcoming"}
              onClick={() => setTab("upcoming")}
            >
              <span className="relative flex size-2">
                {tab === "upcoming" && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                )}
                <span
                  className={cn(
                    "relative inline-flex rounded-full size-2",
                    tab === "upcoming"
                      ? "bg-primary"
                      : "bg-muted-foreground/40",
                  )}
                />
              </span>
              Upcoming
            </TabButton>
            <TabButton
              active={tab === "released"}
              onClick={() => setTab("released")}
            >
              Released
            </TabButton>
          </div>
        </div>

        {/* Content */}
        <div className="px-4 sm:px-6 lg:px-8 max-w-screen-xl mx-auto pb-16 space-y-8">
          {loading ? (
            <>
              {[0, 1, 2].map((gi) => (
                <div key={gi} className="space-y-3">
                  <div className="flex items-baseline gap-3">
                    <Skeleton className="h-4 w-24 rounded" />
                    <div className="flex-1 h-px bg-border/40" />
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-3 sm:gap-4">
                    {Array.from({
                      length: gi === 0 ? 5 : gi === 1 ? 3 : 4,
                    }).map((_, i) => (
                      <ScheduleCardSkeleton key={i} />
                    ))}
                  </div>
                </div>
              ))}
            </>
          ) : grouped.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="flex items-center justify-center size-16 rounded-full bg-muted text-muted-foreground mb-4">
                <Calendar className="size-7" strokeWidth={1.5} />
              </div>
              <p className="font-display text-lg font-bold text-foreground">
                {tab === "upcoming"
                  ? "Nothing upcoming right now"
                  : "No recent releases found"}
              </p>
              <p className="text-sm text-muted-foreground mt-2 max-w-xs">
                {tab === "upcoming"
                  ? "Add shows to your watchlist and they'll show up here when new episodes are scheduled."
                  : "Check back after episodes start airing."}
              </p>
            </div>
          ) : (
            grouped.map(({ date, entries: dateEntries }) => (
              <DateSection key={date} date={date} entries={dateEntries} />
            ))
          )}
        </div>
      </div>
    </>
  );
}

export default SchedulePage;
