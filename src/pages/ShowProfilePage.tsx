import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useShowDetail } from "@/hooks/use-tmdb";
import { useUserData } from "@/context/UserDataContext";
import { useSocial } from "@/context/SocialContext";
import { useUI } from "@/context/UIContext";
import { useAuth } from "@/context/AuthContext";
import {
  posterUrl,
  backdropUrl,
  profileUrl,
  getShowSeason,
  getWatchProviders,
  type TVShow,
  type TVShowDetail,
  type CastMember,
  type SeasonDetail,
  type WatchProvider,
} from "@/lib/tmdb";
import { cn } from "@/lib/utils";
import { SEOMeta } from "@/components/SEOMeta";
import { StarRating } from "@/components/shows/StarRating";
import { LogEntryModal } from "@/components/shows/LogEntryModal";
import { ShowCarousel } from "@/components/shows/ShowCarousel";
import { ReviewFeed } from "@/components/shows/ReviewFeed";
import {
  Loader2,
  Heart,
  Bookmark,
  Plus,
  ChevronDown,
  ChevronUp,
  Star,
  Tv,
  Check,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Watch Providers section
// ---------------------------------------------------------------------------

function WatchProviders({ showId }: { showId: number }) {
  const [providers, setProviders] = useState<WatchProvider[]>([]);
  const [link, setLink] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getWatchProviders(showId)
      .then((data) => {
        if (cancelled) return;
        // Combine flatrate + free + ads for display
        const all = [
          ...(data.flatrate ?? []),
          ...(data.free ?? []),
          ...(data.ads ?? []),
        ];
        // Dedupe by provider_id
        const seen = new Set<number>();
        const deduped = all.filter((p) => {
          if (seen.has(p.provider_id)) return false;
          seen.add(p.provider_id);
          return true;
        });
        setProviders(deduped.slice(0, 8));
        setLink(data.link ?? "");
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [showId]);

  if (loading || providers.length === 0) return null;

  return (
    <div className="pt-2 border-t border-border/50">
      <p className="text-[11px] text-muted-foreground uppercase tracking-widest mb-1.5">
        Where to Watch
      </p>
      {link ? (
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-wrap gap-1.5 group cursor-pointer hover:opacity-80 transition-opacity"
        >
          {providers.map((p) => (
            <div
              key={p.provider_id}
              className="size-7 rounded bg-muted border border-border/50 overflow-hidden ring-border group-hover:ring-1 ring-offset-0 transition-all"
              title={p.provider_name}
            >
              {p.logo_path ? (
                <img
                  src={`https://image.tmdb.org/t/p/w92${p.logo_path}`}
                  alt={p.provider_name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[8px] text-muted-foreground">
                  {p.provider_name.slice(0, 2)}
                </div>
              )}
            </div>
          ))}
        </a>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {providers.map((p) => (
            <div
              key={p.provider_id}
              className="size-7 rounded bg-muted border border-border/50 overflow-hidden"
              title={p.provider_name}
            >
              {p.logo_path ? (
                <img
                  src={`https://image.tmdb.org/t/p/w92${p.logo_path}`}
                  alt={p.provider_name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[8px] text-muted-foreground">
                  {p.provider_name.slice(0, 2)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Action Panel (right-hand side)
// ---------------------------------------------------------------------------

interface ActionPanelProps {
  show: TVShow;
  showDetail: TVShowDetail | null;
  onLogClick: () => void;
}

function ActionPanel({ show, showDetail, onLogClick }: ActionPanelProps) {
  const { getShowData, setRating, toggleLike, toggleWatchlist, setShowStatus } = useUserData();
  const { getShowProgress } = useSocial();
  const { openAuthModal } = useUI();
  const { user } = useAuth();

  const showData = getShowData(show.id);
  const rating = showData?.rating ?? null;
  const liked = showData?.liked ?? false;
  const watchlisted = showData?.watchlisted ?? false;
  const status = showData?.status ?? null;
  const progress = getShowProgress(show.id);

  function guard(fn: () => void) {
    if (!user) {
      openAuthModal("signin");
      return;
    }
    fn();
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Rating */}
      <div className="flex flex-col items-center gap-1.5 py-2">
        <StarRating
          value={rating}
          onChange={(v) => guard(() => setRating(show, v))}
          size="lg"
        />
        <span className="text-[11px] text-muted-foreground uppercase tracking-widest">
          {rating !== null ? "Rated" : "Rate"}
        </span>
      </div>

      {/* Like / Watchlist / Log buttons */}
      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={() => guard(() => toggleLike(show))}
          className={cn(
            "flex flex-col items-center justify-center gap-1 h-16 rounded",
            "border transition-colors duration-150",
            liked
              ? "border-primary/50 bg-primary/10 text-primary"
              : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
          )}
        >
          <Heart className={cn("size-5", liked && "fill-primary")} />
          <span className="text-[10px] uppercase tracking-widest font-semibold">
            {liked ? "Liked" : "Like"}
          </span>
        </button>

        <button
          type="button"
          onClick={() => guard(() => toggleWatchlist(show))}
          className={cn(
            "flex flex-col items-center justify-center gap-1 h-16 rounded",
            "border transition-colors duration-150",
            watchlisted
              ? "border-primary/50 bg-primary/10 text-primary"
              : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
          )}
        >
          <Bookmark className={cn("size-5", watchlisted && "fill-primary")} />
          <span className="text-[10px] uppercase tracking-widest font-semibold">
            {watchlisted ? "Saved" : "Watchlist"}
          </span>
        </button>

        <button
          type="button"
          onClick={() => guard(onLogClick)}
          className={cn(
            "flex flex-col items-center justify-center gap-1 h-16 rounded",
            "border border-primary bg-primary text-primary-foreground",
            "hover:bg-primary/90 transition-colors duration-150"
          )}
        >
          <Plus className="size-5" strokeWidth={2.5} />
          <span className="text-[10px] uppercase tracking-widest font-bold">
            Log
          </span>
        </button>
      </div>

      {/* Watch status */}
      <div className="pt-2 border-t border-border/50">
        <p className="text-[11px] text-muted-foreground uppercase tracking-widest mb-1.5">
          Status
        </p>
        <div className="flex flex-wrap gap-1">
          {([
            { value: 'watching', label: 'Watching' },
            { value: 'completed', label: 'Completed' },
            { value: 'want_to_watch', label: 'Want' },
            { value: 'on_hold', label: 'On Hold' },
            { value: 'dropped', label: 'Dropped' },
          ] as const).map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => guard(() => setShowStatus(show, status === s.value ? null : s.value))}
              className={cn(
                "px-2 py-1 rounded text-[10px] font-medium uppercase tracking-wider transition-colors",
                status === s.value
                  ? "border border-primary/50 bg-primary/10 text-primary"
                  : "border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Progress bar */}
      {showDetail && progress.watched > 0 && (
        <div className="pt-2 border-t border-border/50">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium text-primary">
              {progress.watched}/{showDetail.number_of_episodes} eps
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{
                width: `${Math.min(
                  (progress.watched / showDetail.number_of_episodes) * 100,
                  100
                )}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Quick stats */}
      {showDetail && (
        <div className="flex flex-col gap-1.5 pt-2 border-t border-border/50">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">TMDB Rating</span>
            <div className="flex items-center gap-1">
              <Star className="size-3 text-primary fill-primary" />
              <span className="font-medium text-foreground">
                {showDetail.vote_average > 0
                  ? showDetail.vote_average.toFixed(1)
                  : "N/A"}
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Seasons</span>
            <span className="font-medium text-foreground">
              {showDetail.number_of_seasons}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Episodes</span>
            <span className="font-medium text-foreground">
              {showDetail.number_of_episodes}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Status</span>
            <span className="font-medium text-foreground">
              {showDetail.status}
            </span>
          </div>
        </div>
      )}

      {/* Watch providers */}
      <WatchProviders showId={show.id} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Season Drawer with episode checkboxes
// ---------------------------------------------------------------------------

interface SeasonDrawerProps {
  show: TVShow;
  showDetail: TVShowDetail;
}

function SeasonDrawer({ show, showDetail }: SeasonDrawerProps) {
  const [open, setOpen] = useState(true);
  const [selectedSeason, setSelectedSeason] = useState(0);
  const [seasonDetail, setSeasonDetail] = useState<SeasonDetail | null>(null);
  const [loadingSeason, setLoadingSeason] = useState(false);

  const { isEpisodeWatched, toggleEpisode, getShowProgress } = useSocial();
  const { openAuthModal } = useUI();
  const { user } = useAuth();

  const seasons = showDetail.seasons.filter(
    (s) => s.season_number >= 0 && s.episode_count > 0
  );

  const current = seasons[selectedSeason];
  const progress = getShowProgress(show.id);
  const seasonProgress = progress.perSeason.get(current?.season_number ?? 0);

  // Load season details (episode names) when selected
  useEffect(() => {
    if (!current) return;
    setLoadingSeason(true);
    setSeasonDetail(null);
    getShowSeason(show.id, current.season_number)
      .then((data) => setSeasonDetail(data))
      .catch(() => {})
      .finally(() => setLoadingSeason(false));
  }, [show.id, current?.season_number]);

  function guard(fn: () => void) {
    if (!user) {
      openAuthModal("signin");
      return;
    }
    fn();
  }

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          "flex items-center justify-between w-full px-3 py-2.5 rounded",
          "bg-secondary/30 border border-border",
          "text-sm font-medium text-foreground",
          "hover:bg-secondary/50 transition-colors duration-150"
        )}
      >
        <span className="flex items-center gap-2">
          <Tv className="size-4 text-muted-foreground" />
          {current ? current.name : "Seasons"}
          {seasonProgress && (
            <span className="text-xs text-primary font-medium">
              ({seasonProgress.watched}/{current?.episode_count ?? 0})
            </span>
          )}
        </span>
        {open ? (
          <ChevronUp className="size-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="size-4 text-muted-foreground" />
        )}
      </button>

      {open && (
        <div className="mt-2 rounded border border-border bg-secondary/20 overflow-hidden">
          {/* Season selector tabs */}
          <div className="flex gap-1 p-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {seasons.map((season, idx) => {
              const sp = progress.perSeason.get(season.season_number);
              return (
                <button
                  key={season.id}
                  type="button"
                  onClick={() => setSelectedSeason(idx)}
                  className={cn(
                    "shrink-0 px-2.5 py-1 rounded text-xs font-medium",
                    "transition-colors duration-150",
                    idx === selectedSeason
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                  )}
                >
                  {season.name}
                  {sp && sp.watched > 0 && (
                    <span className="ml-1 opacity-70">{sp.watched}/{season.episode_count}</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Per-season progress bar */}
          {current && seasonProgress && (
            <div className="px-3 pb-2">
              <div className="h-1 rounded-full bg-secondary overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.min(
                      (seasonProgress.watched / current.episode_count) * 100,
                      100
                    )}%`,
                  }}
                />
              </div>
            </div>
          )}

          {/* Episode list */}
          <div className="max-h-80 overflow-y-auto border-t border-border">
            {loadingSeason ? (
              <div className="p-4 flex justify-center">
                <Loader2 className="size-4 animate-spin text-muted-foreground" />
              </div>
            ) : seasonDetail?.episodes ? (
              <div className="p-2 space-y-0.5">
                {seasonDetail.episodes.map((ep) => {
                  const watched = isEpisodeWatched(
                    show.id,
                    current.season_number,
                    ep.episode_number
                  );
                  return (
                    <button
                      key={ep.id}
                      type="button"
                      onClick={() =>
                        guard(() =>
                          toggleEpisode(
                            show,
                            current.season_number,
                            ep.episode_number,
                            ep.name
                          )
                        )
                      }
                      className={cn(
                        "flex items-start gap-2.5 w-full text-left px-2 py-2 rounded",
                        "hover:bg-secondary/40 transition-colors",
                        watched && "bg-primary/5"
                      )}
                    >
                      {/* Checkbox */}
                      <div
                        className={cn(
                          "shrink-0 mt-0.5 flex items-center justify-center size-4 rounded border",
                          "transition-all duration-150",
                          watched
                            ? "bg-primary border-primary"
                            : "border-border bg-transparent"
                        )}
                      >
                        {watched && (
                          <Check className="size-3 text-primary-foreground" strokeWidth={3} />
                        )}
                      </div>

                      {/* Episode number */}
                      <span className="shrink-0 text-xs font-mono text-muted-foreground w-6 text-right mt-0.5">
                        {ep.episode_number}
                      </span>

                      {/* Episode info */}
                      <div className="min-w-0 flex-1">
                        <p
                          className={cn(
                            "text-xs font-medium truncate leading-tight",
                            watched ? "text-primary" : "text-foreground/80"
                          )}
                        >
                          {ep.name}
                        </p>
                        {ep.air_date && (
                          <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                            {ep.air_date}
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 text-xs text-muted-foreground text-center">
                No episode data
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Cast List
// ---------------------------------------------------------------------------

interface CastListProps {
  cast: CastMember[];
}

function CastList({ cast }: CastListProps) {
  const [imgErrors, setImgErrors] = useState<Record<number, boolean>>({});

  if (!cast || cast.length === 0) return null;

  const topCast = cast.slice(0, 12);

  return (
    <section className="w-full max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <h2 className="text-base font-bold text-foreground tracking-tight mb-4">
        Cast
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {topCast.map((member) => {
          const errored = imgErrors[member.id];
          return (
            <Link
              key={member.id}
              to={`/person/${member.id}`}
              className="flex flex-col gap-1.5 group"
            >
              <div className="aspect-square rounded overflow-hidden bg-muted border border-border/50 group-hover:border-primary/50 transition-colors">
                {errored || !member.profile_path ? (
                  <div className="w-full h-full flex items-center justify-center bg-secondary/30">
                    <Tv className="size-8 text-muted-foreground/30" strokeWidth={1} />
                  </div>
                ) : (
                  <img
                    src={profileUrl(member.profile_path, "w185")}
                    alt={member.name}
                    loading="lazy"
                    onError={() =>
                      setImgErrors((prev) => ({ ...prev, [member.id]: true }))
                    }
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                )}
              </div>
              <p className="text-xs font-medium text-foreground truncate leading-tight group-hover:text-primary transition-colors">
                {member.name}
              </p>
              <p className="text-[11px] text-muted-foreground truncate leading-tight">
                {member.character}
              </p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Main ShowProfilePage
// ---------------------------------------------------------------------------

export function ShowProfilePage() {
  const { showId } = useParams<{ showId: string }>();
  const numericId = showId ? parseInt(showId, 10) : null;
  const { data: showDetail, loading, error } = useShowDetail(numericId);
  const [logModalOpen, setLogModalOpen] = useState(false);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !showDetail) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 px-4">
        <Tv className="size-12 text-muted-foreground/30" strokeWidth={1} />
        <p className="text-sm text-muted-foreground">
          {error ? `Error: ${error}` : "Show not found"}
        </p>
        <Link to="/" className="text-xs text-accent hover:underline">
          Back to home
        </Link>
      </div>
    );
  }

  const year = showDetail.first_air_date
    ? showDetail.first_air_date.slice(0, 4)
    : "TBA";
  const networkName = showDetail.networks?.[0]?.name;
  const cast = showDetail.credits?.cast ?? [];
  const similar = showDetail.similar?.results ?? [];
  const recommendations = showDetail.recommendations?.results ?? [];

  const show: TVShow = {
    id: showDetail.id,
    name: showDetail.name,
    original_name: showDetail.original_name,
    overview: showDetail.overview,
    poster_path: showDetail.poster_path,
    backdrop_path: showDetail.backdrop_path,
    first_air_date: showDetail.first_air_date,
    vote_average: showDetail.vote_average,
    vote_count: showDetail.vote_count,
    popularity: showDetail.popularity,
    genre_ids: [],
    origin_country: showDetail.origin_country,
    original_language: showDetail.original_language,
  };

  return (
    <>
      <SEOMeta
        title={showDetail.name}
        description={showDetail.overview?.slice(0, 160)}
        ogImage={
          showDetail.backdrop_path
            ? `https://image.tmdb.org/t/p/w1280${showDetail.backdrop_path}`
            : undefined
        }
        ogType="video.show"
      />
      <div className="flex flex-col w-full">
      {/* Full-screen backdrop behind header */}
      <div className="relative w-full h-[40vh] sm:h-[50vh] min-h-[300px] max-h-[500px] overflow-hidden">
        {showDetail.backdrop_path ? (
          <img
            src={backdropUrl(showDetail.backdrop_path, "w1280")}
            alt={`${showDetail.name} backdrop`}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-secondary/30" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/60 via-transparent to-transparent" />
      </div>

      {/* Main content — poster + info + action panel */}
      <div className="relative -mt-32 sm:-mt-40 z-10 w-full max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Left: Poster */}
          <div className="shrink-0 mx-auto md:mx-0">
            <div className="w-32 sm:w-40 md:w-48 lg:w-52">
              <div className="aspect-poster rounded overflow-hidden bg-muted border border-border/50 shadow-xl shadow-black/40">
                {showDetail.poster_path ? (
                  <img
                    src={posterUrl(showDetail.poster_path, "w500")}
                    alt={`${showDetail.name} poster`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-secondary/30">
                    <Tv className="size-12 text-muted-foreground/30" strokeWidth={1} />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Center: Title + meta + overview */}
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-display font-bold text-foreground tracking-tight leading-tight">
              {showDetail.name}
            </h1>

            {/* Meta row */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2">
              {year && (
                <span className="text-sm text-muted-foreground">{year}</span>
              )}
              {networkName && (
                <>
                  <span className="text-muted-foreground/40">·</span>
                  <span className="text-sm text-muted-foreground">
                    {networkName}
                  </span>
                </>
              )}
              {showDetail.number_of_seasons > 0 && (
                <>
                  <span className="text-muted-foreground/40">·</span>
                  <span className="text-sm text-muted-foreground">
                    {showDetail.number_of_seasons}{" "}
                    {showDetail.number_of_seasons === 1 ? "Season" : "Seasons"}
                  </span>
                </>
              )}
              {showDetail.episode_run_time?.[0] > 0 && (
                <>
                  <span className="text-muted-foreground/40">·</span>
                  <span className="text-sm text-muted-foreground">
                    {showDetail.episode_run_time[0]}m
                  </span>
                </>
              )}
            </div>

            {/* Genres */}
            {showDetail.genres.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {showDetail.genres.map((genre) => (
                  <Link
                    key={genre.id}
                    to={`/shows?genre=${genre.id}`}
                    className="px-2 py-0.5 rounded text-[11px] font-medium bg-secondary/40 text-foreground/70 hover:bg-secondary/60 hover:text-foreground transition-colors"
                  >
                    {genre.name}
                  </Link>
                ))}
              </div>
            )}

            {/* Tagline */}
            {showDetail.tagline && (
              <p className="mt-3 text-sm italic text-muted-foreground">
                {showDetail.tagline}
              </p>
            )}

            {/* Overview */}
            {showDetail.overview && (
              <p className="mt-3 text-sm text-foreground/80 leading-relaxed max-w-2xl">
                {showDetail.overview}
              </p>
            )}

            {/* Season drawer */}
            <div className="mt-4 max-w-md">
              <SeasonDrawer show={show} showDetail={showDetail} />
            </div>
          </div>

          {/* Right: Action panel */}
          <div className="shrink-0 w-full md:w-48 lg:w-52">
            <div className="rounded border border-border/50 bg-card/80 backdrop-blur-sm p-3">
              <ActionPanel
                show={show}
                showDetail={showDetail}
                onLogClick={() => setLogModalOpen(true)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Reviews */}
      <ReviewFeed showId={showDetail.id} />

      {/* Cast list */}
      {cast.length > 0 && <CastList cast={cast} />}

      {/* Similar shows */}
      {similar.length > 0 && (
        <div className="py-4">
          <ShowCarousel title="Similar Shows" shows={similar} posterSize="md" />
        </div>
      )}

      {/* Recommended shows */}
      {recommendations.length > 0 && (
        <div className="py-4 pb-12">
          <ShowCarousel
            title="Recommended"
            shows={recommendations}
            posterSize="md"
          />
        </div>
      )}

      {/* Log Entry Modal */}
      <LogEntryModal
        open={logModalOpen}
        onOpenChange={setLogModalOpen}
        show={show}
      />
      </div>
    </>
  );
}
