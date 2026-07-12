import { useState } from "react";
import { Link } from "react-router-dom";
import { Bell, Heart, MessageCircle, UserPlus, AtSign, Info } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useNotifications, type Notification } from "@/context/NotificationsContext";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Compact relative time, e.g. "just now", "3m", "2h", "5d". */
function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const seconds = Math.floor((Date.now() - then) / 1000);
  if (seconds < 45) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo`;
  return `${Math.floor(days / 365)}y`;
}

/** Pick an icon for the notification type. */
function NotificationIcon({ type }: { type: Notification["type"] }) {
  const base = "size-4 shrink-0";
  switch (type) {
    case "like":
      return <Heart className={cn(base, "text-rose-500")} aria-hidden />;
    case "comment":
      return <MessageCircle className={cn(base, "text-sky-500")} aria-hidden />;
    case "follow":
      return <UserPlus className={cn(base, "text-emerald-500")} aria-hidden />;
    case "mention":
      return <AtSign className={cn(base, "text-amber-500")} aria-hidden />;
    default:
      return <Info className={cn(base, "text-muted-foreground")} aria-hidden />;
  }
}

/** Resolve the deep link for a notification. */
function notificationHref(n: Notification): string | null {
  if (n.type === "follow") {
    return n.actor_username ? `/profile/${n.actor_username}` : null;
  }
  // Likes/comments on a log or review point back to the log page.
  if (n.entity_type === "log" || n.type === "like" || n.type === "comment") {
    return "/log";
  }
  return null;
}

// ---------------------------------------------------------------------------
// Notification item
// ---------------------------------------------------------------------------

function NotificationItem({
  n,
  onNavigate,
}: {
  n: Notification;
  onNavigate: () => void;
}) {
  const { markAsRead } = useNotifications();
  const href = notificationHref(n);

  const handleClick = () => {
    if (!n.read) markAsRead(n.id);
    onNavigate();
  };

  const inner = (
    <>
      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary/60">
        {n.actor_avatar_url ? (
          <img
            src={n.actor_avatar_url}
            alt=""
            className="size-8 rounded-full object-cover"
          />
        ) : (
          <NotificationIcon type={n.type} />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "text-xs leading-snug",
            n.read ? "text-foreground/60" : "text-foreground"
          )}
        >
          {n.message}
        </p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          {relativeTime(n.created_at)}
        </p>
      </div>

      {!n.read && (
        <span
          aria-hidden
          className="mt-1 size-2 shrink-0 rounded-full bg-primary"
        />
      )}
    </>
  );

  const itemClass = cn(
    "flex items-start gap-3 px-3 py-2.5 rounded-md transition-colors",
    "hover:bg-secondary/40",
    n.read ? "opacity-70" : "opacity-100"
  );

  if (href) {
    return (
      <Link to={href} onClick={handleClick} className={cn(itemClass, "block")}>
        {inner}
      </Link>
    );
  }
  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(itemClass, "w-full text-left")}
    >
      {inner}
    </button>
  );
}

// ---------------------------------------------------------------------------
// NotificationBell
// ---------------------------------------------------------------------------

export function NotificationBell() {
  const { user } = useAuth();
  const { notifications, unreadCount, markAllAsRead, loading } =
    useNotifications();
  const [open, setOpen] = useState(false);

  // If not signed in, don't render the bell at all.
  if (!user) return null;

  const hasUnread = unreadCount > 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Notifications${hasUnread ? ` (${unreadCount} unread)` : ""}`}
          aria-expanded={open}
          className={cn(
            "relative flex items-center justify-center size-8 rounded",
            "text-muted-foreground hover:text-foreground",
            "hover:bg-secondary/50 transition-colors duration-150",
            "focus:outline-none focus:ring-2 focus:ring-ring/40"
          )}
        >
          <Bell className="size-5" strokeWidth={2} aria-hidden />
          {hasUnread && (
            <span
              aria-hidden
              className={cn(
                "absolute -top-0.5 -right-0.5 flex items-center justify-center",
                "min-w-[16px] h-4 px-1 rounded-full",
                "bg-primary text-background text-[10px] font-bold leading-none",
                "ring-2 ring-background"
              )}
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={6}
        className="w-80 p-0 bg-background text-foreground border-border"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
          <h2 className="font-display text-sm font-semibold text-foreground">
            Notifications
          </h2>
          {hasUnread && (
            <span className="text-[11px] font-medium text-muted-foreground">
              {unreadCount} unread
            </span>
          )}
        </div>

        {/* Body */}
        <div className="max-h-[360px] overflow-y-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
              <Bell
                className="size-7 text-muted-foreground/50 mb-2"
                strokeWidth={1.5}
                aria-hidden
              />
              <p className="text-xs text-muted-foreground">Loading…</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-secondary/60 mb-3">
                <Bell
                  className="size-6 text-muted-foreground"
                  strokeWidth={1.5}
                  aria-hidden
                />
              </div>
              <p className="font-display text-sm font-medium text-foreground">
                No notifications yet
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                When people interact with you, you&apos;ll see it here.
              </p>
            </div>
          ) : (
            <ul className="py-1">
              {notifications.map((n) => (
                <li key={n.id} className="px-1">
                  <NotificationItem
                    n={n}
                    onNavigate={() => setOpen(false)}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer — mark all as read */}
        {notifications.length > 0 && (
          <div className="border-t border-border p-1.5">
            <button
              type="button"
              onClick={() => markAllAsRead()}
              disabled={!hasUnread}
              className={cn(
                "w-full flex items-center justify-center h-8 rounded text-xs font-semibold",
                "transition-colors duration-150",
                hasUnread
                  ? "text-primary hover:bg-primary/10"
                  : "text-muted-foreground/50 cursor-not-allowed"
              )}
            >
              Mark all as read
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
