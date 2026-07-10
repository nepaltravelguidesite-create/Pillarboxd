import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import { Loader2, X, Mail, Lock, User as UserIcon, AlertCircle } from "lucide-react";

type AuthMode = "signin" | "signup";

interface AuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialMode?: AuthMode;
}

// Google "G" logo as inline SVG
function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

export function AuthModal({
  open,
  onOpenChange,
  initialMode = "signin",
}: AuthModalProps) {
  const { signInWithGoogle, signInWithEmail, signUpWithEmail } = useAuth();
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync mode when modal opens
  useEffect(() => {
    if (open) {
      setMode(initialMode);
      setError(null);
      setEmail("");
      setPassword("");
      setUsername("");
    }
  }, [open, initialMode]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === "signin") {
        await signInWithEmail(email, password);
      } else {
        await signUpWithEmail(email, password, username);
      }
      onOpenChange(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Authentication failed";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setError(null);
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Google sign-in failed";
      setError(msg);
      setGoogleLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "max-w-[400px] p-0 gap-0 overflow-hidden",
          "bg-card border-border rounded-lg"
        )}
      >
        {/* Close button */}
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          aria-label="Close"
          className={cn(
            "absolute right-3 top-3 z-10",
            "flex items-center justify-center size-7 rounded",
            "text-muted-foreground hover:text-foreground",
            "transition-colors duration-150"
          )}
        >
          <X className="size-4" />
        </button>

        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-2 space-y-1.5 text-left">
          <DialogTitle className="text-lg font-bold text-foreground tracking-tight">
            {mode === "signin" ? "Sign in" : "Create your account"}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {mode === "signin"
              ? "Sign in to track, rate, and review your favorite shows."
              : "Join Pillarboxd to track every series you have ever watched."}
          </DialogDescription>
        </DialogHeader>

        {/* Body */}
        <div className="px-6 pb-6 pt-3 space-y-3">
          {/* Google button */}
          <button
            type="button"
            onClick={handleGoogle}
            disabled={googleLoading || loading}
            className={cn(
              "flex items-center justify-center gap-2.5 w-full",
              "h-10 rounded border border-border bg-background",
              "text-sm font-medium text-foreground",
              "hover:bg-secondary/50 transition-colors duration-150",
              "disabled:opacity-60 disabled:cursor-not-allowed"
            )}
          >
            {googleLoading ? (
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            ) : (
              <GoogleIcon className="size-4" />
            )}
            <span>{mode === "signin" ? "Sign in with Google" : "Sign up with Google"}</span>
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 py-1">
            <div className="h-px flex-1 bg-border" />
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
              or
            </span>
            <div className="h-px flex-1 bg-border" />
          </div>

          {/* Email/password form */}
          <form onSubmit={handleSubmit} className="space-y-2.5">
            {mode === "signup" && (
              <div className="space-y-1">
                <label htmlFor="auth-username" className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                  Username
                </label>
                <div className="relative">
                  <UserIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                  <input
                    id="auth-username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoComplete="username"
                    required
                    className={cn(
                      "h-9 w-full rounded border border-border bg-background/50",
                      "pl-8 pr-3 text-sm text-foreground",
                      "placeholder:text-muted-foreground",
                      "focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30",
                      "transition-colors"
                    )}
                    placeholder="yourname"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label htmlFor="auth-email" className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                <input
                  id="auth-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                  className={cn(
                    "h-9 w-full rounded border border-border bg-background/50",
                    "pl-8 pr-3 text-sm text-foreground",
                    "placeholder:text-muted-foreground",
                    "focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30",
                    "transition-colors"
                  )}
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label htmlFor="auth-password" className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                <input
                  id="auth-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                  required
                  minLength={6}
                  className={cn(
                    "h-9 w-full rounded border border-border bg-background/50",
                    "pl-8 pr-3 text-sm text-foreground",
                    "placeholder:text-muted-foreground",
                    "focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30",
                    "transition-colors"
                  )}
                  placeholder={mode === "signin" ? "Your password" : "At least 6 characters"}
                />
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2 rounded border border-destructive/30 bg-destructive/10 px-3 py-2">
                <AlertCircle className="size-3.5 text-destructive shrink-0 mt-0.5" />
                <p className="text-xs text-destructive">{error}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || googleLoading}
              className={cn(
                "flex items-center justify-center w-full h-9 rounded",
                "bg-primary text-primary-foreground font-bold text-xs uppercase tracking-widest",
                "hover:bg-primary/90 active:scale-[0.98]",
                "transition-all duration-150",
                "disabled:opacity-60 disabled:cursor-not-allowed"
              )}
            >
              {loading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : mode === "signin" ? (
                "Sign In"
              ) : (
                "Create Account"
              )}
            </button>
          </form>

          {/* Toggle mode */}
          <div className="flex items-center justify-center gap-1.5 pt-1">
            <span className="text-xs text-muted-foreground">
              {mode === "signin" ? "Need an account?" : "Already have one?"}
            </span>
            <button
              type="button"
              onClick={() => {
                setMode(mode === "signin" ? "signup" : "signin");
                setError(null);
              }}
              className="text-xs font-medium text-accent hover:underline transition-colors"
            >
              {mode === "signin" ? "Create one" : "Sign in"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
