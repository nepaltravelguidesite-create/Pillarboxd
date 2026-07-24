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

export type WatchStatus = 'watching' | 'completed' | 'want_to_watch' | 'on_hold' | 'dropped';

export interface UserShow {
  id: string;
  user_id: string;
  show_id: number;
  show_name: string;
  show_poster_path: string | null;
  show_backdrop_path: string | null;
  show_first_air_date: string | null;
  rating: number | null;
  liked: boolean;
  watchlisted: boolean;
  status: WatchStatus | null;
  created_at: string;
  updated_at: string;
}

export interface UserLog {
  id: string;
  user_id: string;
  show_id: number;
  show_name: string;
  show_poster_path: string | null;
  show_backdrop_path: string | null;
  show_first_air_date: string | null;
  watched_date: string | null;
  seasons_watched: number;
  episodes_watched: number;
  review: string | null;
  rewatch: boolean;
  rating: number | null;
  contains_spoiler: boolean;
  vibe_tag: string | null;
  season_number: number | null;
  created_at: string;
}

interface UserDataContextValue {
  userShows: UserShow[];
  userLogs: UserLog[];
  loading: boolean;
  getShowData: (showId: number) => UserShow | null;
  setRating: (show: TVShow, rating: number | null) => Promise<void>;
  toggleLike: (show: TVShow) => Promise<void>;
  toggleWatchlist: (show: TVShow) => Promise<void>;
  setShowStatus: (show: TVShow, status: WatchStatus | null) => Promise<void>;
  addLog: (log: Omit<UserLog, "id" | "user_id" | "created_at">) => Promise<void>;
  updateLog: (logId: string, patch: Partial<Omit<UserLog, "id" | "user_id" | "created_at">>) => Promise<void>;
  deleteLog: (logId: string) => Promise<void>;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const UserDataContext = createContext<UserDataContextValue | null>(null);

export function useUserData(): UserDataContextValue {
  const ctx = useContext(UserDataContext);
  if (!ctx) throw new Error("useUserData must be used within UserDataProvider");
  return ctx;
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function UserDataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [userShows, setUserShows] = useState<UserShow[]>([]);
  const [userLogs, setUserLogs] = useState<UserLog[]>([]);
  const [loading, setLoading] = useState(true);

  // -------------------------------------------------------------------------
  // Load all user data on sign in
  // -------------------------------------------------------------------------

  const loadData = useCallback(async () => {
    if (!user) {
      setUserShows([]);
      setUserLogs([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [showsRes, logsRes] = await Promise.all([
        supabase.from("user_shows").select("*").eq("user_id", user.id),
        supabase
          .from("user_logs")
          .select("*")
          .eq("user_id", user.id)
          .order("watched_date", { ascending: false, nullsFirst: false })
          .order("created_at", { ascending: false }),
      ]);

      if (showsRes.data) setUserShows(showsRes.data as UserShow[]);
      if (logsRes.data) setUserLogs(logsRes.data as UserLog[]);
    } catch (err) {
      console.error("[UserData] Failed to load:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  function denormalizeShow(show: TVShow) {
    return {
      show_id: show.id,
      show_name: show.name,
      show_poster_path: show.poster_path,
      show_backdrop_path: show.backdrop_path,
      show_first_air_date: show.first_air_date || null,
    };
  }

  // -------------------------------------------------------------------------
  // getShowData — local lookup
  // -------------------------------------------------------------------------

  const getShowData = useCallback(
    (showId: number) => userShows.find((s) => s.show_id === showId) ?? null,
    [userShows]
  );

  // -------------------------------------------------------------------------
  // setRating — atomic upsert (null clears rating)
  // Spreads any existing row so other fields (liked/watchlisted/status) are
  // preserved on conflict; only rating is changed.
  // -------------------------------------------------------------------------

  const setRating = useCallback(
    async (show: TVShow, rating: number | null) => {
      if (!user) return;

      const existing = userShows.find((s) => s.show_id === show.id);
      const { data, error } = await supabase
        .from("user_shows")
        .upsert(
          {
            ...(existing ?? { rating: null, liked: false, watchlisted: false, status: null }),
            ...denormalizeShow(show),
            user_id: user.id,
            rating,
          },
          { onConflict: "user_id,show_id" }
        )
        .select()
        .single();

      if (error) {
        console.error("[UserData] setRating upsert error:", error);
        toast.error("Failed to save rating");
        return;
      }

      setUserShows((prev) => {
        const idx = prev.findIndex((s) => s.show_id === show.id);
        if (idx === -1) return [...prev, data as UserShow];
        const next = [...prev];
        next[idx] = data as UserShow;
        return next;
      });
    },
    [user, userShows]
  );

  // -------------------------------------------------------------------------
  // toggleLike
  // -------------------------------------------------------------------------

  const toggleLike = useCallback(
    async (show: TVShow) => {
      if (!user) return;

      const existing = userShows.find((s) => s.show_id === show.id);
      const newLiked = existing ? !existing.liked : true;
      const { data, error } = await supabase
        .from("user_shows")
        .upsert(
          {
            ...(existing ?? { rating: null, liked: false, watchlisted: false, status: null }),
            ...denormalizeShow(show),
            user_id: user.id,
            liked: newLiked,
          },
          { onConflict: "user_id,show_id" }
        )
        .select()
        .single();

      if (error) {
        console.error("[UserData] toggleLike upsert error:", error);
        toast.error("Failed to update like");
        return;
      }

      setUserShows((prev) => {
        const idx = prev.findIndex((s) => s.show_id === show.id);
        if (idx === -1) return [...prev, data as UserShow];
        const next = [...prev];
        next[idx] = data as UserShow;
        return next;
      });
    },
    [user, userShows]
  );

  // -------------------------------------------------------------------------
  // toggleWatchlist
  // -------------------------------------------------------------------------

  const toggleWatchlist = useCallback(
    async (show: TVShow) => {
      if (!user) return;

      const existing = userShows.find((s) => s.show_id === show.id);
      const newWatchlisted = existing ? !existing.watchlisted : true;
      const { data, error } = await supabase
        .from("user_shows")
        .upsert(
          {
            ...(existing ?? { rating: null, liked: false, watchlisted: false, status: null }),
            ...denormalizeShow(show),
            user_id: user.id,
            watchlisted: newWatchlisted,
          },
          { onConflict: "user_id,show_id" }
        )
        .select()
        .single();

      if (error) {
        console.error("[UserData] toggleWatchlist upsert error:", error);
        toast.error("Failed to update watchlist");
        return;
      }

      setUserShows((prev) => {
        const idx = prev.findIndex((s) => s.show_id === show.id);
        if (idx === -1) return [...prev, data as UserShow];
        const next = [...prev];
        next[idx] = data as UserShow;
        return next;
      });
    },
    [user, userShows]
  );

  // -------------------------------------------------------------------------
  // setShowStatus
  // -------------------------------------------------------------------------

  const setShowStatus = useCallback(
    async (show: TVShow, status: WatchStatus | null) => {
      if (!user) return;

      const existing = userShows.find((s) => s.show_id === show.id);
      // Preserve existing watchlisted unless this is a fresh row setting want_to_watch
      const watchlisted = existing
        ? existing.watchlisted
        : status === 'want_to_watch';
      const { data, error } = await supabase
        .from("user_shows")
        .upsert(
          {
            ...(existing ?? { rating: null, liked: false, watchlisted: false, status: null }),
            ...denormalizeShow(show),
            user_id: user.id,
            watchlisted,
            status,
          },
          { onConflict: "user_id,show_id" }
        )
        .select()
        .single();

      if (error) {
        console.error("[UserData] setShowStatus upsert error:", error);
        toast.error("Failed to update status");
        return;
      }

      setUserShows((prev) => {
        const idx = prev.findIndex((s) => s.show_id === show.id);
        if (idx === -1) return [...prev, data as UserShow];
        const next = [...prev];
        next[idx] = data as UserShow;
        return next;
      });
    },
    [user, userShows]
  );

  // -------------------------------------------------------------------------
  // addLog — insert a diary entry
  // -------------------------------------------------------------------------

  const addLog = useCallback(
    async (log: Omit<UserLog, "id" | "user_id" | "created_at">) => {
      if (!user) return;

      const { data, error } = await supabase
        .from("user_logs")
        .insert({ ...log, user_id: user.id })
        .select()
        .single();

      if (error) {
        console.error("[UserData] addLog error:", error);
        toast.error("Failed to save diary entry");
        return;
      }

      setUserLogs((prev) => [data as UserLog, ...prev]);
    },
    [user]
  );

  // -------------------------------------------------------------------------
  // updateLog
  // -------------------------------------------------------------------------

  const updateLog = useCallback(
    async (logId: string, patch: Partial<Omit<UserLog, "id" | "user_id" | "created_at">>) => {
      const { data, error } = await supabase
        .from("user_logs")
        .update(patch)
        .eq("id", logId)
        .select()
        .single();

      if (error) {
        console.error("[UserData] updateLog error:", error);
        toast.error("Failed to update diary entry");
        return;
      }

      setUserLogs((prev) => prev.map((l) => (l.id === logId ? (data as UserLog) : l)));
    },
    []
  );

  // -------------------------------------------------------------------------
  // deleteLog
  // -------------------------------------------------------------------------

  const deleteLog = useCallback(
    async (logId: string) => {
      const { error } = await supabase
        .from("user_logs")
        .delete()
        .eq("id", logId);

      if (error) {
        console.error("[UserData] deleteLog error:", error);
        toast.error("Failed to delete diary entry");
        return;
      }

      setUserLogs((prev) => prev.filter((l) => l.id !== logId));
    },
    []
  );

  return (
    <UserDataContext.Provider
      value={{
        userShows,
        userLogs,
        loading,
        getShowData,
        setRating,
        toggleLike,
        toggleWatchlist,
        setShowStatus,
        addLog,
        updateLog,
        deleteLog,
      }}
    >
      {children}
    </UserDataContext.Provider>
  );
}
