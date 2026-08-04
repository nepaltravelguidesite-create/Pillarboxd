import { useEffect, useMemo, useState } from "react";
// (useMemo is used inside the component + PageNumbers below)
import { useSearchParams } from "react-router-dom";
import { Loader2, Tv, ChevronLeft, ChevronRight } from "lucide-react";
import { useDiscoverShows, useAiringTodayShows } from "@/hooks/use-tmdb";
import { getTVGenres, type Genre } from "@/lib/tmdb";
import { ShowPosterCard } from "@/components/shows/ShowPosterCard";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { SEOMeta } from "@/components/SEOMeta";

// ---------------------------------------------------------------------------
// Sort options — mapped to TMDB sort_by values (or a dedicated endpoint)
// ---------------------------------------------------------------------------

type SortKey = "popular" | "top_rated" | "newest" | "airing_today";

interface SortOption {
  key: SortKey;
  label: string;
}

const SORT_OPTIONS: SortOption[] = [
  { key: "popular", label: "Popular" },
  { key: "top_rated", label: "Top Rated" },
  { key: "newest", label: "Newest" },
  { key: "airing_today", label: "Airing Today" },
];

/**
 * Maps a SortKey to the TMDB `sort_by` query value.
 * `airing_today` is special-cased — it uses a dedicated endpoint, not discover.
 */
const SORT_BY: Record<Exclude<SortKey, "airing_today">, string> = {
  popular: "popularity.desc",
  top_rated: "vote_average.desc",
  newest: "first_air_date.desc",
};

// ---------------------------------------------------------------------------
// Year options — 2024 down to 1990
// ---------------------------------------------------------------------------

const CURRENT_YEAR = new Date().getFullYear();
const YEARS: number[] = Array.from(
  { length: CURRENT_YEAR - 1990 + 1 },
  (_, i) => CURRENT_YEAR - i
);

// ---------------------------------------------------------------------------
// Helpers — parse + clamp URL params
// ---------------------------------------------------------------------------

function parsePage(value: string | null): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.floor(n);
}

// ---------------------------------------------------------------------------
// BrowsePage
// ---------------------------------------------------------------------------

export default function BrowsePage() {
  const [searchParams, setSearchParams] = useSearchParams();

  // --- Filter state, sourced from URL params -------------------------------
  const genreId = searchParams.get("genre") ?? ""; // "" = all genres
  const sortKey = (searchParams.get("sort") as SortKey) ?? "popular";
  const year = searchParams.get("year") ?? "";
  const page = parsePage(searchParams.get("page"));

  // --- Genres (fetched once) ----------------------------------------------
  const [genres, setGenres] = useState<Genre[]>([]);
  const [genresLoading, setGenresLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getTVGenres()
      .then((res) => {
        if (!active) return;
        setGenres(res.genres ?? []);
      })
      .catch(() => {
        if (!active) return;
        setGenres([]);
      })
      .finally(() => {
        if (!active) return;
        setGenresLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  // --- Data fetch ----------------------------------------------------------
  // `airing_today` uses the dedicated endpoint; everything else uses discover.
  const isAiringToday = sortKey === "airing_today";

  const discoverParams = useMemo(
    () => ({
      page,
      sort_by: SORT_BY[sortKey as Exclude<SortKey, "airing_today">] ?? "popularity.desc",
      ...(genreId ? { with_genres: genreId } : {}),
      ...(year ? { first_air_date_year: Number(year) } : {}),
      ...(sortKey === "top_rated" ? { "vote_count.gte": 200 } : {}),
    }),
    [page, sortKey, genreId, year]
  );

  const discoverState = useDiscoverShows(discoverParams);
  const airingState = useAiringTodayShows(page);

  const { data, loading, error } = isAiringToday ? airingState : discoverState;

  // --- Reset to page 1 when filters change ---------------------------------
  // We keep `page` in the URL, so when genre/sort/year changes we drop page.
  function updateFilter(key: string, value: string) {
    const next = new URLSearchParams(searchParams);
    if (value) {
      next.set(key, value);
    } else {
      next.delete(key);
    }
    // Any filter change resets pagination — unless we're changing the page itself.
    if (key !== "page") {
      next.delete("page");
    }
    setSearchParams(next, { replace: false });
  }

  // --- Pagination bounds ---------------------------------------------------
  const totalPages = data?.total_pages ? Math.min(data.total_pages, 500) : 1; // TMDB caps at 500
  const currentPage = Math.min(page, totalPages);
  const canPrev = currentPage > 1;
  const canNext = currentPage < totalPages;

  function goToPage(p: number) {
    const clamped = Math.max(1, Math.min(p, totalPages));
    updateFilter("page", String(clamped));
    // Scroll to top of the browse grid on page change.
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  // --- Derived list --------------------------------------------------------
  const shows = data?.results ?? [];
  const isEmpty = !loading && !error && shows.length === 0;

  return (
    <>
    <SEOMeta title="Discover Shows" />
    <div className="min-h-screen bg-background text-foreground pb-page-enter">
      <div className="mx-auto max-w-[1600px] px-4 py-8 sm:px-6 lg:px-8">
        {/* ---------------------------------------------------------------- */}
        {/* Header                                                           */}
        {/* ---------------------------------------------------------------- */}
        <header className="mb-8">
          <h1 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            Browse Shows
          </h1>
          <p className="mt-2 text-sm text-muted-foreground sm:text-base">
            Discover TV series across genres, years, and what's trending now.
          </p>
        </header>

        {/* ---------------------------------------------------------------- */}
        {/* Filter bar                                                       */}
        {/* ---------------------------------------------------------------- */}
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          {/* Genre dropdown */}
          <div className="flex flex-col gap-1">
            <label
              htmlFor="browse-genre"
              className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground"
            >
              Genre
            </label>
            <select
              id="browse-genre"
              value={genreId}
              onChange={(e) => updateFilter("genre", e.target.value)}
              disabled={genresLoading}
              className={cn(
                "h-10 min-w-[10rem] rounded-md border border-border bg-muted/40 px-3 text-sm text-foreground",
                "focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary",
                "disabled:cursor-not-allowed disabled:opacity-50",
                genreId && "border-primary/60 text-primary"
              )}
            >
              <option value="">All Genres</option>
              {genres.map((g) => (
                <option key={g.id} value={String(g.id)}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>

          {/* Year dropdown */}
          <div className="flex flex-col gap-1">
            <label
              htmlFor="browse-year"
              className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground"
            >
              Year
            </label>
            <select
              id="browse-year"
              value={year}
              onChange={(e) => updateFilter("year", e.target.value)}
              className={cn(
                "h-10 min-w-[8rem] rounded-md border border-border bg-muted/40 px-3 text-sm text-foreground",
                "focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary",
                year && "border-primary/60 text-primary"
              )}
            >
              <option value="">All Years</option>
              {YEARS.map((y) => (
                <option key={y} value={String(y)}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          {/* Sort dropdown */}
          <div className="flex flex-col gap-1">
            <label
              htmlFor="browse-sort"
              className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground"
            >
              Sort
            </label>
            <select
              id="browse-sort"
              value={sortKey}
              onChange={(e) => updateFilter("sort", e.target.value)}
              className={cn(
                "h-10 min-w-[10rem] rounded-md border border-border bg-muted/40 px-3 text-sm text-foreground",
                "focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary",
                sortKey !== "popular" && "border-primary/60 text-primary"
              )}
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.key} value={o.key}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          {/* Active-filter hint + clear */}
          {(genreId || year || sortKey !== "popular") && (
            <button
              type="button"
              onClick={() => {
                const next = new URLSearchParams();
                setSearchParams(next, { replace: false });
              }}
              className={cn(
                "mt-1 h-10 self-start rounded-md border border-border/60 bg-transparent px-3 text-xs font-medium text-muted-foreground",
                "transition-colors hover:border-primary/60 hover:text-primary sm:mt-auto"
              )}
            >
              Clear filters
            </button>
          )}
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Status: loading / error / empty                                   */}
        {/* ---------------------------------------------------------------- */}
        {loading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin text-primary" />
            <span>Loading shows…</span>
          </div>
        )}

        {error && !loading && (
          <div className="rounded-md border border-border/60 bg-muted/30 p-4 text-sm text-muted-foreground">
            Couldn't load shows: {error}
          </div>
        )}

        {isEmpty && (
          <div className="flex flex-col items-center justify-center gap-3 rounded-md border border-border/40 bg-muted/20 py-16 text-center">
            <Tv className="size-10 text-muted-foreground/50" strokeWidth={1.5} />
            <p className="text-sm font-medium text-foreground">No shows found</p>
            <p className="max-w-xs text-xs text-muted-foreground">
              Try removing some filters or choosing a different sort option.
            </p>
          </div>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* Grid                                                             */}
        {/* ---------------------------------------------------------------- */}
        {!loading && !error && shows.length > 0 && (
          <div
            className={cn(
              "grid grid-cols-3 gap-3 sm:grid-cols-4 sm:gap-4",
              "md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7"
            )}
          >
            {shows.map((show) => (
              <ShowPosterCard key={show.id} show={show} size="md" />
            ))}
          </div>
        )}

        {/* Skeleton grid while loading (rendered alongside the loader chip) */}
        {loading && (
          <div
            className={cn(
              "grid grid-cols-3 gap-3 sm:grid-cols-4 sm:gap-4",
              "md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7"
            )}
          >
            {Array.from({ length: 18 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-1.5">
                <Skeleton className="aspect-poster w-full rounded-lg" />
                <Skeleton className="h-3 w-3/4 rounded" />
                <Skeleton className="h-2.5 w-1/2 rounded" />
              </div>
            ))}
          </div>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* Pagination                                                       */}
        {/* ---------------------------------------------------------------- */}
        {!loading && !error && totalPages > 1 && (
          <nav
            className="mt-10 flex items-center justify-center gap-2 sm:gap-3"
            aria-label="Pagination"
          >
            {/* Prev */}
            <button
              type="button"
              onClick={() => goToPage(currentPage - 1)}
              disabled={!canPrev}
              className={cn(
                "flex h-9 items-center gap-1 rounded-md border border-border bg-muted/40 px-3 text-sm font-medium text-foreground",
                "transition-colors hover:border-primary/60 hover:text-primary",
                "disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-border disabled:hover:text-foreground"
              )}
            >
              <ChevronLeft className="size-4" />
              <span className="hidden sm:inline">Prev</span>
            </button>

            {/* Page indicator — compact window around current page */}
            <PageNumbers
              currentPage={currentPage}
              totalPages={totalPages}
              onGo={goToPage}
            />

            {/* Next */}
            <button
              type="button"
              onClick={() => goToPage(currentPage + 1)}
              disabled={!canNext}
              className={cn(
                "flex h-9 items-center gap-1 rounded-md border border-border bg-muted/40 px-3 text-sm font-medium text-foreground",
                "transition-colors hover:border-primary/60 hover:text-primary",
                "disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-border disabled:hover:text-foreground"
              )}
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight className="size-4" />
            </button>
          </nav>
        )}

        {/* Page meta */}
        {!loading && !error && data && (
          <p className="mt-4 text-center text-xs text-muted-foreground">
            Page {currentPage} of {totalPages}
            {data.total_results ? ` · ${data.total_results.toLocaleString()} shows` : ""}
          </p>
        )}
      </div>
    </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// PageNumbers — compact, ellipsized page-number strip
// ---------------------------------------------------------------------------

interface PageNumbersProps {
  currentPage: number;
  totalPages: number;
  onGo: (p: number) => void;
}

function PageNumbers({ currentPage, totalPages, onGo }: PageNumbersProps) {
  // Build a window: first, last, and a range around the current page.
  const pages = useMemo(() => {
    const set = new Set<number>();
    set.add(1);
    set.add(totalPages);
    const span = 1; // pages either side of current
    for (let p = currentPage - span; p <= currentPage + span; p++) {
      if (p >= 1 && p <= totalPages) set.add(p);
    }
    const sorted = Array.from(set).sort((a, b) => a - b);
    // Insert "gap" markers (0) where there's a jump > 1.
    const out: number[] = [];
    for (let i = 0; i < sorted.length; i++) {
      if (i > 0 && sorted[i] - sorted[i - 1] > 1) out.push(0); // 0 == ellipsis
      out.push(sorted[i]);
    }
    return out;
  }, [currentPage, totalPages]);

  return (
    <div className="flex items-center gap-1">
      {pages.map((p, i) =>
        p === 0 ? (
          <span
            key={`gap-${i}`}
            className="px-1 text-sm text-muted-foreground"
            aria-hidden
          >
            …
          </span>
        ) : (
          <button
            key={p}
            type="button"
            onClick={() => onGo(p)}
            aria-current={p === currentPage ? "page" : undefined}
            className={cn(
              "h-9 min-w-9 rounded-md border px-2 text-sm font-medium tabular-nums",
              "transition-colors",
              p === currentPage
                ? "border-primary bg-primary text-background"
                : "border-border bg-muted/40 text-foreground hover:border-primary/60 hover:text-primary"
            )}
          >
            {p}
          </button>
        )
      )}
    </div>
  );
}
