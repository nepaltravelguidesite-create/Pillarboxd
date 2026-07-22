import { NavLink, useNavigate } from "react-router-dom";
import {
  Home, Tv, BookOpen, Star, Bookmark, List, Heart,
  Settings, LogOut, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const MENU_ITEMS = [
  { to: "/", icon: Home, label: "Home", end: true },
  { to: "/shows", icon: Tv, label: "Shows", end: true },
  { to: "/log", icon: BookOpen, label: "Diary", end: true },
  { to: "/journal", icon: Star, label: "Reviews", end: true },
  { to: "/shows?filter=watchlist", icon: Bookmark, label: "Watchlist", end: true },
  { to: "/lists", icon: List, label: "Lists", end: true },
  { to: "/journal?filter=likes", icon: Heart, label: "Likes", end: true },
  { to: "/settings", icon: Settings, label: "Settings", end: true },
] as const;

interface SlideOutMenuProps {
  open: boolean;
  onClose: () => void;
}

export function SlideOutMenu({ open, onClose }: SlideOutMenuProps) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    onClose();
    await signOut();
    navigate("/login");
  };

  return (
    <>
      {/* Overlay */}
      <div
        className={cn(
          "fixed inset-0 z-50 bg-black/50 backdrop-blur-sm transition-opacity duration-200",
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />

      {/* Drawer */}
      <aside
        className={cn(
          "fixed top-0 left-0 bottom-0 z-50 w-[80vw] max-w-xs bg-nav border-r border-border/60",
          "transition-transform duration-200 ease-out flex flex-col",
          open ? "translate-x-0" : "-translate-x-full"
        )}
        style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
          aria-label="Close menu"
        >
          <X className="size-5" />
        </button>

        {/* Profile header */}
        <div className="p-4 pt-6 pb-5 border-b border-border/40">
          <button
            onClick={() => {
              onClose();
              navigate("/profile");
            }}
            className="flex items-center gap-3 w-full text-left"
          >
            <Avatar className="size-12 border border-border/40 shrink-0">
              <AvatarImage src={user?.avatarUrl} alt={user?.displayName} />
              <AvatarFallback className="bg-secondary text-foreground text-sm font-semibold">
                {user?.displayName?.charAt(0).toUpperCase() ?? "?"}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground truncate">
                {user?.displayName ?? "User"}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                @{user?.username ?? "unknown"}
              </p>
            </div>
          </button>
        </div>

        {/* Nav list */}
        <nav className="flex-1 overflow-y-auto p-2">
          <div className="space-y-0.5">
            {MENU_ITEMS.map(({ to, icon: Icon, label, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                onClick={onClose}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors duration-150",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-foreground/70 hover:text-foreground hover:bg-secondary/50"
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      className={cn("size-4.5 shrink-0", isActive && "text-primary")}
                    />
                    <span>{label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </nav>

        {/* Logout */}
        <div className="p-2 border-t border-border/40">
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors duration-150 w-full"
          >
            <LogOut className="size-4.5 shrink-0" />
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
}
