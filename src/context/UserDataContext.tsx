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
  watched_date: string;
  seasons_watched: number;
  episodes_watched: number;
  review: string | null;
  rewatch: boolean;
  rating: number | null;
  contains_spoiler: boolean;
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
          .order("watched_date", { ascending: false })
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
  // setRating — upsert rating (null clears it)
  // -------------------------------------------------------------------------

  const setRating = useCallback(
    async (show: TVShow, rating: number | null) => {
      if (!user) return;

      const existing = userShows.find((s) => s.show_id === show.id);

      if (existing) {
        const { error } = await supabase
          .from("user_shows")
          .update({ rating })
          .eq("id", existing.id);

        if (error) {
          console.error("[UserData] setRating error:", error);
          toast.error("Failed to save rating");
          return;
        }

        setUserShows((prev) =>
          prev.map((s) => (s.id === existing.id ? { ...s, rating } : s))
        );
      } else {
        const { data, error } = await supabase
          .from("user_shows")
          .insert({
            ...denormalizeShow(show),
            user_id: user.id,
            rating,
            liked: false,
            watchlisted: false,
          })
          .select()
          .single();

        if (error) {
          console.error("[UserData] setRating insert error:", error);
          toast.error("Failed to save rating");
          return;
        }

        setUserShows((prev) => [...prev, data as UserShow]);
      }
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

      if (existing) {
        const { error } = await supabase
          .from("user_shows")
          .update({ liked: newLiked })
          .eq("id", existing.id);

        if (error) {
          console.error("[UserData] toggleLike error:", error);
          toast.error("Failed to update like");
          return;
        }

        setUserShows((prev) =>
          prev.map((s) => (s.id === existing.id ? { ...s, liked: newLiked } : s))
        );
      } else {
        const { data, error } = await supabase
          .from("user_shows")
          .insert({
            ...denormalizeShow(show),
            user_id: user.id,
            rating: null,
            liked: true,
            watchlisted: false,
          })
          .select()
          .single();

        if (error) {
          console.error("[UserData] toggleLike insert error:", error);
          toast.error("Failed to update like");
          return;
        }

        setUserShows((prev) => [...prev, data as UserShow]);
      }
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

      if (existing) {
        const { error } = await supabase
          .from("user_shows")
          .update({ watchlisted: newWatchlisted })
          .eq("id", existing.id);

        if (error) {
          console.error("[UserData] toggleWatchlist error:", error);
          toast.error("Failed to update watchlist");
          return;
        }

        setUserShows((prev) =>
          prev.map((s) =>
            s.id === existing.id ? { ...s, watchlisted: newWatchlisted } : s
          )
        );
      } else {
        const { data, error } = await supabase
          .from("user_shows")
          .insert({
            ...denormalizeShow(show),
            user_id: user.id,
            rating: null,
            liked: false,
            watchlisted: true,
          })
          .select()
          .single();

        if (error) {
          console.error("[UserData] toggleWatchlist insert error:", error);
          toast.error("Failed to update watchlist");
          return;
        }

        setUserShows((prev) => [...prev, data as UserShow]);
      }
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

      if (existing) {
        const { error } = await supabase
          .from("user_shows")
          .update({ status })
          .eq("id", existing.id);

        if (error) {
          console.error("[UserData] setShowStatus error:", error);
          toast.error("Failed to update status");
          return;
        }

        setUserShows((prev) =>
          prev.map((s) => (s.id === existing.id ? { ...s, status } : s))
        );
      } else {
        const { data, error } = await supabase
          .from("user_shows")
          .insert({
            ...denormalizeShow(show),
            user_id: user.id,
            rating: null,
            liked: false,
            watchlisted: status === 'want_to_watch',
            status,
          })
          .select()
          .single();

        if (error) {
          console.error("[UserData] setShowStatus insert error:", error);
          toast.error("Failed to update status");
          return;
        }

        setUserShows((prev) => [...prev, data as UserShow]);
      }
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
        deleteLog,
      }}
    >
      {children}
    </UserDataContext.Provider>
  );
}
