import { useState, useMemo, useEffect, useCallback } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useUserData, type UserLog, type UserShow } from "@/context/UserDataContext";
import { useSocial, type FavoriteShow } from "@/context/SocialContext";
import { bestPosterUrl, type TVShow } from "@/lib/tmdb";
import { supabase } from "@/lib/supabase";
import { SEOMeta } from "@/components/SEOMeta";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { StarRating } from "@/components/shows/StarRating";
import { getShowRatingIcon } from "@/lib/showRatingIcons";
import { EditFavoritesModal } from "@/components/shows/EditFavoritesModal";
import { ShowPosterCard } from "@/components/shows/ShowPosterCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { VibeTagBadge } from "@/components/shows/VibeTag";
import { Tv, Settings as SettingsIcon, Pencil, Bookmark, Heart, Star } from "lucide-react";

export function UserProfilePage({ tab }: { tab?: "watchlist" | "likes" | "reviews" }) {
  const { username } = useParams<{ username: string }>();
  const { user, refreshProfile } = useAuth();
  const { userShows, userLogs, loading } = useUserData();
  const { following, toggleFollow, allProfiles, myLists } = useSocial();

  const isOwnProfile = !username || username === user?.username;

  const profile = username
    ? allProfiles.find((p) => p.username === username)
    : null;

  const displayName = isOwnProfile
    ? user?.displayName ?? "User"
    : profile?.display_name ?? profile?.username ?? username ?? "User";
  const handle = isOwnProfile
    ? user?.username ?? "unknown"
    : profile?.username ?? username ?? "unknown";
  const avatarUrl = (isOwnProfile ? user?.avatarUrl : profile?.avatar_url) ?? undefined;
  const [ownProfileCounts, setOwnProfileCounts] = useState<{ follower_count: number; following_count: number }>({ follower_count: 0, following_count: 0 });

  useEffect(() => {
    if (!isOwnProfile || !user) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("follower_count, following_count")
        .eq("id", user.id)
        .maybeSingle();
      if (!cancelled && data) {
        setOwnProfileCounts(data as { follower_count: number; following_count: number });
      }
    })();
    return () => { cancelled = true; };
  }, [isOwnProfile, user]);

  const followerCount = isOwnProfile
    ? ownProfileCounts.follower_count
    : profile?.follower_count ?? 0;
  const followingCount = isOwnProfile
    ? ownProfileCounts.following_count
    : profile?.following_count ?? 0;

  const totalShows = userShows.length;
  const thisYear = new Date().getFullYear();
  const showsThisYear = userLogs.filter((l) =>
    l.watched_date?.startsWith(String(thisYear))
  ).length;
  const listCount = isOwnProfile ? myLists.length : 0;

  const favoriteShows: FavoriteShow[] = useMemo(() => {
    if (isOwnProfile) return user?.favoriteShows ?? [];
    return profile?.favorite_shows ?? [];
  }, [isOwnProfile, user, profile]);

  const [editFavoritesOpen, setEditFavoritesOpen] = useState(false);
  const [draftFavorites, setDraftFavorites] = useState<FavoriteShow[]>(favoriteShows);

  useEffect(() => {
    setDraftFavorites(favoriteShows);
  }, [favoriteShows]);

  const handleFavoritesSaved = useCallback((saved: FavoriteShow[]) => {
    setDraftFavorites(saved);
    refreshProfile();
  }, [refreshProfile]);

  const recentReviewed = useMemo(() => {
    return userLogs.filter((l) => l.review && l.review.trim()).slice(0, 6);
  }, [userLogs]);

  // Filtered collections for tab views
  const watchlistShows = useMemo(() => {
    return userShows.filter((s) => s.watchlisted);
  }, [userShows]);

  const likedShows = useMemo(() => {
    return userShows.filter((s) => s.liked);
  }, [userShows]);

  const reviewedLogs = useMemo(() => {
    return userLogs.filter((l) => l.review && l.review.trim());
  }, [userLogs]);

  // Convert UserShow to TVShow for ShowPosterCard
  function userShowToTVShow(s: UserShow): TVShow {
    return {
      id: s.show_id,
      name: s.show_name,
      original_name: s.show_name,
      overview: "",
      poster_path: s.show_poster_path,
      backdrop_path: s.show_backdrop_path,
      first_air_date: s.show_first_air_date ?? "",
      vote_average: 0,
      vote_count: 0,
      popularity: 0,
      genre_ids: [],
      origin_country: [],
      original_language: "",
    };
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  // Tab view: if tab is set, render the filtered collection
  if (tab) {
    const TAB_CONFIG = {
      watchlist: {
        title: "Watchlist",
        icon: Bookmark,
        emptyTitle: "Your watchlist is empty",
        emptyDesc: "Browse shows and add them to your watchlist to keep track of what you want to watch next.",
        items: watchlistShows,
      },
      likes: {
        title: "Likes",
        icon: Heart,
        emptyTitle: "No liked shows yet",
        emptyDesc: "Tap the heart on any show to add it to your likes.",
        items: likedShows,
      },
      reviews: {
        title: "Reviews",
        icon: Star,
        emptyTitle: "No reviews yet",
        emptyDesc: "Write a review for a show you've watched to see it here.",
        items: reviewedLogs,
      },
    } as const;

    const config = TAB_CONFIG[tab];
    const TabIcon = config.icon;

    return (
      <>
        <SEOMeta title={`${config.title} — Aftershow`} />
        <div className="w-full max-w-screen-lg mx-auto px-4 py-4 space-y-5 md:py-8">
          {/* Header */}
          <div className="flex items-center gap-3">
            <Link to="/profile" className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors">
              <Tv className="size-5" />
            </Link>
            <div className="flex items-center gap-2">
              <TabIcon className="size-5 text-primary" />
              <h1 className="font-display text-lg font-bold text-foreground tracking-tight">
                {config.title}
              </h1>
              <span className="text-sm text-muted-foreground">({config.items.length})</span>
            </div>
          </div>

          {/* Tab navigation */}
          <div className="flex gap-1 border-b border-border/50">
            {(["watchlist", "likes", "reviews"] as const).map((t) => (
              <Link
                key={t}
                to={`/profile/${t}`}
                className={cn(
                  "px-4 py-2 text-sm font-medium capitalize transition-colors relative",
                  tab === t
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {t}
                {tab === t && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
                )}
              </Link>
            ))}
          </div>

          {/* Content */}
          {tab === "reviews" ? (
            config.items.length > 0 ? (
              <div className="flex flex-col">
                {(config.items as UserLog[]).map((log) => (
                  <ReviewLogEntry key={log.id} log={log} />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Star}
                title={config.emptyTitle}
                description={config.emptyDesc}
                action={{ label: "Browse Shows", to: "/shows" }}
              />
            )
          ) : config.items.length > 0 ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
              {(config.items as UserShow[]).map((s) => (
                <ShowPosterCard
                  key={s.id}
                  show={userShowToTVShow(s)}
                  size="md"
                  className="w-full"
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={TabIcon}
              title={config.emptyTitle}
              description={config.emptyDesc}
              action={{ label: "Browse Shows", to: "/shows" }}
            />
          )}
        </div>
      </>
    );
  }

  // Default profile view
  return (
    <>
      <SEOMeta title={`${displayName} — Aftershow`} />
      <div className="w-full max-w-screen-lg mx-auto px-4 py-4 space-y-5 md:py-8">
        {/* Profile header */}
        <div className="flex items-start gap-4">
          <Avatar className="size-16 border border-border/40 shrink-0">
            <AvatarImage src={avatarUrl} alt={displayName} />
            <AvatarFallback className="bg-secondary text-foreground text-xl font-semibold">
              {displayName?.charAt(0).toUpperCase() ?? "?"}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="font-display text-lg font-bold text-foreground tracking-tight truncate">
                {displayName}
              </h1>
            </div>
            <p className="text-xs text-muted-foreground">@{handle}</p>
            <div className="flex gap-3 text-xs text-muted-foreground pt-1">
              <span><span className="font-semibold text-foreground">{followerCount}</span> followers</span>
              <span><span className="font-semibold text-foreground">{followingCount}</span> following</span>
            </div>
          </div>

          {isOwnProfile ? (
            <Link to="/settings" className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors shrink-0">
              <SettingsIcon className="size-5" />
            </Link>
          ) : (
            <button
              onClick={() => profile && toggleFollow(profile.id)}
              className={cn(
                "px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-150 shrink-0",
                following.has(profile?.id ?? "")
                  ? "bg-secondary text-foreground border border-border"
                  : "bg-primary text-primary-foreground hover:-translate-y-px hover:shadow-md hover:shadow-primary/25"
              )}
            >
              {following.has(profile?.id ?? "") ? "Following" : "Follow"}
            </button>
          )}
        </div>

        {/* Stat row */}
        <div className="grid grid-cols-3 gap-2">
          <StatBlock label="Total Shows" value={totalShows} />
          <StatBlock label="This Year" value={showsThisYear} />
          <StatBlock label="Lists" value={listCount} />
        </div>

        {/* Quick links to Watchlist / Likes / Reviews */}
        {isOwnProfile && (
          <div className="grid grid-cols-3 gap-2">
            <QuickLink to="/profile/watchlist" icon={Bookmark} label="Watchlist" count={watchlistShows.length} />
            <QuickLink to="/profile/likes" icon={Heart} label="Likes" count={likedShows.length} />
            <QuickLink to="/profile/reviews" icon={Star} label="Reviews" count={reviewedLogs.length} />
          </div>
        )}

        {/* Favorite Shows */}
        {(favoriteShows.length > 0 || isOwnProfile) && (
          <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">Favorite Shows</h2>
            {isOwnProfile && (
              <button
                onClick={() => setEditFavoritesOpen(true)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <Pencil className="size-3" />
                Edit
              </button>
            )}
          </div>
          {favoriteShows.length > 0 ? (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(130px,1fr))] gap-3">
              {favoriteShows.map((show) => (
                <FavoritePoster key={show.tmdb_id} show={show} />
              ))}
            </div>
          ) : (
            isOwnProfile && (
              <button
                onClick={() => setEditFavoritesOpen(true)}
                className="flex w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border/60 bg-secondary/20 py-8 text-center hover:bg-secondary/40 transition-colors"
              >
                <Tv className="size-8 text-muted-foreground/30" strokeWidth={1} />
                <span className="text-xs text-muted-foreground">Pick your 4 favorite shows</span>
              </button>
            )
          )}
          </section>
        )}

        {/* Recent Reviews */}
        {recentReviewed.length > 0 && (
          <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">Recent Reviews</h2>
            <Link to="/profile/reviews" className="text-xs text-accent hover:underline">See All</Link>
          </div>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(110px,1fr))] gap-3">
            {recentReviewed.slice(0, 6).map((log) => (
              <RatedPoster key={log.id} log={log} />
            ))}
          </div>
          </section>
        )}

        {/* Empty state */}
        {isOwnProfile && totalShows === 0 && userLogs.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
            <Tv className="size-12 text-muted-foreground/30" strokeWidth={1} />
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">Your profile is empty</p>
              <p className="text-xs text-muted-foreground">Start watching and logging shows to build your profile.</p>
            </div>
            <Link to="/shows" className="px-4 py-2 rounded-full bg-primary text-primary-foreground text-xs font-semibold hover:-translate-y-px hover:shadow-md hover:shadow-primary/25 transition-all">
              Discover Shows
            </Link>
          </div>
        )}
      </div>

      {isOwnProfile && (
        <EditFavoritesModal
          open={editFavoritesOpen}
          onOpenChange={setEditFavoritesOpen}
          userId={user?.id ?? ""}
          currentFavorites={draftFavorites}
          onSaved={handleFavoritesSaved}
        />
      )}
    </>
  );
}

function ReviewLogEntry({ log }: { log: UserLog }) {
  const [imgError, setImgError] = useState(false);
  const ratingIcon = getShowRatingIcon(log.show_id);

  return (
    <div className="bg-card rounded-2xl p-4 border border-border/50 shadow-sm flex gap-4 mb-3 last:mb-0">
      <Link to={`/show/${log.show_id}`} className="shrink-0">
        <div className="w-16 aspect-poster rounded-lg overflow-hidden bg-muted border border-border/50">
          {log.show_poster_path && !imgError ? (
            <img
              src={bestPosterUrl({ id: log.show_id, poster_path: log.show_poster_path }, "w185")}
              alt={log.show_name}
              loading="lazy"
              onError={() => setImgError(true)}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-secondary/30">
              <Tv className="size-5 text-muted-foreground/30" strokeWidth={1} />
            </div>
          )}
        </div>
      </Link>
      <div className="flex-1 min-w-0">
        <Link to={`/show/${log.show_id}`} className="text-sm font-semibold text-foreground hover:text-primary transition-colors">
          {log.show_name}
        </Link>
        <p className="text-xs text-muted-foreground mt-0.5">
          {log.watched_date ? new Date(log.watched_date).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "No date"}
          {log.rewatch && <span className="ml-1.5">Rewatched</span>}
        </p>
        {log.rating != null && (
          <div className="mt-2 flex items-center gap-2">
            <StarRating value={log.rating} readOnly size="sm" icon={ratingIcon} />
            {log.vibe_tag && <VibeTagBadge value={log.vibe_tag} />}
          </div>
        )}
        {log.rating == null && log.vibe_tag && (
          <div className="mt-2"><VibeTagBadge value={log.vibe_tag} /></div>
        )}
        {log.review && (
          <p className="text-sm text-foreground/80 leading-7 mt-2">
            {log.contains_spoiler ? (
              <span className="text-xs text-muted-foreground italic">Contains spoilers — view on show page</span>
            ) : (
              log.review
            )}
          </p>
        )}
      </div>
    </div>
  );
}

function QuickLink({ to, icon: Icon, label, count }: { to: string; icon: typeof Bookmark; label: string; count: number }) {
  return (
    <Link
      to={to}
      className="flex flex-col items-center gap-1 rounded-xl border border-border/50 bg-card p-3 hover:border-primary/40 hover:bg-secondary/30 transition-all"
    >
      <Icon className="size-5 text-muted-foreground" />
      <span className="text-xs font-semibold text-foreground">{count}</span>
      <span className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</span>
    </Link>
  );
}

function StatBlock({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col items-center gap-0.5 rounded-xl border border-border/50 bg-card p-2.5">
      <span className="font-display text-xl font-bold text-primary">{value}</span>
      <span className="text-[10px] text-muted-foreground uppercase tracking-wide text-center leading-tight">{label}</span>
    </div>
  );
}

function FavoritePoster({ show }: { show: FavoriteShow }) {
  const [imgError, setImgError] = useState(false);
  return (
    <Link to={`/show/${show.tmdb_id}`} className="block">
      <div className="aspect-poster rounded-lg overflow-hidden bg-muted border border-border/50">
        {show.poster_path && !imgError ? (
          <img src={bestPosterUrl({ id: show.tmdb_id, poster_path: show.poster_path }, "w185")} alt={show.name} loading="lazy" onError={() => setImgError(true)} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-secondary/30"><Tv className="size-6 text-muted-foreground/30" strokeWidth={1} /></div>
        )}
      </div>
    </Link>
  );
}

function RatedPoster({ log }: { log: UserLog }) {
  const [imgError, setImgError] = useState(false);
  const ratingIcon = getShowRatingIcon(log.show_id);
  return (
    <Link to={`/show/${log.show_id}`} className="block relative">
      <div className="aspect-poster rounded-lg overflow-hidden bg-muted border border-border/50">
        {log.show_poster_path && !imgError ? (
          <img src={bestPosterUrl({ id: log.show_id, poster_path: log.show_poster_path }, "w185")} alt={log.show_name} loading="lazy" onError={() => setImgError(true)} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-secondary/30"><Tv className="size-6 text-muted-foreground/30" strokeWidth={1} /></div>
        )}
      </div>
      <div className="absolute bottom-1 right-1 left-1 flex items-end justify-between gap-1">
        {log.rewatch && (
          <span className="rounded-md bg-primary/90 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-primary-foreground backdrop-blur-sm">
            Rewatch
          </span>
        )}
        {log.rating !== null && (
          <div className="ml-auto rounded-full bg-background/90 backdrop-blur-sm px-1.5 py-0.5 flex items-center gap-0.5">
            <StarRating value={log.rating} readOnly size="sm" icon={ratingIcon} />
          </div>
        )}
      </div>
    </Link>
  );
}
