import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { AftershowLogo } from "@/components/brand/AftershowLogo";
import { SEOMeta } from "@/components/SEOMeta";
import { useUserData } from "@/context/UserDataContext";
import { useSocial } from "@/context/SocialContext";
import { useAuth } from "@/context/AuthContext";
import { useUI } from "@/context/UIContext";
import { BarChart3, Clock, Tv, CheckCircle2, Sparkles } from "lucide-react";
import { SubscriptionInsight } from "@/components/shows/SubscriptionInsight";

// ---------------------------------------------------------------------------
// StatsPage — /profile/stats route
// Comprehensive stats dashboard: summary cards, genre breakdown donut,
// ratings distribution histogram, and a shareable Year in Review card.
// ---------------------------------------------------------------------------

const REVIEW_YEAR = 2026;
const MINUTES_PER_EPISODE = 45;

// Deterministic mock genre assignment — same show always maps to the same
// genre so the breakdown is stable across renders. We have no real genre data
// in user_episodes/user_logs, so this is purely illustrative for the demo.
const MOCK_GENRES = [
  "Drama",
  "Comedy",
  "Thriller",
  "Sci-Fi",
  "Documentary",
] as const;

const GENRE_COLORS = [
  "var(--chart-1)", // coral
  "var(--chart-2)", // blue
  "var(--chart-3)", // purple
  "var(--chart-4)", // violet
  "var(--chart-5)", // red
];

function hashString(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

function genreForShow(showName: string): string {
  return MOCK_GENRES[hashString(showName) % MOCK_GENRES.length];
}

// Full 0.5 → 5 star scale in half-star increments.
const RATING_BUCKETS = [
  0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5,
];

export default function StatsPage() {
  const { user, authState } = useAuth();
  const { openAuthModal } = useUI();
  const { userLogs, userShows } = useUserData();
  const { userEpisodes } = useSocial();

  // -------------------------------------------------------------------------
  // Derived stats
  // -------------------------------------------------------------------------
  const stats = useMemo(() => {
    const totalEpisodes = userEpisodes.length;
    const totalHours = Math.round((totalEpisodes * MINUTES_PER_EPISODE) / 60);
    const showsTracked = new Set<number>([
      ...userShows.map((s) => s.show_id),
      ...userEpisodes.map((e) => e.show_id),
      ...userLogs.map((l) => l.show_id),
    ]).size;

    // Completed: a show the user has watched > 10 episodes of AND rated.
    const episodesPerShow = new Map<number, number>();
    for (const ep of userEpisodes) {
      episodesPerShow.set(ep.show_id, (episodesPerShow.get(ep.show_id) ?? 0) + 1);
    }
    for (const log of userLogs) {
      episodesPerShow.set(
        log.show_id,
        (episodesPerShow.get(log.show_id) ?? 0) + log.episodes_watched
      );
    }
    const ratedShowIds = new Set(
      userShows.filter((s) => s.rating != null).map((s) => s.show_id)
    );
    const completedShows = [...episodesPerShow.entries()].filter(
      ([showId, count]) => count > 10 && ratedShowIds.has(showId)
    ).length;

    // Genre breakdown — count unique shows per genre from logs.
    const showNames = new Set<string>(userLogs.map((l) => l.show_name));
    const genreCounts = new Map<string, number>();
    for (const name of showNames) {
      const g = genreForShow(name);
      genreCounts.set(g, (genreCounts.get(g) ?? 0) + 1);
    }
    const genreData = [...genreCounts.entries()]
      .map(([name, value], i) => ({ name, value, fill: GENRE_COLORS[i % GENRE_COLORS.length] }))
      .sort((a, b) => b.value - a.value);

    // Ratings distribution histogram.
    // Count show ratings from user_shows first, then add log-only ratings
    // for shows that don't have a user_show rating (avoids double counting).
    const ratingCounts = new Map<number, number>();
    for (const r of RATING_BUCKETS) ratingCounts.set(r, 0);
    const ratedShowIdSet = new Set<number>();
    for (const show of userShows) {
      if (show.rating != null) {
        const key = RATING_BUCKETS.includes(show.rating) ? show.rating : 0.5;
        ratingCounts.set(key, (ratingCounts.get(key) ?? 0) + 1);
        ratedShowIdSet.add(show.show_id);
      }
    }
    for (const log of userLogs) {
      if (log.rating != null && !ratedShowIdSet.has(log.show_id)) {
        const key = RATING_BUCKETS.includes(log.rating) ? log.rating : 0.5;
        ratingCounts.set(key, (ratingCounts.get(key) ?? 0) + 1);
      }
    }
    const ratingData = RATING_BUCKETS.map((r) => ({
      rating: `${r}`,
      count: ratingCounts.get(r) ?? 0,
    }));

    // Year in Review (current REVIEW_YEAR).
    const yearEpisodes = userEpisodes.filter(
      (e) => new Date(e.watched_at).getFullYear() === REVIEW_YEAR
    );
    const yearHours = Math.round((yearEpisodes.length * MINUTES_PER_EPISODE) / 60);

    // Most-watched show this year (by episode count).
    const yearShowCounts = new Map<number, { name: string; count: number }>();
    for (const ep of yearEpisodes) {
      const existing = yearShowCounts.get(ep.show_id);
      if (existing) existing.count++;
      else yearShowCounts.set(ep.show_id, { name: ep.show_name, count: 1 });
    }
    const favoriteShow = [...yearShowCounts.values()].sort(
      (a, b) => b.count - a.count
    )[0];

    // Highest rated show overall.
    const allRatings = [...userShows, ...userLogs].filter(
      (x) => (x as { rating?: number | null }).rating != null
    ) as Array<{ show_name: string; rating: number }>;
    const highestRated = allRatings.sort((a, b) => b.rating - a.rating)[0];

    // Top genre this year.
    const yearGenreCounts = new Map<string, number>();
    const yearShowNames = new Set(yearEpisodes.map((e) => e.show_name));
    for (const name of yearShowNames) {
      const g = genreForShow(name);
      yearGenreCounts.set(g, (yearGenreCounts.get(g) ?? 0) + 1);
    }
    const topGenre = [...yearGenreCounts.entries()].sort(
      (a, b) => b[1] - a[1]
    )[0]?.[0];

    return {
      totalEpisodes,
      totalHours,
      showsTracked,
      completedShows,
      genreData,
      ratingData,
      yearEpisodes: yearEpisodes.length,
      yearHours,
      favoriteShow,
      highestRated,
      topGenre,
      hasData: totalEpisodes > 0 || userLogs.length > 0 || userShows.length > 0,
    };
  }, [userEpisodes, userLogs, userShows]);

  // -------------------------------------------------------------------------
  // Loading state
  // -------------------------------------------------------------------------
  if (authState === "loading") {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-sm text-muted-foreground">Loading your stats…</div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Not signed in — prompt
  // -------------------------------------------------------------------------
  if (!user) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-4">
        <SEOMeta
          title="Stats"
          description="Your personal TV watching statistics, charts, and yearly recap."
        />
        <div className="flex flex-col items-center gap-4 max-w-sm text-center">
          <div className="size-14 rounded-full bg-primary/10 flex items-center justify-center">
            <BarChart3 className="size-7 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground tracking-tight">
              Sign in to view your stats
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Track your watching habits, see genre breakdowns, and review your
              year in TV.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => openAuthModal("signin")}
              className="h-9 px-4 flex items-center rounded bg-primary text-primary-foreground font-bold text-xs uppercase tracking-widest hover:bg-primary/90 transition-colors"
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => openAuthModal("signup")}
              className="h-9 px-4 flex items-center rounded border border-border text-foreground/70 hover:text-foreground hover:border-foreground/30 font-medium text-xs uppercase tracking-widest transition-colors"
            >
              Create Account
            </button>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Empty state — signed in but no data yet
  // -------------------------------------------------------------------------
  if (!stats.hasData) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <SEOMeta
          title="Stats"
          description="Your personal TV watching statistics, charts, and yearly recap."
        />
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
          <StatsHeader />
          <div className="mt-12 flex flex-col items-center justify-center text-center gap-3">
            <div className="size-14 rounded-full bg-secondary/40 flex items-center justify-center">
              <Sparkles className="size-7 text-muted-foreground" />
            </div>
            <h2 className="text-base font-semibold text-foreground">
              No stats yet
            </h2>
            <p className="text-sm text-muted-foreground max-w-xs">
              Start tracking shows, logging episodes, and rating titles to
              build your personal stats dashboard.
            </p>
            <Link
              to="/shows"
              className="mt-2 h-9 px-4 inline-flex items-center rounded bg-primary text-primary-foreground font-bold text-xs uppercase tracking-widest hover:bg-primary/90 transition-colors"
            >
              Browse Shows
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Chart configs
  // -------------------------------------------------------------------------
  const genreConfig: ChartConfig = {
    Drama: { label: "Drama", color: "var(--chart-1)" },
    Comedy: { label: "Comedy", color: "var(--chart-2)" },
    Thriller: { label: "Thriller", color: "var(--chart-3)" },
    "Sci-Fi": { label: "Sci-Fi", color: "var(--chart-4)" },
    Documentary: { label: "Documentary", color: "var(--chart-5)" },
  };

  const ratingConfig: ChartConfig = {
    count: { label: "Shows", color: "var(--chart-1)" },
  };

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEOMeta
        title="Stats"
        description="Your personal TV watching statistics, charts, and yearly recap."
      />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <StatsHeader />

        {/* Summary stat cards */}
        <div className="mt-8 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <SummaryCard
            icon={<Tv className="size-4" />}
            label="Episodes Watched"
            value={stats.totalEpisodes.toLocaleString()}
          />
          <SummaryCard
            icon={<Clock className="size-4" />}
            label="Hours Watched"
            value={`${stats.totalHours.toLocaleString()}h`}
          />
          <SummaryCard
            icon={<BarChart3 className="size-4" />}
            label="Shows Tracked"
            value={stats.showsTracked.toLocaleString()}
          />
          <SummaryCard
            icon={<CheckCircle2 className="size-4" />}
            label="Completed Shows"
            value={stats.completedShows.toLocaleString()}
          />
        </div>

        {/* Year in Review */}
        {stats.yearEpisodes > 0 && (
          <YearInReview
            year={REVIEW_YEAR}
            episodes={stats.yearEpisodes}
            hours={stats.yearHours}
            favoriteShow={stats.favoriteShow?.name}
            highestRatedShow={stats.highestRated?.show_name}
            highestRatedScore={stats.highestRated?.rating}
            topGenre={stats.topGenre}
            username={user.displayName}
          />
        )}

        {user && <SubscriptionInsight />}

        {/* Charts */}
        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          {/* Genre breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Genre Breakdown</CardTitle>
              <CardDescription>
                Shows you've logged, grouped by genre.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={genreConfig}
                className="mx-auto aspect-square min-h-[260px] w-full max-w-[320px]"
              >
                <PieChart>
                  <ChartTooltip
                    content={<ChartTooltipContent nameKey="name" hideLabel />}
                  />
                  <Pie
                    data={stats.genreData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    strokeWidth={2}
                  >
                    {stats.genreData.map((entry) => (
                      <Cell key={entry.name} fill={entry.fill} />
                    ))}
                  </Pie>
                </PieChart>
              </ChartContainer>
              <GenreLegend data={stats.genreData} />
            </CardContent>
          </Card>

          {/* Ratings distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Ratings Distribution</CardTitle>
              <CardDescription>
                How you've rated shows, from 0.5 to 5 stars.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={ratingConfig}
                className="min-h-[260px] w-full"
              >
                <BarChart accessibilityLayer data={stats.ratingData}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis
                    dataKey="rating"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                  />
                  <YAxis
                    allowDecimals={false}
                    tickLine={false}
                    axisLine={false}
                    width={28}
                  />
                  <ChartTooltip
                    content={<ChartTooltipContent nameKey="count" />}
                  />
                  <Bar
                    dataKey="count"
                    fill="var(--color-count)"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Header
// ---------------------------------------------------------------------------

function StatsHeader() {
  return (
    <header>
      <h1 className="font-display text-3xl sm:text-4xl font-bold text-foreground">
        Stats
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Your watching habits at a glance: totals, genre breakdowns, ratings,
        and your year in TV.
      </p>
    </header>
  );
}

// ---------------------------------------------------------------------------
// Summary stat card
// ---------------------------------------------------------------------------

function SummaryCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <Card className="gap-0">
      <CardContent className="pt-5">
        <div className="flex items-center gap-2 text-muted-foreground">
          <span className="text-primary">{icon}</span>
          <span className="text-xs font-medium uppercase tracking-widest">
            {label}
          </span>
        </div>
        <div className="mt-2 font-display text-2xl sm:text-3xl font-bold text-foreground">
          {value}
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Genre legend (custom since PieChart cells use individual colors)
// ---------------------------------------------------------------------------

function GenreLegend({
  data,
}: {
  data: { name: string; value: number; fill: string }[];
}) {
  return (
    <ul className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-2">
      {data.map((entry) => (
        <li key={entry.name} className="flex items-center gap-1.5 text-xs">
          <span
            className="size-2.5 rounded-full"
            style={{ backgroundColor: entry.fill }}
            aria-hidden
          />
          <span className="text-foreground/80">{entry.name}</span>
          <span className="text-muted-foreground">({entry.value})</span>
        </li>
      ))}
    </ul>
  );
}

// ---------------------------------------------------------------------------
// Year in Review — shareable gradient card
// ---------------------------------------------------------------------------

function YearInReview({
  year,
  episodes,
  hours,
  favoriteShow,
  highestRatedShow,
  highestRatedScore,
  topGenre,
  username,
}: {
  year: number;
  episodes: number;
  hours: number;
  favoriteShow?: string;
  highestRatedShow?: string;
  highestRatedScore?: number;
  topGenre?: string;
  username?: string;
}) {
  return (
    <div className="mt-8">
      <div className="relative overflow-hidden rounded-xl border border-border/60 p-6 sm:p-8 bg-gradient-to-br from-primary/15 via-primary/5 to-accent/15">
        {/* Decorative glow accents */}
        <div
          className="pointer-events-none absolute -top-16 -right-16 size-48 rounded-full bg-primary/20 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-20 -left-12 size-52 rounded-full bg-accent/20 blur-3xl"
          aria-hidden
        />

        <div className="relative">
          {/* Year */}
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
                Year in Review
              </p>
              <h2 className="mt-1 font-display text-5xl sm:text-7xl font-extrabold tracking-tight text-foreground leading-none">
                {year}
              </h2>
              {username && (
                <p className="mt-2 text-sm text-muted-foreground">
                  {username}'s year in TV
                </p>
              )}
            </div>
          </div>

          {/* Headline stats */}
          <div className="mt-6 grid grid-cols-2 gap-4">
            <YearStat label="Episodes" value={episodes.toLocaleString()} />
            <YearStat label="Hours" value={`${hours.toLocaleString()}h`} />
          </div>

          {/* Highlights */}
          <div className="mt-6 space-y-2.5">
            <YearHighlight
              label="Most-watched show"
              value={favoriteShow ?? "-"}
            />
            <YearHighlight
              label="Highest rated"
              value={
                highestRatedShow
                  ? `${highestRatedShow}${
                      highestRatedScore ? ` · ${highestRatedScore}★` : ""
                    }`
                  : "-"
              }
            />
            <YearHighlight
              label="Your top genre"
              value={topGenre ?? "-"}
            />
          </div>

          {/* Logo footer */}
          <div className="mt-8 flex items-center justify-between border-t border-border/40 pt-4">
            <AftershowLogo size={20} />
            <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              aftershow.com
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function YearStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-background/40 backdrop-blur-sm border border-border/40 px-4 py-3">
      <div className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 font-display text-2xl sm:text-3xl font-bold text-foreground">
        {value}
      </div>
    </div>
  );
}

function YearHighlight({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-border/30 pb-2">
      <span className="text-xs uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      <span className="text-sm font-semibold text-foreground text-right">
        {value}
      </span>
    </div>
  );
}
