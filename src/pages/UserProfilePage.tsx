import { useState, useMemo, useEffect, useCallback } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useUserData, type UserLog } from "@/context/UserDataContext";
import { useSocial, type FavoriteShow } from "@/context/SocialContext";
import { bestPosterUrl } from "@/lib/tmdb";
import { supabase } from "@/lib/supabase";
import { SEOMeta } from "@/components/SEOMeta";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { StarRating } from "@/components/shows/StarRating";
import { getShowRatingIcon } from "@/lib/showRatingIcons";
import { EditFavoritesModal } from "@/components/shows/EditFavoritesModal";
import { Tv, Settings as SettingsIcon, Pencil } from "lucide-react";

export function UserProfilePage() {
  const { username } = useParams<{ username: string }>();
  const { user, refreshProfile } = useAuth();
  const { userShows, userLogs, loading } = useUserData();
  const { following, toggleFollow, allProfiles } = useSocial();

  // If viewing another user's profile
  const profile = username
    ? allProfiles.find((p) => p.username === username)
    : null;
  const isOwnProfile = !username || username === user?.username;

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

  // Stats
  const totalShows = userShows.length;
  const thisYear = new Date().getFullYear();
  const showsThisYear = userLogs.filter((l) =>
    l.watched_date?.startsWith(String(thisYear))
  ).length;
  const listCount = 0; // from social context if available
  const reviewCount = userLogs.filter((l) => l.review && l.review.trim()).length;

  // Curated favorites — from profiles.favorite_shows (own profile via AuthContext,
  // other profiles via SocialContext). Falls back to [] when unset.
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

  // Recent watched (from logs)
  const recentWatched = useMemo(() => {
    return [...userLogs].slice(0, 6);
  }, [userLogs]);

  // Recent reviewed
  const recentReviewed = useMemo(() => {
    return userLogs.filter((l) => l.review && l.review.trim()).slice(0, 6);
  }, [userLogs]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

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
              {/* Pro badge — omit if no premium flag */}
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
        <div className="grid grid-cols-4 gap-2">
          <StatBlock label="Total Shows" value={totalShows} />
          <StatBlock label="This Year" value={showsThisYear} />
          <StatBlock label="Lists" value={listCount} />
          <StatBlock label="Reviews" value={reviewCount} />
        </div>

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
            <div className="grid grid-cols-4 gap-2 max-w-[280px]">
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

        {/* Recent Watched */}
        {recentWatched.length > 0 && (
          <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">Recent Watched</h2>
            <Link to="/log" className="text-xs text-accent hover:underline">See All</Link>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {recentWatched.slice(0, 3).map((log) => (
              <RatedPoster key={log.id} log={log} />
            ))}
          </div>
          </section>
        )}

        {/* Recent Reviewed */}
        {recentReviewed.length > 0 && (
          <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">Recent Reviewed</h2>
            <Link to="/journal" className="text-xs text-accent hover:underline">See All</Link>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {recentReviewed.slice(0, 3).map((log) => (
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

function StatBlock({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col items-center gap-0.5 rounded-xl border border-border/50 bg-card p-2.5">
      <span className="font-display text-xl font-bold text-foreground">{value}</span>
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
      {log.rating !== null && (
        <div className="absolute bottom-1 right-1 rounded-full bg-background/90 backdrop-blur-sm px-1.5 py-0.5 flex items-center gap-0.5">
          <StarRating value={log.rating} readOnly size="sm" icon={ratingIcon} />
        </div>
      )}
    </Link>
  );
}
