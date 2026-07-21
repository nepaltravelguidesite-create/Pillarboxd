import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { Loader2 } from "lucide-react";

const WELCOME_KEY = "aftershow:welcome-seen";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { authState } = useAuth();
  const location = useLocation();
  const isMobile = useIsMobile();

  if (authState === "loading") {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (authState === "unauthenticated") {
    if (isMobile && !localStorage.getItem(WELCOME_KEY)) {
      return <Navigate to="/welcome" replace state={{ from: location.pathname }} />;
    }
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}
