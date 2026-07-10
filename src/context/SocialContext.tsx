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
  follower_count: number;
  following_count: number;
  created_at: string;
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
  const [loadingProfiles, setLoadingProfiles] = useState(true);
  const [myLists, setMyLists] = useState<ShowList[]>([]);
  const [loadingLists, setLoadingLists] = useState(true);

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

  const loadProfiles = useCallback(async () => {
    setLoadingProfiles(true);
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .order("follower_count", { ascending: false });
    if (data) setAllProfiles(data as UserProfile[]);
    setLoadingProfiles(false);
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

  useEffect(() => {
    loadEpisodes();
    loadFollowing();
    loadLists();
  }, [loadEpisodes, loadFollowing, loadLists]);

  useEffect(() => {
    loadProfiles();
  }, [loadProfiles]);

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
        await supabase.from("user_episodes").delete().eq("id", existing.id);
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

        const { data } = await supabase
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
        await supabase
          .from("follows")
          .delete()
          .eq("follower_id", user.id)
          .eq("following_id", userId);
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
        await supabase
          .from("follows")
          .insert({ follower_id: user.id, following_id: userId });
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

      if (error || !data) return null;
      const newList = data as ShowList;
      setMyLists((prev) => [newList, ...prev]);
      return newList;
    },
    [user]
  );

  const deleteList = useCallback(
    async (listId: string) => {
      await supabase.from("lists").delete().eq("id", listId);
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
      await supabase
        .from("list_items")
        .delete()
        .eq("list_id", listId)
        .eq("show_id", showId);
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
      }}
    >
      {children}
    </SocialContext.Provider>
  );
}
