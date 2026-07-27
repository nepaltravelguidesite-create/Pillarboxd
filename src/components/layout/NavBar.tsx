import { useState, useEffect, useRef } from "react";
import { NavLink, Link, useLocation } from "react-router-dom";
import { Menu, X, Plus, User, LogIn, LogOut, Settings, Search } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useUI } from "@/context/UIContext";
import { SearchBar } from "@/components/layout/SearchBar";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { AftershowLogo } from "@/components/brand/AftershowLogo";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Desktop nav links
// ---------------------------------------------------------------------------

const NAV_LINKS = [
  { to: "/shows", label: "Shows" },
  { to: "/lists", label: "Lists" },
  { to: "/members", label: "Members" },
  { to: "/journal", label: "Journal" },
] as const;

function DesktopNavLinks() {
  return (
    <nav aria-label="Main navigation" className="hidden md:flex items-center gap-0.5">
      {NAV_LINKS.map(({ to, label }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            cn(
              "relative px-4 py-1.5 text-xs font-bold uppercase tracking-widest rounded-full",
              "transition-colors duration-200",
              isActive
                ? "bg-primary/20 text-primary"
                : "text-foreground/55 hover:text-foreground hover:bg-secondary/50"
            )
          }
        >
          {label}
        </NavLink>
      ))}
    </nav>
  );
}

// ---------------------------------------------------------------------------
// Log button
// ---------------------------------------------------------------------------

function LogButton({ className }: { className?: string }) {
  return (
    <Link
      to="/log"
      aria-label="Log a show"
      className={cn(
        "flex items-center gap-1.5 shrink-0",
        "h-8 px-4 rounded-full",
        "bg-primary text-primary-foreground font-bold text-xs uppercase tracking-widest",
        "hover:bg-primary/90 active:scale-95",
        "transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-ring/40",
        className
      )}
    >
      <Plus className="size-3.5" strokeWidth={2.5} aria-hidden />
      <span>Log</span>
    </Link>
  );
}

// ---------------------------------------------------------------------------
// User area (sign in / avatar / sign out)
// ---------------------------------------------------------------------------

function UserArea({ className }: { className?: string }) {
  const { user, signOut } = useAuth();
  const { openAuthModal } = useUI();

  if (user) {
    return (
      <div className={cn("flex items-center gap-2 shrink-0", className)}>
        <Link
          to="/profile"
          aria-label={`Profile: ${user.displayName}`}
          className={cn(
            "flex items-center gap-2 shrink-0",
            "h-8 px-2.5 rounded-full border border-border",
            "text-xs font-medium text-foreground/80 hover:text-foreground",
            "hover:border-primary/50 transition-colors duration-150"
          )}
        >
          {user.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={user.displayName}
              className="size-5 rounded-full object-cover"
            />
          ) : (
            <User className="size-4 text-muted-foreground" strokeWidth={2} aria-hidden />
          )}
          <span className="hidden lg:block max-w-[100px] truncate">{user.displayName}</span>
        </Link>
        <Link
          to="/settings"
          aria-label="Settings"
          className={cn(
            "flex items-center justify-center size-8 rounded",
            "text-muted-foreground hover:text-foreground",
            "hover:bg-secondary/50 transition-colors duration-150"
          )}
        >
          <Settings className="size-4" strokeWidth={2} />
        </Link>
        <button
          type="button"
          onClick={() => signOut()}
          aria-label="Sign out"
          className={cn(
            "flex items-center justify-center size-8 rounded-full",
            "text-muted-foreground hover:text-foreground",
            "hover:bg-secondary/50 transition-colors duration-150"
          )}
        >
          <LogOut className="size-4" strokeWidth={2} />
        </button>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-2 shrink-0", className)}>
      <button
        type="button"
        onClick={() => openAuthModal("signin")}
        className={cn(
          "h-8 px-4 flex items-center gap-1.5",
          "text-xs font-bold uppercase tracking-widest rounded-full",
          "text-foreground/70 hover:text-foreground",
          "transition-colors duration-150"
        )}
      >
        <LogIn className="size-4" strokeWidth={2} aria-hidden />
        <span className="hidden sm:block">Sign In</span>
      </button>
      <button
        type="button"
        onClick={() => openAuthModal("signup")}
        className={cn(
          "h-8 px-4 flex items-center",
          "text-xs font-bold uppercase tracking-widest rounded-full",
          "border border-border text-foreground/70 hover:text-foreground hover:border-foreground/40",
          "transition-colors duration-150"
        )}
      >
        <span>Create account</span>
      </button>
    </div>
  );
}

function CollapsibleSearch() {
  const [expanded, setExpanded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setExpanded(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={containerRef} className="relative flex items-center shrink-0">
      {expanded ? (
        <div className="w-48 md:w-56 lg:w-72 xl:w-80">
          <SearchBar />
        </div>
      ) : (
        <button
          type="button"
          aria-label="Search shows"
          onClick={() => setExpanded(true)}
          className={cn(
            "flex items-center justify-center size-8 rounded-full",
            "text-muted-foreground hover:text-foreground",
            "hover:bg-secondary/50 transition-colors duration-150"
          )}
        >
          <Search className="size-4" strokeWidth={2} aria-hidden />
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Mobile drawer
// ---------------------------------------------------------------------------

function MobileDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { openAuthModal } = useUI();

  useEffect(() => {
    onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <div
        aria-hidden
        onClick={onClose}
        className={cn(
          "fixed inset-0 z-40 bg-black/60 backdrop-blur-sm",
          "transition-opacity duration-200",
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
      />

      <div
        role="dialog"
        aria-modal
        aria-label="Navigation menu"
        className={cn(
          "fixed inset-y-0 right-0 z-50 w-72 max-w-[85vw]",
          "flex flex-col bg-card border-l border-border",
          "transition-transform duration-300 ease-out",
          open ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
          <Link to="/" onClick={onClose}>
            <AftershowLogo size={22} />
          </Link>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="p-1.5 rounded-full text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="size-5" strokeWidth={2} aria-hidden />
          </button>
        </div>

        <div className="px-4 py-3 border-b border-border shrink-0">
          <SearchBar />
        </div>

        <nav
          aria-label="Mobile main navigation"
          className="flex-1 overflow-y-auto py-4"
        >
          <ul className="flex flex-col gap-0.5 px-2">
            {NAV_LINKS.map(({ to, label }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center px-4 py-2.5 rounded-full text-sm font-medium",
                      "transition-colors duration-100",
                      isActive
                        ? "bg-primary/20 text-primary"
                        : "text-foreground/70 hover:text-foreground hover:bg-secondary/50"
                    )
                  }
                >
                  {label}
                </NavLink>
              </li>
            ))}

            {/* Removed horizontal line to match sleek mockup */}

            {user ? (
              <>
                <li>
                  <NavLink
                    to="/profile"
                    className={({ isActive }) =>
                      cn(
                        "flex items-center gap-2.5 px-4 py-2.5 rounded-full text-sm font-medium",
                        "transition-colors duration-100",
                        isActive
                          ? "bg-primary/20 text-primary"
                          : "text-foreground/70 hover:text-foreground hover:bg-secondary/50"
                      )
                    }
                  >
                    <User className="size-4 shrink-0" strokeWidth={2} aria-hidden />
                    <span>Profile</span>
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to="/settings"
                    onClick={onClose}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center gap-2.5 w-full px-4 py-2.5 rounded-full text-sm font-medium",
                        isActive
                          ? "bg-primary/20 text-primary"
                          : "text-foreground/70 hover:text-foreground hover:bg-secondary/50"
                      )
                    }
                  >
                    <Settings className="size-4 shrink-0" strokeWidth={2} aria-hidden />
                    <span>Settings</span>
                  </NavLink>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => {
                      signOut();
                      onClose();
                    }}
                    className={cn(
                      "flex items-center gap-2.5 w-full px-4 py-2.5 rounded-full text-sm font-medium",
                      "text-foreground/70 hover:text-foreground hover:bg-secondary/50",
                      "transition-colors duration-100"
                    )}
                  >
                    <LogOut className="size-4 shrink-0" strokeWidth={2} aria-hidden />
                    <span>Sign Out</span>
                  </button>
                </li>
              </>
            ) : (
              <>
                <li>
                  <button
                    type="button"
                    onClick={() => {
                      openAuthModal("signin");
                      onClose();
                    }}
                    className={cn(
                      "flex items-center gap-2.5 w-full px-3 py-2.5 rounded text-sm font-medium",
                      "text-foreground/70 hover:text-foreground hover:bg-secondary/50",
                      "transition-colors duration-100"
                    )}
                  >
                    <LogIn className="size-4 shrink-0" strokeWidth={2} aria-hidden />
                    <span>Sign In</span>
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => {
                      openAuthModal("signup");
                      onClose();
                    }}
                    className={cn(
                      "flex items-center gap-2.5 w-full px-3 py-2.5 rounded text-sm font-medium",
                      "text-foreground/70 hover:text-foreground hover:bg-secondary/50",
                      "transition-colors duration-100"
                    )}
                  >
                    <User className="size-4 shrink-0" strokeWidth={2} aria-hidden />
                    <span>Create Account</span>
                  </button>
                </li>
              </>
            )}
          </ul>
        </nav>

        <div className="px-4 py-4 border-t border-border shrink-0">
          <LogButton className="w-full justify-center h-10 text-sm" />
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Main NavBar
// ---------------------------------------------------------------------------

export function NavBar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    function handleScroll() {
      setScrolled(window.scrollY > 40);
    }
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      <header
        className={cn(
          "sticky top-0 z-30 w-full",
          "transition-all duration-200",
          scrolled
            ? "bg-nav/98 backdrop-blur-xl shadow-lg shadow-black/40 border-b border-border/60"
            : "bg-nav/80 backdrop-blur-md border-b border-border/30"
        )}
      >
        <div className="mx-auto max-w-screen-xl px-4 sm:px-6">
          <div className="flex h-12 items-center gap-3 md:gap-4">
            <Link to="/" className="group focus:outline-none shrink-0">
              <AftershowLogo size={30} />
            </Link>

            <DesktopNavLinks />

            <div className="flex-1" />

            <CollapsibleSearch />

            <NotificationBell />

            <button
              type="button"
              aria-label="Open navigation menu"
              aria-expanded={mobileOpen}
              aria-controls="mobile-drawer"
              onClick={() => setMobileOpen(true)}
              className={cn(
                "flex md:hidden items-center justify-center",
                "size-8 rounded-full text-muted-foreground hover:text-foreground",
                "transition-colors duration-150"
              )}
            >
              <Menu className="size-5" strokeWidth={2} aria-hidden />
            </button>

            <LogButton className="hidden sm:flex shrink-0" />

            <div className="hidden md:flex items-center">
              <UserArea />
            </div>
          </div>
        </div>
      </header>

      <MobileDrawer
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
      />
    </>
  );
}
