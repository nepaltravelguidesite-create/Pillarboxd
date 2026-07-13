import { Outlet, ScrollRestoration } from "react-router-dom";
import { NavBar } from "@/components/layout/NavBar";
import { Footer } from "@/components/layout/Footer";
import { AuthModal } from "@/components/auth/AuthModal";
import { Toaster } from "@/components/ui/sonner";
import { useUI } from "@/context/UIContext";
import { useAuth } from "@/context/AuthContext";
import { AftershowLogoAnimated } from "@/components/brand/AftershowLogoAnimated";

export function RootLayout() {
  const { authModalOpen, authModalMode, closeAuthModal } = useUI();
  const { authState } = useAuth();

  const showSplash = authState === "loading";

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <a href="#main-content" className="skip-link">Skip to content</a>

      {showSplash && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background">
          <AftershowLogoAnimated size={48} loop={false} />
        </div>
      )}

      <NavBar />

      <main id="main-content" className="flex-1 flex flex-col w-full">
        <Outlet />
      </main>

      <Footer />

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
