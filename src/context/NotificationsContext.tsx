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
 * Notification type - matches the `type` text column on the `notifications`
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
  /** Joined from `profiles` on actor_id - used to build deep links. */
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
  null,
);

export function useNotifications(): NotificationsContextValue {
  const ctx = useContext(NotificationsContext);
  if (!ctx)
    throw new Error(
      "useNotifications must be used within NotificationsProvider",
    );
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
        "id, user_id, actor_id, type, entity_id, entity_type, message, read, created_at",
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

    const rows = (data ?? []) as any[];

    // Fetch actor profiles separately - the notifications.actor_id FK
    // references auth.users (not profiles), so PostgREST can't resolve an
    // embedded `profiles!actor_id` join. We resolve them in a second query.
    const actorIds = Array.from(
      new Set(rows.map((r) => r.actor_id).filter((id): id is string => !!id)),
    );

    const actorMap: Record<
      string,
      {
        username: string | null;
        display_name: string | null;
        avatar_url: string | null;
      }
    > = {};
    if (actorIds.length > 0) {
      const { data: actors } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url")
        .in("id", actorIds);
      for (const a of (actors ?? []) as any[]) {
        actorMap[a.id] = {
          username: a.username ?? null,
          display_name: a.display_name ?? null,
          avatar_url: a.avatar_url ?? null,
        };
      }
    }

    const mapped: Notification[] = rows.map((row) => {
      const actor = row.actor_id ? actorMap[row.actor_id] : undefined;
      return {
        id: row.id,
        user_id: row.user_id,
        actor_id: row.actor_id,
        type: row.type as NotificationType,
        entity_id: row.entity_id,
        entity_type: row.entity_type,
        message: row.message,
        read: row.read,
        created_at: row.created_at,
        actor_username: actor?.username ?? null,
        actor_display_name: actor?.display_name ?? null,
        actor_avatar_url: actor?.avatar_url ?? null,
      };
    });

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
  // Real-time subscription - listen for INSERTs on notifications owned by the
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
          const row = payload.new as any;
          if (row.user_id !== uid) return;

          // Build the notification with actor info resolved asynchronously.
          const baseNotif: Notification = {
            id: row.id,
            user_id: row.user_id,
            actor_id: row.actor_id,
            type: row.type as NotificationType,
            entity_id: row.entity_id,
            entity_type: row.entity_type,
            message: row.message,
            read: row.read,
            created_at: row.created_at,
            actor_username: null,
            actor_display_name: null,
            actor_avatar_url: null,
          };

          setNotifications((prev) => {
            if (prev.some((n) => n.id === row.id)) return prev;
            return [baseNotif, ...prev];
          });

          // Resolve actor profile info after inserting the row.
          if (row.actor_id) {
            supabase
              .from("profiles")
              .select("id, username, display_name, avatar_url")
              .eq("id", row.actor_id)
              .maybeSingle()
              .then(({ data: actor }) => {
                if (!actor) return;
                setNotifications((prev) =>
                  prev.map((n) =>
                    n.id === row.id
                      ? {
                          ...n,
                          actor_username: (actor as any).username ?? null,
                          actor_display_name:
                            (actor as any).display_name ?? null,
                          actor_avatar_url: (actor as any).avatar_url ?? null,
                        }
                      : n,
                  ),
                );
              });
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  // -------------------------------------------------------------------------
  // markAsRead - optimistic update
  // -------------------------------------------------------------------------

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
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
