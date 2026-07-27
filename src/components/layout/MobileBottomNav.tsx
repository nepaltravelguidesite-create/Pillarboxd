import { NavLink } from "react-router-dom";
import { Home, Compass, BookOpen, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNotifications } from "@/context/NotificationsContext";

const NAV_ITEMS = [
  { to: "/", icon: Home, label: "Home", end: true },
  { to: "/shows", icon: Compass, label: "Explore", end: false },
  { to: "/journal", icon: BookOpen, label: "Diary", end: false },
  { to: "/profile", icon: User, label: "Profile", end: false },
] as const;

export function MobileBottomNav() {
  const { unreadCount } = useNotifications();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 bg-nav/95 backdrop-blur-md border-t border-border/60 md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="flex items-stretch justify-around h-14">
        {NAV_ITEMS.map(({ to, icon: Icon, label, end }) => {
          // Show unread badge on Activity nav
          const showBadge = to === "/journal" && unreadCount > 0;

          return (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  "relative flex flex-1 flex-col items-center justify-center gap-0.5 transition-colors duration-150",
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )
              }
            >
              {({ isActive }) => (
                <>
                  {/* Top indicator bar */}
                  {isActive && (
                    <span className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-8 rounded-full bg-primary" />
                  )}
                  <div className="relative">
                    <Icon
                      className={cn(
                        "size-5 transition-transform duration-150",
                        isActive && "scale-110"
                      )}
                      fill={isActive ? "currentColor" : "none"}
                      strokeWidth={isActive ? 0 : 2}
                    />
                    {showBadge && (
                      <span className="absolute -top-1 -right-1.5 min-w-3.5 h-3.5 px-1 flex items-center justify-center rounded-full bg-destructive text-white text-[9px] font-bold leading-none">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}
                  </div>
                  <span className={cn(
                    "text-[10px] font-medium tracking-wide",
                    isActive && "font-semibold"
                  )}>
                    {label}
                  </span>
                </>
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
