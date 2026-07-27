import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import type { TVShow } from "@/lib/tmdb";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UserProfile {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  twitter_url: string | null;
  instagram_url: string | null;
  website_url: string | null;
  favorite_shows: FavoriteShow[] | null;
  follower_count: number;
  following_count: number;
  created_at: string;
}

export interface FavoriteShow {
  tmdb_id: number;
  name: string;
  poster_path: string | null;
}

export interface UserEpisode {
  id: string;
  user_id: string;
  show_id: number;
  show_name: string;
  show_poster_path: string | null;
  season_number: number;
  episode_number: number;
  episode_name: string | null;
  rewatch: boolean;
  watched_at: string;
}

export interface ShowList {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  is_public: boolean;
  is_editorial: boolean;
  like_count: number;
  item_count: number;
  created_at: string;
  updated_at: string;
}

export interface ListItem {
  id: string;
  list_id: string;
  show_id: number;
  show_name: string;
  show_poster_path: string | null;
  show_first_air_date: string | null;
  position: number;
  note: string | null;
  added_at: string;
}

interface SocialContextValue {
  // Episodes
  userEpisodes: UserEpisode[];
  isEpisodeWatched: (showId: number, season: number, episode: number) => boolean;
  toggleEpisode: (
    show: TVShow,
    season: number,
    episode: number,
    episodeName?: string
  ) => Promise<void>;
  getShowProgress: (showId: number) => { watched: number; perSeason: Map<number, { watched: number; total: number }> };

  // Follows
  following: Set<string>;
  isFollowing: (userId: string) => boolean;
  toggleFollow: (userId: string) => Promise<void>;
  allProfiles: UserProfile[];
  loadingProfiles: boolean;
  refreshProfiles: () => Promise<void>;

  // Lists
  myLists: ShowList[];
  loadingLists: boolean;
  createList: (title: string, description: string, isPublic: boolean) => Promise<ShowList | null>;
  deleteList: (listId: string) => Promise<void>;
  addShowToList: (listId: string, show: TVShow, note?: string) => Promise<void>;
  removeShowFromList: (listId: string, showId: number) => Promise<void>;
  getListItems: (listId: string) => Promise<ListItem[]>;
  refreshLists: () => Promise<void>;

  // Review & List Likes
  reviewLikes: Set<string>;
  isReviewLiked: (logId: string) => boolean;
  toggleReviewLike: (logId: string) => Promise<void>;
  listLikes: Set<string>;
  isListLiked: (listId: string) => boolean;
  toggleListLike: (listId: string) => Promise<void>;

  // Saved lists (bookmark editorial lists)
  savedLists: Set<string>;
  savedListsData: ShowList[];
  isListSaved: (listId: string) => boolean;
  saveList: (list: ShowList) => Promise<void>;
  unsaveList: (listId: string) => Promise<void>;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const SocialContext = createContext<SocialContextValue | null>(null);

export function useSocial(): SocialContextValue {
  const ctx = useContext(SocialContext);
  if (!ctx) throw new Error("useSocial must be used within SocialProvider");
  return ctx;
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function SocialProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [userEpisodes, setUserEpisodes] = useState<UserEpisode[]>([]);
  const [following, setFollowing] = useState<Set<string>>(new Set());
  const [allProfiles, setAllProfiles] = useState<UserProfile[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(false);
  const [myLists, setMyLists] = useState<ShowList[]>([]);
  const [loadingLists, setLoadingLists] = useState(true);
  const [reviewLikes, setReviewLikes] = useState<Set<string>>(new Set());
  const [listLikes, setListLikes] = useState<Set<string>>(new Set());
  const [savedLists, setSavedLists] = useState<Set<string>>(new Set());
  const [savedListsData, setSavedListsData] = useState<ShowList[]>([]);

  // -------------------------------------------------------------------------
  // Load data on sign in
  // -------------------------------------------------------------------------

  const loadEpisodes = useCallback(async () => {
    if (!user) {
      setUserEpisodes([]);
      return;
    }
    const { data } = await supabase
      .from("user_episodes")
      .select("*")
      .eq("user_id", user.id)
      .order("watched_at", { ascending: false });
    if (data) setUserEpisodes(data as UserEpisode[]);
  }, [user]);

  const loadFollowing = useCallback(async () => {
    if (!user) {
      setFollowing(new Set());
      return;
    }
    const { data } = await supabase
      .from("follows")
      .select("following_id")
      .eq("follower_id", user.id);
    if (data) setFollowing(new Set(data.map((f) => f.following_id)));
  }, [user]);

  const [profilesLoaded, setProfilesLoaded] = useState(false);
  const loadProfiles = useCallback(async () => {
    setLoadingProfiles(true);
    const { data } = await supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url, bio, twitter_url, instagram_url, website_url, favorite_shows, follower_count, following_count, created_at")
      .order("follower_count", { ascending: false });
    if (data) setAllProfiles(data as UserProfile[]);
    setLoadingProfiles(false);
    setProfilesLoaded(true);
  }, []);

  const loadLists = useCallback(async () => {
    if (!user) {
      setMyLists([]);
      setLoadingLists(false);
      return;
    }
    setLoadingLists(true);
    const { data } = await supabase
      .from("lists")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });
    if (data) setMyLists(data as ShowList[]);
    setLoadingLists(false);
  }, [user]);

  const loadReviewLikes = useCallback(async () => {
    if (!user) { setReviewLikes(new Set()); return; }
    const { data } = await supabase
      .from("review_likes")
      .select("log_id")
      .eq("user_id", user.id);
    if (data) setReviewLikes(new Set(data.map((l) => l.log_id)));
  }, [user]);

  const loadListLikes = useCallback(async () => {
    if (!user) { setListLikes(new Set()); return; }
    const { data } = await supabase
      .from("list_likes")
      .select("list_id")
      .eq("user_id", user.id);
    if (data) setListLikes(new Set(data.map((l) => l.list_id)));
  }, [user]);

  const loadSavedLists = useCallback(async () => {
    if (!user) { setSavedLists(new Set()); setSavedListsData([]); return; }
    const { data } = await supabase
      .from("saved_lists")
      .select("list_id")
      .eq("user_id", user.id);
    if (data) setSavedLists(new Set(data.map((s) => s.list_id)));

    // Fetch the actual list data for saved editorial lists
    if (data && data.length > 0) {
      const listIds = data.map((s) => s.list_id);
      const { data: listsData } = await supabase
        .from("lists")
        .select("*")
        .in("id", listIds);
      if (listsData) setSavedListsData(listsData as ShowList[]);
    } else {
      setSavedListsData([]);
    }
  }, [user]);

  useEffect(() => {
    loadEpisodes();
    loadFollowing();
    loadLists();
    loadReviewLikes();
    loadListLikes();
    loadSavedLists();
  }, [loadEpisodes, loadFollowing, loadLists, loadReviewLikes, loadListLikes, loadSavedLists]);

  useEffect(() => {
    if (user && !profilesLoaded) loadProfiles();
  }, [user, profilesLoaded, loadProfiles]);

  // -------------------------------------------------------------------------
  // Real-time: keep allProfiles (follower counts, avatars, etc.) in sync
  // without polling. Listens for UPDATE events on profiles and patches the
  // matching row in local state.
  // -------------------------------------------------------------------------
  useEffect(() => {
    const channel = supabase
      .channel("profiles-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles" },
        (payload) => {
          const row = payload.new as UserProfile;
          setAllProfiles((prev) => {
            const idx = prev.findIndex((p) => p.id === row.id);
            if (idx === -1) return [row, ...prev];
            const next = [...prev];
            next[idx] = { ...next[idx], ...row };
            return next;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // -------------------------------------------------------------------------
  // Episode helpers
  // -------------------------------------------------------------------------

  const isEpisodeWatched = useCallback(
    (showId: number, season: number, episode: number) =>
      userEpisodes.some(
        (e) =>
          e.show_id === showId &&
          e.season_number === season &&
          e.episode_number === episode
      ),
    [userEpisodes]
  );

  const toggleEpisode = useCallback(
    async (
      show: TVShow,
      season: number,
      episode: number,
      episodeName?: string
    ) => {
      if (!user) return;

      const existing = userEpisodes.find(
        (e) =>
          e.show_id === show.id &&
          e.season_number === season &&
          e.episode_number === episode
      );

      if (existing) {
        // Optimistic remove
        setUserEpisodes((prev) => prev.filter((e) => e.id !== existing.id));
        const { error: delErr } = await supabase
          .from("user_episodes")
          .delete()
          .eq("id", existing.id);
        if (delErr) toast.error("Failed to update episode");
      } else {
        // Optimistic add
        const tempId = crypto.randomUUID();
        const newEp: UserEpisode = {
          id: tempId,
          user_id: user.id,
          show_id: show.id,
          show_name: show.name,
          show_poster_path: show.poster_path,
          season_number: season,
          episode_number: episode,
          episode_name: episodeName ?? null,
          rewatch: false,
          watched_at: new Date().toISOString(),
        };
        setUserEpisodes((prev) => [newEp, ...prev]);

        const { data, error: insErr } = await supabase
          .from("user_episodes")
          .insert({
            user_id: user.id,
            show_id: show.id,
            show_name: show.name,
            show_poster_path: show.poster_path,
            season_number: season,
            episode_number: episode,
            episode_name: episodeName ?? null,
          })
          .select()
          .single();

        if (insErr) toast.error("Failed to update episode");
        if (data) {
          setUserEpisodes((prev) =>
            prev.map((e) => (e.id === tempId ? (data as UserEpisode) : e))
          );
        }
      }
    },
    [user, userEpisodes]
  );

  const getShowProgress = useCallback(
    (showId: number) => {
      const showEps = userEpisodes.filter((e) => e.show_id === showId);
      const perSeason = new Map<number, { watched: number; total: number }>();
      for (const ep of showEps) {
        const s = perSeason.get(ep.season_number) ?? { watched: 0, total: 0 };
        s.watched++;
        perSeason.set(ep.season_number, s);
      }
      return { watched: showEps.length, perSeason };
    },
    [userEpisodes]
  );

  // -------------------------------------------------------------------------
  // Follow helpers
  // -------------------------------------------------------------------------

  const isFollowing = useCallback(
    (userId: string) => following.has(userId),
    [following]
  );

  const toggleFollow = useCallback(
    async (userId: string) => {
      if (!user || userId === user.id) return;

      if (following.has(userId)) {
        setFollowing((prev) => {
          const next = new Set(prev);
          next.delete(userId);
          return next;
        });
        const { error: unfollowErr } = await supabase
          .from("follows")
          .delete()
          .eq("follower_id", user.id)
          .eq("following_id", userId);
        if (unfollowErr) toast.error("Failed to unfollow user");
        // Optimistic decrement
        setAllProfiles((prev) =>
          prev.map((p) =>
            p.id === userId
              ? { ...p, follower_count: Math.max(p.follower_count - 1, 0) }
              : p
          )
        );
      } else {
        setFollowing((prev) => new Set(prev).add(userId));
        const { error: followErr } = await supabase
          .from("follows")
          .insert({ follower_id: user.id, following_id: userId });
        if (followErr) toast.error("Failed to follow user");
        setAllProfiles((prev) =>
          prev.map((p) =>
            p.id === userId
              ? { ...p, follower_count: p.follower_count + 1 }
              : p
          )
        );
      }
    },
    [user, following]
  );

  const refreshProfiles = useCallback(async () => {
    await loadProfiles();
  }, [loadProfiles]);

  // -------------------------------------------------------------------------
  // List helpers
  // -------------------------------------------------------------------------

  const createList = useCallback(
    async (title: string, description: string, isPublic: boolean) => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("lists")
        .insert({
          user_id: user.id,
          title,
          description: description || null,
          is_public: isPublic,
        })
        .select()
        .single();

      if (error || !data) {
        toast.error("Failed to create list");
        return null;
      }
      const newList = data as ShowList;
      setMyLists((prev) => [newList, ...prev]);
      return newList;
    },
    [user]
  );

  const deleteList = useCallback(
    async (listId: string) => {
      const { error } = await supabase.from("lists").delete().eq("id", listId);
      if (error) toast.error("Failed to delete list");
      setMyLists((prev) => prev.filter((l) => l.id !== listId));
    },
    []
  );

  const addShowToList = useCallback(
    async (listId: string, show: TVShow, note?: string) => {
      if (!user) return;
      const { error } = await supabase.from("list_items").insert({
        list_id: listId,
        show_id: show.id,
        show_name: show.name,
        show_poster_path: show.poster_path,
        show_first_air_date: show.first_air_date || null,
        position: myLists.find((l) => l.id === listId)?.item_count ?? 0,
        note: note || null,
      });
      if (error) {
        console.error("[Social] addShowToList:", error);
        toast.error("Failed to add show to list");
        return;
      }
      // Update local item_count
      setMyLists((prev) =>
        prev.map((l) =>
          l.id === listId
            ? { ...l, item_count: l.item_count + 1, updated_at: new Date().toISOString() }
            : l
        )
      );
    },
    [user, myLists]
  );

  const removeShowFromList = useCallback(
    async (listId: string, showId: number) => {
      const { error } = await supabase
        .from("list_items")
        .delete()
        .eq("list_id", listId)
        .eq("show_id", showId);
      if (error) toast.error("Failed to remove show from list");
      setMyLists((prev) =>
        prev.map((l) =>
          l.id === listId
            ? { ...l, item_count: Math.max(l.item_count - 1, 0) }
            : l
        )
      );
    },
    []
  );

  const getListItems = useCallback(async (listId: string) => {
    const { data } = await supabase
      .from("list_items")
      .select("*")
      .eq("list_id", listId)
      .order("position", { ascending: true });
    return (data ?? []) as ListItem[];
  }, []);

  const refreshLists = useCallback(async () => {
    await loadLists();
  }, [loadLists]);

  // -------------------------------------------------------------------------
  // Review & List Like helpers
  // -------------------------------------------------------------------------

  const isReviewLiked = useCallback(
    (logId: string) => reviewLikes.has(logId),
    [reviewLikes]
  );

  const toggleReviewLike = useCallback(
    async (logId: string) => {
      if (!user) return;
      if (reviewLikes.has(logId)) {
        setReviewLikes((prev) => { const next = new Set(prev); next.delete(logId); return next; });
        const { error: unlikeErr } = await supabase.from("review_likes").delete().eq("user_id", user.id).eq("log_id", logId);
        if (unlikeErr) { console.error("[toggleReviewLike] unlike failed", unlikeErr); toast.error("Failed to update like"); }
      } else {
        setReviewLikes((prev) => new Set(prev).add(logId));
        const { error: likeErr } = await supabase.from("review_likes").insert({ user_id: user.id, log_id: logId });
        if (likeErr) { console.error("[toggleReviewLike] like failed", likeErr); toast.error("Failed to update like"); }
      }
    },
    [user, reviewLikes]
  );

  const isListLiked = useCallback(
    (listId: string) => listLikes.has(listId),
    [listLikes]
  );

  const toggleListLike = useCallback(
    async (listId: string) => {
      if (!user) return;
      if (listLikes.has(listId)) {
        setListLikes((prev) => { const next = new Set(prev); next.delete(listId); return next; });
        const { error: unlikeErr } = await supabase.from("list_likes").delete().eq("user_id", user.id).eq("list_id", listId);
        if (unlikeErr) { console.error("[toggleListLike] unlike failed", unlikeErr); toast.error("Failed to update like"); }
        setMyLists((prev) => prev.map((l) => l.id === listId ? { ...l, like_count: Math.max(l.like_count - 1, 0) } : l));
      } else {
        setListLikes((prev) => new Set(prev).add(listId));
        const { error: likeErr } = await supabase.from("list_likes").insert({ user_id: user.id, list_id: listId });
        if (likeErr) { console.error("[toggleListLike] like failed", likeErr); toast.error("Failed to update like"); }
        setMyLists((prev) => prev.map((l) => l.id === listId ? { ...l, like_count: l.like_count + 1 } : l));
      }
    },
    [user, listLikes, myLists]
  );

  const isListSaved = useCallback(
    (listId: string) => savedLists.has(listId),
    [savedLists]
  );

  const saveList = useCallback(
    async (list: ShowList) => {
      if (!user) return;
      setSavedLists((prev) => new Set(prev).add(list.id));
      setSavedListsData((prev) => [list, ...prev.filter((l) => l.id !== list.id)]);
      const { error } = await supabase
        .from("saved_lists")
        .insert({ user_id: user.id, list_id: list.id });
      if (error) {
        toast.error("Failed to save list");
        setSavedLists((prev) => { const next = new Set(prev); next.delete(list.id); return next; });
        setSavedListsData((prev) => prev.filter((l) => l.id !== list.id));
      }
    },
    [user]
  );

  const unsaveList = useCallback(
    async (listId: string) => {
      if (!user) return;
      setSavedLists((prev) => { const next = new Set(prev); next.delete(listId); return next; });
      setSavedListsData((prev) => prev.filter((l) => l.id !== listId));
      const { error } = await supabase
        .from("saved_lists")
        .delete()
        .eq("user_id", user.id)
        .eq("list_id", listId);
      if (error) toast.error("Failed to unsave list");
    },
    [user]
  );

  return (
    <SocialContext.Provider
      value={{
        userEpisodes,
        isEpisodeWatched,
        toggleEpisode,
        getShowProgress,
        following,
        isFollowing,
        toggleFollow,
        allProfiles,
        loadingProfiles,
        refreshProfiles,
        myLists,
        loadingLists,
        createList,
        deleteList,
        addShowToList,
        removeShowFromList,
        getListItems,
        refreshLists,
        reviewLikes,
        isReviewLiked,
        toggleReviewLike,
        listLikes,
        isListLiked,
        toggleListLike,
        savedLists,
        savedListsData,
        isListSaved,
        saveList,
        unsaveList,
      }}
    >
      {children}
    </SocialContext.Provider>
  );
}
