import { useState, useEffect } from "react";
import { NavLink, Link, useLocation } from "react-router-dom";
import { Menu, X, Plus, User, LogIn, LogOut } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useUI } from "@/context/UIContext";
import { SearchBar } from "@/components/layout/SearchBar";
import { PillarboxdLogo } from "@/components/brand/PillarboxdLogo";
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
              "px-3 py-1.5 text-xs font-semibold uppercase tracking-widest rounded",
              "transition-colors duration-150",
              isActive
                ? "text-brand-amber"
                : "text-foreground/60 hover:text-foreground"
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
        "h-8 px-3 rounded",
        "bg-primary text-background font-bold text-xs uppercase tracking-widest",
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
            "h-8 px-2.5 rounded border border-border",
            "text-xs font-medium text-foreground/80 hover:text-foreground",
            "hover:border-brand-amber/50 transition-colors duration-150"
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
        <button
          type="button"
          onClick={() => signOut()}
          aria-label="Sign out"
          className={cn(
            "flex items-center justify-center size-8 rounded",
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
          "h-8 px-3 flex items-center gap-1.5",
          "text-xs font-semibold uppercase tracking-widest rounded",
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
          "h-8 px-3 flex items-center",
          "text-xs font-semibold uppercase tracking-widest rounded",
          "border border-border text-foreground/70 hover:text-foreground hover:border-foreground/40",
          "transition-colors duration-150"
        )}
      >
        <span>Create account</span>
      </button>
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
          "fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw]",
          "flex flex-col bg-card border-r border-border",
          "transition-transform duration-300 ease-out",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
          <Link to="/" onClick={onClose}>
            <PillarboxdLogo size={22} />
          </Link>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="p-1.5 rounded text-muted-foreground hover:text-foreground transition-colors"
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
                      "flex items-center px-3 py-2.5 rounded text-sm font-medium",
                      "transition-colors duration-100",
                      isActive
                        ? "bg-primary/10 text-brand-amber"
                        : "text-foreground/70 hover:text-foreground hover:bg-secondary/50"
                    )
                  }
                >
                  {label}
                </NavLink>
              </li>
            ))}

            <li className="my-2 px-3">
              <div className="h-px bg-border" />
            </li>

            {user ? (
              <>
                <li>
                  <NavLink
                    to="/profile"
                    className={({ isActive }) =>
                      cn(
                        "flex items-center gap-2.5 px-3 py-2.5 rounded text-sm font-medium",
                        "transition-colors duration-100",
                        isActive
                          ? "bg-primary/10 text-brand-amber"
                          : "text-foreground/70 hover:text-foreground hover:bg-secondary/50"
                      )
                    }
                  >
                    <User className="size-4 shrink-0" strokeWidth={2} aria-hidden />
                    <span>Profile</span>
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
                      "flex items-center gap-2.5 w-full px-3 py-2.5 rounded text-sm font-medium",
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
      setScrolled(window.scrollY > 4);
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
            ? "bg-background/95 backdrop-blur-sm shadow-md shadow-black/30 border-b border-border/50"
            : "bg-background border-b border-border/40"
        )}
      >
        <div className="mx-auto max-w-screen-xl px-4 sm:px-6">
          <div className="flex h-12 items-center gap-3 md:gap-4">
            <button
              type="button"
              aria-label="Open navigation menu"
              aria-expanded={mobileOpen}
              aria-controls="mobile-drawer"
              onClick={() => setMobileOpen(true)}
              className={cn(
                "flex md:hidden items-center justify-center",
                "size-8 rounded text-muted-foreground hover:text-foreground",
                "transition-colors duration-150"
              )}
            >
              <Menu className="size-5" strokeWidth={2} aria-hidden />
            </button>

            <Link to="/" className="group focus:outline-none shrink-0">
              <PillarboxdLogo size={24} />
            </Link>

            <DesktopNavLinks />

            <div className="flex-1" />

            <div className="hidden sm:block w-48 md:w-56 lg:w-72 xl:w-80 shrink-0">
              <SearchBar />
            </div>

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
