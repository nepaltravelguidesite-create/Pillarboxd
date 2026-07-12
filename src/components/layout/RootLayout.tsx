import { Outlet, ScrollRestoration } from "react-router-dom";
import { NavBar } from "@/components/layout/NavBar";
import { Footer } from "@/components/layout/Footer";
import { AuthModal } from "@/components/auth/AuthModal";
import { useUI } from "@/context/UIContext";

export function RootLayout() {
  const { authModalOpen, authModalMode, closeAuthModal } = useUI();

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <a href="#main-content" className="skip-link">Skip to content</a>
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
    </div>
  );
}
