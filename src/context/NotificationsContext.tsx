import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Notification type — matches the `type` text column on the `notifications`
 * table. Drives the icon + link target shown in the bell dropdown.
 */
export type NotificationType =
  | "like"
  | "comment"
  | "follow"
  | "mention"
  | "system";

export interface Notification {
  id: string;
  user_id: string;
  actor_id: string | null;
  type: NotificationType;
  entity_id: string | null;
  entity_type: string | null;
  message: string;
  read: boolean;
  created_at: string;
  /** Joined from `profiles` on actor_id — used to build deep links. */
  actor_username?: string | null;
  actor_display_name?: string | null;
  actor_avatar_url?: string | null;
}

interface NotificationsContextValue {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  loading: boolean;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const NotificationsContext = createContext<NotificationsContextValue | null>(
  null
);

export function useNotifications(): NotificationsContextValue {
  const ctx = useContext(NotificationsContext);
  if (!ctx)
    throw new Error("useNotifications must be used within NotificationsProvider");
  return ctx;
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  // Keep the latest user id in a ref so the real-time callback (subscribed
  // once) can always read the current value without re-subscribing.
  const userIdRef = useRef<string | null>(null);
  userIdRef.current = user?.id ?? null;

  // -------------------------------------------------------------------------
  // Load notifications for the current user (with the triggering actor's
  // profile joined in so we can link to /profile/<username>).
  // -------------------------------------------------------------------------

  const loadNotifications = useCallback(async () => {
    const uid = userIdRef.current;
    if (!uid) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from("notifications")
      .select(
        "id, user_id, actor_id, type, entity_id, entity_type, message, read, created_at, actor:profiles!actor_id(username, display_name, avatar_url)"
      )
      .eq("user_id", uid)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("[Notifications] load error:", error);
      setNotifications([]);
      setLoading(false);
      return;
    }

    const mapped: Notification[] = (data ?? []).map((row: any) => ({
      id: row.id,
      user_id: row.user_id,
      actor_id: row.actor_id,
      type: row.type as NotificationType,
      entity_id: row.entity_id,
      entity_type: row.entity_type,
      message: row.message,
      read: row.read,
      created_at: row.created_at,
      actor_username: row.actor?.username ?? null,
      actor_display_name: row.actor?.display_name ?? null,
      actor_avatar_url: row.actor?.avatar_url ?? null,
    }));

    setNotifications(mapped);
    setLoading(false);
  }, []);

  // -------------------------------------------------------------------------
  // Load on sign in, clear on sign out
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (user) {
      loadNotifications();
    } else {
      setNotifications([]);
      setLoading(false);
    }
  }, [user, loadNotifications]);

  // -------------------------------------------------------------------------
  // Real-time subscription — listen for INSERTs on notifications owned by the
  // current user and prepend them. Subscribed once; reads the live user id
  // from the ref so it survives sign-in/out without tearing down the channel.
  // -------------------------------------------------------------------------

  useEffect(() => {
    const channel = supabase
      .channel("notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          // Supabase RLS filters this on the server; the filter here is a
          // hint so stray events for other users are dropped client-side too.
          filter: `user_id=eq.${userIdRef.current ?? ""}`,
        },
        (payload) => {
          const uid = userIdRef.current;
          if (!uid) return;
          const row = payload.new as Notification;
          if (row.user_id !== uid) return;
          setNotifications((prev) => {
            if (prev.some((n) => n.id === row.id)) return prev;
            return [row, ...prev];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  // -------------------------------------------------------------------------
  // markAsRead — optimistic update
  // -------------------------------------------------------------------------

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    supabase
      .from("notifications")
      .update({ read: true })
      .eq("id", id)
      .then(({ error }) => {
        if (error) console.error("[Notifications] markAsRead:", error);
      });
  }, []);

  // -------------------------------------------------------------------------
  // markAllAsRead
  // -------------------------------------------------------------------------

  const markAllAsRead = useCallback(() => {
    const uid = userIdRef.current;
    if (!uid) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", uid)
      .eq("read", false)
      .then(({ error }) => {
        if (error) console.error("[Notifications] markAllAsRead:", error);
      });
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotificationsContext.Provider
      value={{ notifications, unreadCount, markAsRead, markAllAsRead, loading }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}
