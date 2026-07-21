import { useState, useEffect, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useShowDetail } from "@/hooks/use-tmdb";
import { useUserData } from "@/context/UserDataContext";
import { useSocial, type ShowList } from "@/context/SocialContext";
import { useAuth } from "@/context/AuthContext";
import {
  posterUrl,
  bestPosterUrl,
  backdropUrl,
  profileUrl,
  type TVShow,
  type TVShowDetail,
  type CastMember,
  type CrewMember,
} from "@/lib/tmdb";
import { cn } from "@/lib/utils";
import { SEOMeta } from "@/components/SEOMeta";
import { StarRating } from "@/components/shows/StarRating";
import { LogEntryModal } from "@/components/shows/LogEntryModal";
import { AddToListModal } from "@/components/shows/AddToListModal";
import { ShowCarousel } from "@/components/shows/ShowCarousel";
import { MobileReviewCard } from "@/components/shows/MobileReviewCard";
import { ReviewCard } from "@/components/shows/ReviewCard";
import { supabase } from "@/lib/supabase";
import {
  Loader2, Heart, Bookmark, Plus, ChevronLeft, Eye, List as ListIcon,
  Tv, CheckCircle, BookmarkCheck,
} from "lucide-react";
import type { ReviewWithAuthor } from "@/components/shows/ReviewCard";

type LogRow = {
  id: string; user_id: string; show_id: number; show_name: string;
  show_poster_path: string | null; show_first_air_date: string | null;
  watched_date: string; rating: number | null; review: string;
  rewatch: boolean; contains_spoiler: boolean; vibe_tag: string | null; created_at: string;
};
type ProfileRow = { id: string; username: string; display_name: string; avatar_url: string | null };

type EditorialListPreview = {
  id: string; title: string; description: string | null;
  item_count: number; like_count: number;
  preview_posters: { show_id: number; show_name: string; show_poster_path: string | null }[];
};

const GENRE_CHART_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)", "#C4B8E8"];

export function ShowProfilePage() {
  const { showId } = useParams<{ showId: string }>();
  const numericId = showId ? parseInt(showId, 10) : null;
  const { data: showDetail, loading, error } = useShowDetail(numericId);
  const { toggleWatchlist, toggleLike, getShowData, setRating, setShowStatus } = useUserData();
  const { isListSaved, saveList, unsaveList } = useSocial();
  const { user } = useAuth();
  const [logModalOpen, setLogModalOpen] = useState(false);
  const [addToListOpen, setAddToListOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"cast" | "crew" | "details">("cast");
  const [reviews, setReviews] = useState<ReviewWithAuthor[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [editorialLists, setEditorialLists] = useState<EditorialListPreview[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (!numericId) return;
    setReviewsLoading(true);
    (async () => {
      try {
        const { data: logs } = await supabase
          .from("user_logs")
          .select("*")
          .eq("show_id", numericId)
          .order("created_at", { ascending: false })
          .limit(20);
        if (!logs) { setReviews([]); return; }
        const typedLogs = logs as LogRow[];
        const userIds = [...new Set(typedLogs.map((l) => l.user_id))];
        const { data: profiles } = await supabase.from("profiles").select("*").in("id", userIds);
        const profileMap = new Map<string, ProfileRow>();
        (profiles ?? []).forEach((p) => profileMap.set((p as ProfileRow).id, p as ProfileRow));
        const logIds = typedLogs.map((l) => l.id);
        const { data: likes } = await supabase.from("review_likes").select("log_id").in("log_id", logIds);
        const likeCounts = new Map<string, number>();
        (likes ?? []).forEach((l) => { const id = (l as { log_id: string }).log_id; likeCounts.set(id, (likeCounts.get(id) ?? 0) + 1); });
        const { data: comments } = await supabase.from("comments").select("log_id").in("log_id", logIds);
        const commentCounts = new Map<string, number>();
        (comments ?? []).forEach((c) => { const id = (c as { log_id: string }).log_id; commentCounts.set(id, (commentCounts.get(id) ?? 0) + 1); });
        const merged: ReviewWithAuthor[] = typedLogs.map((l) => {
          const profile = profileMap.get(l.user_id);
          return {
            id: l.id, user_id: l.user_id, show_id: l.show_id, show_name: l.show_name,
            show_poster_path: l.show_poster_path, show_first_air_date: l.show_first_air_date,
            watched_date: l.watched_date, rating: l.rating == null ? null : Number(l.rating),
            review: l.review, rewatch: l.rewatch, contains_spoiler: l.contains_spoiler, vibe_tag: l.vibe_tag,
            created_at: l.created_at, author_username: profile?.username ?? "unknown",
            author_display_name: profile?.display_name ?? profile?.username ?? "Unknown",
            author_avatar_url: profile?.avatar_url ?? null,
            like_count: likeCounts.get(l.id) ?? 0, comment_count: commentCounts.get(l.id) ?? 0,
          };
        });
        setReviews(merged);
      } finally { setReviewsLoading(false); }
    })();
  }, [numericId]);

  // Fetch editorial lists that contain this show, with first-4-poster previews
  useEffect(() => {
    if (!numericId) return;
    (async () => {
      try {
        // Find which editorial lists contain this show
        const { data: membership } = await supabase
          .from("list_items")
          .select("list_id")
          .eq("show_id", numericId);
        if (!membership || membership.length === 0) { setEditorialLists([]); return; }
        const listIds = [...new Set(membership.map((i: { list_id: string }) => i.list_id))];

        // Fetch the editorial lists (up to 2, ordered by like_count desc)
        const { data: lists } = await supabase
          .from("lists")
          .select("id, title, description, item_count, like_count")
          .in("id", listIds)
          .eq("is_editorial", true)
          .order("like_count", { ascending: false })
          .limit(2);
        if (!lists || lists.length === 0) { setEditorialLists([]); return; }

        // Fetch first 4 items of each list for the poster collage
        const previews: EditorialListPreview[] = [];
        for (const listRow of lists) {
          const list = listRow as { id: string; title: string; description: string | null; item_count: number; like_count: number };
          const { data: previewItems } = await supabase
            .from("list_items")
            .select("show_id, show_name, show_poster_path, position")
            .eq("list_id", list.id)
            .order("position", { ascending: true })
            .limit(4);
          previews.push({
            id: list.id, title: list.title, description: list.description,
            item_count: list.item_count, like_count: list.like_count,
            preview_posters: (previewItems ?? []).map((i: { show_id: number; show_name: string; show_poster_path: string | null }) => ({
              show_id: i.show_id, show_name: i.show_name, show_poster_path: i.show_poster_path,
            })),
          });
        }
        setEditorialLists(previews);
      } catch { setEditorialLists([]); }
    })();
  }, [numericId]);

  // useMemo must be called unconditionally before any early returns
  const genreData = useMemo(() => {
    if (!showDetail?.genres || showDetail.genres.length === 0) return [];
    return showDetail.genres.map((g, i) => ({
      name: g.name,
      value: 1,
      color: GENRE_CHART_COLORS[i % GENRE_CHART_COLORS.length],
    }));
  }, [showDetail?.genres]);

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
        <p className="text-sm text-muted-foreground">{error ? `Error: ${error}` : "Show not found"}</p>
        <Link to="/" className="text-xs text-accent hover:underline">Back to home</Link>
      </div>
    );
  }

  const year = showDetail.first_air_date ? showDetail.first_air_date.slice(0, 4) : "TBA";
  const cast = showDetail.credits?.cast ?? [];
  const crew = showDetail.credits?.crew ?? [];
  const similar = showDetail.similar?.results ?? [];
  const recommendations = showDetail.recommendations?.results ?? [];
  const watchProviders: { provider_id: number; provider_name: string; logo_path: string | null }[] = [];

  const show: TVShow = {
    id: showDetail.id, name: showDetail.name, original_name: showDetail.original_name,
    overview: showDetail.overview, poster_path: showDetail.poster_path,
    backdrop_path: showDetail.backdrop_path, first_air_date: showDetail.first_air_date,
    vote_average: showDetail.vote_average, vote_count: showDetail.vote_count,
    popularity: showDetail.popularity, genre_ids: [], origin_country: showDetail.origin_country,
    original_language: showDetail.original_language,
  };

  const ratedReviews = reviews.filter((r) => r.rating !== null);
  const histogram = [0, 0, 0, 0, 0];
  ratedReviews.forEach((r) => {
    if (r.rating && r.rating >= 1 && r.rating <= 5) {
      histogram[Math.ceil(r.rating) - 1]++;
    }
  });
  const maxHist = Math.max(...histogram, 1);
  const avgRating = ratedReviews.length > 0
    ? ratedReviews.reduce((sum, r) => sum + (r.rating ?? 0), 0) / ratedReviews.length
    : null;

  const showData = getShowData(show.id);
  const communityScore = showDetail.vote_average > 0
    ? Math.round((showDetail.vote_average / 10) * 100)
    : null;

  return (
    <>
      <SEOMeta
        title={showDetail.name}
        description={showDetail.overview?.slice(0, 160)}
        ogImage={showDetail.backdrop_path ? `https://image.tmdb.org/t/p/w1280${showDetail.backdrop_path}` : undefined}
        ogType="video.show"
      />
      <div className="flex flex-col w-full pb-page-enter">
        {/* === MOBILE LAYOUT (below md) === */}
        <div className="md:hidden">
          {/* Backdrop banner with angled bottom clip */}
          <div className="relative w-full h-[35vh] min-h-[240px] max-h-[400px] overflow-hidden">
            {showDetail.backdrop_path ? (
              <img src={backdropUrl(showDetail.backdrop_path, "w780")} alt={`${showDetail.name} backdrop`} className="absolute inset-0 w-full h-full object-cover" />
            ) : (
              <div className="absolute inset-0 bg-secondary/30" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" style={{ paddingBottom: "15%" }} />
            <div className="absolute bottom-0 left-0 right-0 h-[20%]" style={{ background: "var(--background)", clipPath: "polygon(0 100%, 100% 100%, 100% 30%, 0 100%)" }} />
            <button
              onClick={() => navigate(-1)}
              className="absolute top-4 left-4 size-9 flex items-center justify-center rounded-full bg-black/40 backdrop-blur-sm text-white hover:bg-black/60 transition-colors z-10"
              aria-label="Go back"
              style={{ marginTop: "env(safe-area-inset-top, 0px)" }}
            >
              <ChevronLeft className="size-5" />
            </button>
          </div>

          <div className="relative -mt-16 px-4 z-10">
            <div className="flex gap-3">
              <div className="w-24 shrink-0">
                <div className="aspect-poster rounded-lg overflow-hidden bg-muted border border-border/50 shadow-xl shadow-black/40">
                  {showDetail.poster_path ? (
                    <img src={bestPosterUrl(showDetail, "w342")} alt={`${showDetail.name} poster`} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center"><Tv className="size-8 text-muted-foreground/30" strokeWidth={1} /></div>
                  )}
                </div>
              </div>
              <div className="flex-1 min-w-0 pt-1">
                <h1 className="font-display text-lg font-bold text-foreground tracking-tight leading-tight">{showDetail.name}</h1>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1 text-xs text-muted-foreground">
                  <span>{year}</span>
                  {showDetail.episode_run_time?.[0] > 0 && (<><span className="text-muted-foreground/40">·</span><span>{showDetail.episode_run_time[0]}m</span></>)}
                  {showDetail.number_of_seasons > 0 && (<><span className="text-muted-foreground/40">·</span><span>{showDetail.number_of_seasons} {showDetail.number_of_seasons === 1 ? "Season" : "Seasons"}</span></>)}
                </div>
                {showDetail.created_by && showDetail.created_by.length > 0 && (
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    Created by{" "}
                    {showDetail.created_by.map((c, i) => (
                      <span key={c.id}>
                        <Link to={`/person/${c.id}`} className="text-foreground/80 hover:text-accent">{c.name}</Link>
                        {i < showDetail.created_by!.length - 1 && ", "}
                      </span>
                    ))}
                  </p>
                )}
                {showDetail.tagline && <p className="mt-1.5 text-xs italic text-muted-foreground">{showDetail.tagline}</p>}
              </div>
            </div>

            {showDetail.overview && (
              <p className="mt-3 text-sm text-foreground/80 leading-relaxed">{showDetail.overview}</p>
            )}

            <div className="flex items-center gap-4 mt-3 py-2">
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Eye className="size-3.5" />{showDetail.vote_count.toLocaleString()}
              </span>
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Heart className="size-3.5" />{ratedReviews.filter(r => r.rating && r.rating >= 4).length}
              </span>
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <ListIcon className="size-3.5" />{reviews.length}
              </span>
            </div>

            <div className="mt-3 rounded-xl border border-border/50 bg-card p-4">
              <h3 className="text-xs font-semibold text-foreground uppercase tracking-wide mb-3">Ratings</h3>
              <div className="flex gap-4">
                <div className="flex items-end gap-1.5 h-20 flex-1">
                  {histogram.map((count, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <div className="w-full flex-1 flex items-end">
                        <div className="w-full rounded-t-sm bg-primary/70 transition-all duration-300" style={{ height: `${(count / maxHist) * 100}%`, minHeight: count > 0 ? "4px" : "0" }} />
                      </div>
                      <span className="text-[10px] text-muted-foreground">{i + 1}★</span>
                    </div>
                  ))}
                </div>
                <div className="flex flex-col items-center justify-center gap-1 shrink-0 w-20">
                  <span className="font-display text-3xl font-bold text-foreground">{avgRating !== null ? avgRating.toFixed(1) : "—"}</span>
                  <StarRating value={avgRating} readOnly size="sm" />
                  <span className="text-[10px] text-muted-foreground">{ratedReviews.length} ratings</span>
                </div>
              </div>
            </div>

            <div className="mt-3 rounded-xl border border-border/50 bg-card p-4 space-y-3">
              <div className="flex items-center justify-around">
                <ToggleIcon
                  icon={CheckCircle}
                  label="Watched"
                  active={showData?.status === "completed"}
                  onClick={() => setShowStatus(show, showData?.status === "completed" ? null : "completed")}
                />
                <ToggleIcon
                  icon={Heart}
                  label="Liked"
                  active={showData?.liked ?? false}
                  onClick={() => toggleLike(show)}
                />
                <ToggleIcon
                  icon={Bookmark}
                  label="Watchlist"
                  active={showData?.watchlisted ?? false}
                  onClick={() => toggleWatchlist(show)}
                />
              </div>
              <div className="border-t border-border/40 pt-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Your Rating</p>
                <StarRating
                  value={showData?.rating ?? null}
                  onChange={(newRating) => setRating(show, newRating)}
                  size="lg"
                />
              </div>
            </div>

            <div className="mt-3 space-y-2">
              <button onClick={() => setLogModalOpen(true)} className="flex items-center justify-center gap-2 w-full h-11 rounded-full bg-primary text-primary-foreground font-semibold text-sm hover:-translate-y-px hover:bg-primary/90 hover:shadow-md hover:shadow-primary/25 active:translate-y-0 transition-all duration-150">
                <Plus className="size-4" /> Rate or Review
              </button>
              <button onClick={() => setAddToListOpen(true)} className="flex items-center justify-center gap-2 w-full h-11 rounded-full border border-border text-foreground font-medium text-sm hover:bg-secondary/50 hover:-translate-y-px active:translate-y-0 transition-all duration-150">
                <ListIcon className="size-4" /> Add to Lists
              </button>
              <button onClick={() => toggleWatchlist(show)} className={cn("flex items-center justify-center gap-2 w-full h-11 rounded-full border font-medium text-sm hover:-translate-y-px active:translate-y-0 transition-all duration-150", showData?.watchlisted ? "border-primary bg-primary/10 text-primary" : "border-border text-foreground hover:bg-secondary/50")}>
                <Bookmark className={cn("size-4", showData?.watchlisted && "fill-primary")} /> {showData?.watchlisted ? "In Watchlist" : "Add to Watchlist"}
              </button>
            </div>

            <div className="mt-5">
              <div className="flex gap-1 border-b border-border/40">
                {(["cast", "crew", "details"] as const).map((tab) => (
                  <button key={tab} onClick={() => setActiveTab(tab)} className={cn("px-3 py-2 text-sm font-medium capitalize transition-colors relative", activeTab === tab ? "text-primary" : "text-muted-foreground hover:text-foreground")}>
                    {tab}
                    {activeTab === tab && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />}
                  </button>
                ))}
              </div>
              <div className="pt-3">
                {activeTab === "cast" && <CastRow cast={cast} />}
                {activeTab === "crew" && <CrewList crew={crew} />}
                {activeTab === "details" && <DetailsBlock showDetail={showDetail} />}
              </div>
            </div>

            <div className="mt-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">All Reviews</h3>
                {reviews.length > 3 && <Link to="#" className="text-xs text-accent hover:underline">See All</Link>}
              </div>
              {reviewsLoading ? (
                <div className="py-8 flex justify-center"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>
              ) : reviews.length === 0 ? (
                <p className="text-sm text-muted-foreground">No reviews yet. Be the first to review!</p>
              ) : (
                <div className="space-y-3">
                  {reviews.slice(0, 3).map((review) => (
                    <MobileReviewCard key={review.id} review={review} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* === DESKTOP LAYOUT (md+) === */}
        <div className="hidden md:block">
          {/* Blurred backdrop hero */}
          <div className="relative w-full h-[50vh] min-h-[400px] max-h-[600px] overflow-hidden">
            {showDetail.backdrop_path ? (
              <>
                <img src={backdropUrl(showDetail.backdrop_path, "w1280")} alt="" className="absolute inset-0 w-full h-full object-cover blur-sm scale-105" />
                <div className="absolute inset-0 bg-background/60" />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-background/30" />
              </>
            ) : (
              <div className="absolute inset-0 bg-secondary/30" />
            )}

            {/* Back button */}
            <button onClick={() => navigate(-1)} className="absolute top-6 left-6 size-10 flex items-center justify-center rounded-full bg-black/40 backdrop-blur-sm text-white hover:bg-black/60 transition-colors z-10" aria-label="Go back">
              <ChevronLeft className="size-5" />
            </button>

            {/* Hero content: poster + title */}
            <div className="absolute bottom-0 left-0 right-0 px-8 pb-8 flex items-end gap-6">
              <div className="w-48 shrink-0">
                <div className="aspect-poster rounded-xl overflow-hidden bg-muted border border-border/50 shadow-2xl shadow-black/50">
                  {showDetail.poster_path ? (
                    <img src={bestPosterUrl(showDetail, "w500")} alt={`${showDetail.name} poster`} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center"><Tv className="size-12 text-muted-foreground/30" strokeWidth={1} /></div>
                  )}
                </div>
              </div>
              <div className="flex-1 pb-2">
                <h1 className="font-display text-4xl font-bold text-foreground tracking-tight leading-tight">{showDetail.name}</h1>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-sm text-muted-foreground">
                  <span>{year}</span>
                  {showDetail.episode_run_time?.[0] > 0 && <span>· {showDetail.episode_run_time[0]}m</span>}
                  {showDetail.number_of_seasons > 0 && <span>· {showDetail.number_of_seasons} {showDetail.number_of_seasons === 1 ? "Season" : "Seasons"}</span>}
                  {showDetail.genres.slice(0, 3).map((g) => <span key={g.id} className="text-foreground/60">· {g.name}</span>)}
                </div>
                {showDetail.created_by && showDetail.created_by.length > 0 && (
                  <p className="mt-2 text-sm text-muted-foreground">
                    Created by{" "}
                    {showDetail.created_by.map((c, i) => (
                      <span key={c.id}>
                        <Link to={`/person/${c.id}`} className="text-foreground/80 hover:text-accent">{c.name}</Link>
                        {i < showDetail.created_by!.length - 1 && ", "}
                      </span>
                    ))}
                  </p>
                )}
                {showDetail.tagline && <p className="mt-2 text-base italic text-foreground/70">{showDetail.tagline}</p>}
              </div>
            </div>
          </div>

          {/* Two-column body */}
          <div className="max-w-7xl mx-auto px-8 py-8 flex gap-8">
            {/* Left column ~65% */}
            <div className="flex-1 min-w-0 space-y-8" style={{ flexBasis: "65%" }}>
              {/* Synopsis */}
              {showDetail.overview && (
                <section>
                  <h2 className="text-lg font-display font-semibold text-foreground mb-3">Synopsis</h2>
                  <p className="text-sm text-foreground/80 leading-relaxed">{showDetail.overview}</p>
                </section>
              )}

              {/* Cast grid */}
              <section>
                <h2 className="text-lg font-display font-semibold text-foreground mb-4">Cast</h2>
                <CastGrid cast={cast} />
              </section>

              {/* Crew grid */}
              <section>
                <h2 className="text-lg font-display font-semibold text-foreground mb-4">Crew</h2>
                <CrewList crew={crew} />
              </section>

              {/* Reviews */}
              <section>
                <h2 className="text-lg font-display font-semibold text-foreground mb-4">Reviews</h2>
                {reviewsLoading ? (
                  <div className="space-y-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="rounded-xl border border-border/50 bg-card p-4">
                        <div className="flex items-center gap-3">
                          <div className="size-10 rounded-full bg-muted animate-pulse" />
                          <div className="space-y-1.5">
                            <div className="h-3 w-32 rounded bg-muted animate-pulse" />
                            <div className="h-2.5 w-24 rounded bg-muted animate-pulse" />
                          </div>
                        </div>
                        <div className="mt-3 space-y-1.5">
                          <div className="h-3 w-full rounded bg-muted animate-pulse" />
                          <div className="h-3 w-4/5 rounded bg-muted animate-pulse" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : reviews.length === 0 ? (
                  <div className="rounded-xl border border-border/40 bg-card/50 p-8 text-center">
                    <Tv className="size-10 mx-auto text-muted-foreground/30 mb-3" strokeWidth={1} />
                    <p className="text-sm text-muted-foreground">No reviews yet. Be the first to share your thoughts!</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {reviews.map((review) => (
                      <ReviewCard
                        key={review.id}
                        review={review}
                        onExpand={(r) => window.dispatchEvent(new CustomEvent("open-comment-thread", { detail: r }))}
                      />
                    ))}
                  </div>
                )}
              </section>
            </div>

            {/* Right column ~35% — sticky sidebar */}
            <aside className="w-80 shrink-0">
              <div className="sticky top-20 space-y-4">
                {/* Toggle row + rating */}
                <div className="rounded-xl border border-border/50 bg-card p-4 space-y-3">
                  <div className="flex items-center justify-around">
                    <ToggleIcon
                      icon={CheckCircle}
                      label="Watched"
                      active={showData?.status === "completed"}
                      onClick={() => setShowStatus(show, showData?.status === "completed" ? null : "completed")}
                    />
                    <ToggleIcon
                      icon={Heart}
                      label="Liked"
                      active={showData?.liked ?? false}
                      onClick={() => toggleLike(show)}
                    />
                    <ToggleIcon
                      icon={Bookmark}
                      label="Watchlist"
                      active={showData?.watchlisted ?? false}
                      onClick={() => toggleWatchlist(show)}
                    />
                  </div>
                  <div className="border-t border-border/40 pt-3">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Your Rating</p>
                    <StarRating
                      value={showData?.rating ?? null}
                      onChange={(newRating) => setRating(show, newRating)}
                      size="lg"
                    />
                  </div>
                  <button onClick={() => setLogModalOpen(true)} className="flex items-center justify-center gap-2 w-full h-10 rounded-md bg-primary text-primary-foreground font-semibold text-sm hover:-translate-y-px hover:bg-primary/90 hover:shadow-md hover:shadow-primary/25 active:translate-y-0 transition-all duration-150">
                    <Plus className="size-4" /> Rate or Review
                  </button>
                </div>

                {/* Ratings histogram */}
                <div className="rounded-xl border border-border/50 bg-card p-4">
                  <h3 className="text-xs font-semibold text-foreground uppercase tracking-wide mb-3">Ratings</h3>
                  <div className="flex gap-4">
                    <div className="flex items-end gap-1.5 h-20 flex-1">
                      {histogram.map((count, i) => (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1">
                          <div className="w-full flex-1 flex items-end">
                            <div className="w-full rounded-t-sm bg-primary/70 transition-all duration-300" style={{ height: `${(count / maxHist) * 100}%`, minHeight: count > 0 ? "4px" : "0" }} />
                          </div>
                          <span className="text-[10px] text-muted-foreground">{i + 1}★</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex flex-col items-center justify-center gap-1 shrink-0 w-20">
                      <span className="font-display text-3xl font-bold text-foreground">{avgRating !== null ? avgRating.toFixed(1) : "—"}</span>
                      <StarRating value={avgRating} readOnly size="sm" />
                      <span className="text-[10px] text-muted-foreground">{ratedReviews.length} ratings</span>
                    </div>
                  </div>
                </div>

                {/* Vibe Chart — genre donut */}
                {genreData.length > 0 && (
                  <div className="rounded-xl border border-border/50 bg-card p-4">
                    <h3 className="text-xs font-semibold text-foreground uppercase tracking-wide mb-3">Vibe Chart</h3>
                    <VibeChart data={genreData} />
                  </div>
                )}

                {/* Community score gauge */}
                {communityScore !== null && (
                  <div className="rounded-xl border border-border/50 bg-card p-4">
                    <h3 className="text-xs font-semibold text-foreground uppercase tracking-wide mb-3">Community Score</h3>
                    <div className="flex items-center gap-4">
                      <CommunityScoreGauge score={communityScore} votes={showDetail.vote_count} />
                    </div>
                  </div>
                )}

                {/* Where to watch */}
                {watchProviders && watchProviders.length > 0 && (
                  <div className="rounded-xl border border-border/50 bg-card p-4">
                    <h3 className="text-xs font-semibold text-foreground uppercase tracking-wide mb-3">Where to Watch</h3>
                    <div className="flex flex-wrap gap-2">
                      {watchProviders.slice(0, 6).map((provider: { provider_id: number; provider_name: string; logo_path: string | null }) => (
                        <div key={provider.provider_id} className="flex items-center gap-2 rounded-lg border border-border/40 bg-secondary/30 px-2.5 py-1.5">
                          {provider.logo_path && (
                            <img src={posterUrl(provider.logo_path, "w92")} alt={provider.provider_name} className="size-6 rounded" />
                          )}
                          <span className="text-xs text-foreground">{provider.provider_name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </aside>
          </div>

          {/* Similar shows */}
          {similar.length > 0 && (
            <div className="py-4">
              <ShowCarousel title="Similar Shows" shows={similar} posterSize="md" />
            </div>
          )}
          {recommendations.length > 0 && (
            <div className="py-4">
              <ShowCarousel title="Recommended" shows={recommendations} posterSize="md" />
            </div>
          )}

          {/* Featured In — editorial lists containing this show */}
          {editorialLists.length > 0 && (
            <div className="py-4 pb-12">
              <h3 className="font-display text-lg font-semibold text-foreground mb-3 px-4 sm:px-0">Featured In</h3>
              <div className="flex gap-4 overflow-x-auto pb-2 px-4 sm:px-0 snap-x">
                {editorialLists.map((list) => {
                  const saved = isListSaved(list.id);
                  return (
                  <Link
                    key={list.id}
                    to={`/lists/${list.id}`}
                    className="group flex-shrink-0 snap-start w-[280px] sm:w-[320px]"
                  >
                    <div className="rounded-xl border border-border bg-card/50 overflow-hidden transition-all hover:border-accent/40 hover:shadow-lg hover:shadow-accent/10">
                      {/* Poster collage */}
                      <div className="relative h-24 bg-secondary/30 overflow-hidden">
                        {list.preview_posters.length > 0 ? (
                          <div className="absolute inset-0 flex items-center justify-center">
                            {list.preview_posters.slice(0, 4).map((poster, i) => (
                              <img
                                key={poster.show_id}
                                src={posterUrl(poster.show_poster_path, "w92")}
                                alt=""
                                className="h-20 w-14 object-cover rounded-md border border-background/60 shadow-md"
                                style={{
                                  marginLeft: i === 0 ? 0 : -16,
                                  zIndex: 4 - i,
                                  transform: `rotate(${(i % 2 === 0 ? -1 : 1) * 2}deg)`,
                                }}
                                loading="lazy"
                              />
                            ))}
                          </div>
                        ) : (
                          <div className="flex items-center justify-center h-full text-muted-foreground">
                            <ListIcon className="size-6" />
                          </div>
                        )}
                      </div>
                      {/* List info */}
                      <div className="p-3 space-y-1.5">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-medium text-sm text-foreground line-clamp-1 group-hover:text-accent transition-colors">{list.title}</p>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              if (!user) return;
                              const showList: ShowList = { id: list.id, user_id: "", title: list.title, description: list.description, is_public: true, is_editorial: true, like_count: list.like_count, item_count: list.item_count, created_at: "", updated_at: "" };
                              if (saved) unsaveList(list.id); else saveList(showList);
                            }}
                            className={cn(
                              "flex items-center justify-center size-7 rounded-md transition-colors shrink-0",
                              saved ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                            )}
                            aria-label={saved ? "Unsave list" : "Save list"}
                          >
                            <BookmarkCheck className={cn("size-4", saved && "fill-primary")} />
                          </button>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-1">{list.description}</p>
                        <div className="flex items-center gap-2 pt-1">
                          <span className="text-xs text-muted-foreground">{list.item_count} shows</span>
                          <span className="text-xs text-muted-foreground/60">·</span>
                          <span className="text-xs font-medium text-accent/80">Curated by Aftershow</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>

      </div>

      <LogEntryModal open={logModalOpen} onOpenChange={setLogModalOpen} show={show} initialRating={showData?.rating ?? null} />
      <AddToListModal open={addToListOpen} onOpenChange={setAddToListOpen} show={show} />
    </>
  );
}

function ToggleIcon({ icon: Icon, label, active, onClick }: { icon: React.ComponentType<{ className?: string }>; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-1.5 p-2 rounded-lg transition-all duration-150 hover:-translate-y-px",
        active ? "text-primary" : "text-muted-foreground hover:text-foreground"
      )}
    >
      <Icon className={cn("size-6", active && "fill-primary")} />
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  );
}

function VibeChart({ data }: { data: { name: string; value: number; color: string }[] }) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="flex items-center gap-4">
      <svg width="120" height="120" viewBox="0 0 120 120" className="shrink-0">
        <circle cx="60" cy="60" r={radius} fill="none" stroke="var(--muted)" strokeWidth="14" />
        {data.map((d, i) => {
          const dash = (d.value / total) * circumference;
          const circle = (
            <circle
              key={i}
              cx="60"
              cy="60"
              r={radius}
              fill="none"
              stroke={d.color}
              strokeWidth="14"
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeDashoffset={-offset}
              transform="rotate(-90 60 60)"
            />
          );
          offset += dash;
          return circle;
        })}
      </svg>
      <div className="flex-1 space-y-1.5">
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="size-2.5 rounded-full shrink-0" style={{ background: d.color }} />
            <span className="text-xs text-foreground truncate">{d.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CommunityScoreGauge({ score, votes }: { score: number; votes: number }) {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const dash = (score / 100) * circumference;
  const color = score >= 70 ? "var(--chart-3)" : score >= 40 ? "var(--chart-4)" : "var(--destructive)";

  return (
    <div className="flex items-center gap-4 w-full">
      <div className="relative shrink-0">
        <svg width="100" height="100" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r={radius} fill="none" stroke="var(--muted)" strokeWidth="8" />
          <circle
            cx="50" cy="50" r={radius}
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circumference - dash}`}
            transform="rotate(-90 50 50)"
            className="transition-all duration-500"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-display text-xl font-bold text-foreground">{score}%</span>
        </div>
      </div>
      <div className="flex flex-col">
        <span className="text-sm font-medium text-foreground">{votes.toLocaleString()} votes</span>
        <span className="text-xs text-muted-foreground">TMDB Community</span>
      </div>
    </div>
  );
}

function CastRow({ cast }: { cast: CastMember[] }) {
  const [imgErrors, setImgErrors] = useState<Record<number, boolean>>({});
  if (!cast || cast.length === 0) return <p className="text-sm text-muted-foreground py-4">No cast data available.</p>;
  return (
    <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
      <style>{`div::-webkit-scrollbar{display:none}`}</style>
      {cast.slice(0, 20).map((member) => {
        const errored = imgErrors[member.id];
        return (
          <Link key={member.id} to={`/person/${member.id}`} className="flex flex-col items-center gap-1.5 shrink-0 w-16">
            <div className="size-16 rounded-full overflow-hidden bg-muted ring-1 ring-border/30">
              {errored || !member.profile_path ? (
                <div className="w-full h-full flex items-center justify-center bg-secondary/30"><Tv className="size-6 text-muted-foreground/30" strokeWidth={1} /></div>
              ) : (
                <img src={profileUrl(member.profile_path, "w185")} alt={member.name} loading="lazy" onError={() => setImgErrors((p) => ({ ...p, [member.id]: true }))} className="w-full h-full object-cover" />
              )}
            </div>
            <p className="text-xs font-medium text-foreground truncate text-center w-full">{member.name}</p>
            <p className="text-[10px] text-muted-foreground truncate text-center w-full">{member.character}</p>
          </Link>
        );
      })}
    </div>
  );
}

function CastGrid({ cast }: { cast: CastMember[] }) {
  const [imgErrors, setImgErrors] = useState<Record<number, boolean>>({});
  if (!cast || cast.length === 0) return <p className="text-sm text-muted-foreground">No cast data available.</p>;
  return (
    <div className="grid grid-cols-4 lg:grid-cols-6 gap-4">
      {cast.slice(0, 18).map((member) => {
        const errored = imgErrors[member.id];
        return (
          <Link key={member.id} to={`/person/${member.id}`} className="flex flex-col items-center gap-2 group">
            <div className="size-20 lg:size-24 rounded-full overflow-hidden bg-muted ring-1 ring-border/30 group-hover:ring-primary/50 transition-all pb-poster-glow">
              {errored || !member.profile_path ? (
                <div className="w-full h-full flex items-center justify-center bg-secondary/30"><Tv className="size-8 text-muted-foreground/30" strokeWidth={1} /></div>
              ) : (
                <img src={profileUrl(member.profile_path, "w185")} alt={member.name} loading="lazy" onError={() => setImgErrors((p) => ({ ...p, [member.id]: true }))} className="w-full h-full object-cover" />
              )}
            </div>
            <div className="text-center">
              <p className="text-xs font-medium text-foreground truncate w-full">{member.name}</p>
              <p className="text-[10px] text-muted-foreground truncate w-full">{member.character}</p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

function CrewList({ crew }: { crew: CrewMember[] }) {
  if (!crew || crew.length === 0) return <p className="text-sm text-muted-foreground">No crew data available.</p>;
  const topCrew = crew.filter((c) => ["Creator", "Director", "Producer", "Executive Producer", "Writer"].includes(c.job)).slice(0, 15);
  if (topCrew.length === 0) return <p className="text-sm text-muted-foreground">No key crew data available.</p>;
  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-2">
      {topCrew.map((member, i) => (
        <div key={`${member.id}-${i}`} className="flex items-center justify-between py-1">
          <Link to={`/person/${member.id}`} className="text-sm text-foreground hover:text-accent transition-colors">{member.name}</Link>
          <span className="text-xs text-muted-foreground">{member.job}</span>
        </div>
      ))}
    </div>
  );
}

function DetailsBlock({ showDetail }: { showDetail: TVShowDetail }) {
  return (
    <div className="space-y-2 py-2">
      {showDetail.genres.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {showDetail.genres.map((g) => (
            <span key={g.id} className="px-2 py-0.5 rounded-full bg-secondary text-xs text-foreground">{g.name}</span>
          ))}
        </div>
      )}
      <div className="grid grid-cols-2 gap-y-1.5 text-xs">
        <span className="text-muted-foreground">Status</span><span className="text-foreground text-right">{showDetail.status}</span>
        <span className="text-muted-foreground">Seasons</span><span className="text-foreground text-right">{showDetail.number_of_seasons}</span>
        <span className="text-muted-foreground">Episodes</span><span className="text-foreground text-right">{showDetail.number_of_episodes}</span>
        <span className="text-muted-foreground">Language</span><span className="text-foreground text-right">{showDetail.original_language.toUpperCase()}</span>
        {showDetail.networks?.[0] && (<><span className="text-muted-foreground">Network</span><span className="text-foreground text-right">{showDetail.networks[0].name}</span></>)}
      </div>
    </div>
  );
}
