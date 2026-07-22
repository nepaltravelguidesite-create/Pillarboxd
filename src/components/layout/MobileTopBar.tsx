import { Link } from "react-router-dom";
import { Menu, Search } from "lucide-react";
import { AftershowLogo } from "@/components/brand/AftershowLogo";
import { NotificationBell } from "@/components/layout/NotificationBell";

interface MobileTopBarProps {
  onMenuClick: () => void;
}

export function MobileTopBar({ onMenuClick }: MobileTopBarProps) {
  return (
    <header className="sticky top-0 z-30 bg-nav/95 backdrop-blur-md border-b border-border/40">
      <div className="flex items-center gap-2 h-14 px-3">
        {/* Hamburger */}
        <button
          onClick={onMenuClick}
          className="p-2 rounded-md text-foreground hover:bg-secondary/50 transition-colors"
          aria-label="Open menu"
        >
          <Menu className="size-5" />
        </button>

        {/* Logo */}
        <Link to="/" className="flex items-center">
          <AftershowLogo size={20} showWordmark={false} />
        </Link>

        {/* Right: search + notifications */}
        <div className="flex items-center gap-1 ml-auto">
          <Link
            to="/search"
            className="p-2 rounded-md text-foreground hover:bg-secondary/50 transition-colors"
            aria-label="Search"
          >
            <Search className="size-5" />
          </Link>
          <NotificationBell />
        </div>
      </div>
    </header>
  );
}
