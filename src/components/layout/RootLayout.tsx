import { useState } from "react";
import { Outlet, ScrollRestoration, useLocation } from "react-router-dom";
import { NavBar } from "@/components/layout/NavBar";
import { Footer } from "@/components/layout/Footer";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { SlideOutMenu } from "@/components/layout/SlideOutMenu";
import { MobileTopBar } from "@/components/layout/MobileTopBar";
import { AuthModal } from "@/components/auth/AuthModal";
import { Toaster } from "@/components/ui/sonner";
import { useUI } from "@/context/UIContext";

export function RootLayout() {
  const { authModalOpen, authModalMode, closeAuthModal } = useUI();
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <a href="#main-content" className="skip-link">Skip to content</a>

      {/* Desktop nav (md+) */}
      <div className="hidden md:block">
        <NavBar />
      </div>

      {/* Mobile top bar (below md) */}
      <div className="md:hidden">
        <MobileTopBar onMenuClick={() => setMenuOpen(true)} />
      </div>

      {/* Slide-out menu */}
      <SlideOutMenu open={menuOpen} onClose={() => setMenuOpen(false)} />

      <main
        id="main-content"
        className="flex-1 flex flex-col w-full pb-14 md:pb-0 pb-page-enter"
        key={location.key}
      >
        <Outlet />
      </main>

      {/* Desktop footer */}
      <div className="hidden md:block">
        <Footer />
      </div>

      {/* Mobile bottom nav */}
      <div className="md:hidden">
        <MobileBottomNav />
      </div>

      <AuthModal
        open={authModalOpen}
        onOpenChange={closeAuthModal}
        initialMode={authModalMode}
      />

      <ScrollRestoration />
      <Toaster />
    </div>
  );
}
