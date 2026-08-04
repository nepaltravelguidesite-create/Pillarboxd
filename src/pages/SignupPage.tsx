import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { AftershowLogo } from "@/components/brand/AftershowLogo";
import { AuthCollage } from "@/components/auth/AuthCollage";
import { cn } from "@/lib/utils";
import { useTrendingShows } from "@/hooks/use-tmdb";
import {
  Loader2,
  Mail,
  Lock,
  User as UserIcon,
  AlertCircle,
} from "lucide-react";

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

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function SignupPage() {
  const { signUpWithEmail, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? "/";

  const { data: trending } = useTrendingShows("week");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  function validate(): string | null {
    if (!username.trim()) return "Username is required";
    if (!EMAIL_RE.test(email)) return "Please enter a valid email address";
    if (password.length < 6) return "Password must be at least 6 characters";
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (honeypot) {
      setLoading(false);
      return;
    }

    const vErr = validate();
    if (vErr) {
      setValidationError(vErr);
      return;
    }
    setValidationError(null);

    setLoading(true);
    try {
      await signUpWithEmail(email, password, username);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign up failed");
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
      setError(err instanceof Error ? err.message : "Google sign-up failed");
      setGoogleLoading(false);
    }
  }

  return (
    <>
      {/* === Mobile layout (below md) - unchanged === */}
      <div className="flex min-h-svh flex-col bg-background md:hidden">
        <AuthCollage shows={trending?.results ?? []} />
        <div className="flex-1 flex flex-col items-center px-6 pt-6 pb-8 -mt-8 relative z-10">
          <div className="w-full max-w-sm space-y-5">
            <div className="flex justify-center">
              <AftershowLogo size={32} />
            </div>
            <div className="text-center space-y-1">
              <h1 className="font-display text-xl font-bold text-foreground tracking-tight">
                Sign Up
              </h1>
              <p className="text-sm text-muted-foreground">
                Create an account to continue.
              </p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="hidden" aria-hidden="true">
                <label htmlFor="hp-website">Website (leave empty)</label>
                <input
                  id="hp-website"
                  type="text"
                  name="website"
                  tabIndex={-1}
                  autoComplete="off"
                  value={honeypot}
                  onChange={(e) => setHoneypot(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <label
                  htmlFor="signup-username"
                  className="text-xs font-medium text-muted-foreground uppercase tracking-wide"
                >
                  Username
                </label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <input
                    id="signup-username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoComplete="username"
                    required
                    className={cn(
                      "h-11 w-full rounded-md border border-input bg-background/40",
                      "pl-10 pr-3 text-sm text-foreground",
                      "placeholder:text-muted-foreground",
                      "focus:outline-none focus:border-ring focus:ring-2 focus:ring-ring/40",
                      "transition-colors",
                    )}
                    placeholder="yourname"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label
                  htmlFor="signup-email"
                  className="text-xs font-medium text-muted-foreground uppercase tracking-wide"
                >
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <input
                    id="signup-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    required
                    className={cn(
                      "h-11 w-full rounded-md border border-input bg-background/40",
                      "pl-10 pr-3 text-sm text-foreground",
                      "placeholder:text-muted-foreground",
                      "focus:outline-none focus:border-ring focus:ring-2 focus:ring-ring/40",
                      "transition-colors",
                    )}
                    placeholder="you@example.com"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label
                  htmlFor="signup-password"
                  className="text-xs font-medium text-muted-foreground uppercase tracking-wide"
                >
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <input
                    id="signup-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    required
                    className={cn(
                      "h-11 w-full rounded-md border border-input bg-background/40",
                      "pl-10 pr-3 text-sm text-foreground",
                      "placeholder:text-muted-foreground",
                      "focus:outline-none focus:border-ring focus:ring-2 focus:ring-ring/40",
                      "transition-colors",
                    )}
                    placeholder="At least 6 characters"
                  />
                </div>
              </div>
              {(validationError || error) && (
                <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2">
                  <AlertCircle className="size-4 text-destructive shrink-0 mt-0.5" />
                  <p className="text-xs text-destructive">
                    {validationError ?? error}
                  </p>
                </div>
              )}
              <button
                type="submit"
                disabled={loading || googleLoading}
                className={cn(
                  "flex items-center justify-center w-full h-11 rounded-md",
                  "bg-primary text-primary-foreground font-semibold text-sm",
                  "hover:-translate-y-px hover:bg-primary/90 hover:shadow-md hover:shadow-primary/25",
                  "active:translate-y-0 active:scale-[0.98]",
                  "transition-all duration-150",
                  "disabled:opacity-60 disabled:cursor-not-allowed",
                )}
              >
                {loading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  "Create Account"
                )}
              </button>
            </form>
            <div className="flex items-center gap-3 py-1">
              <div className="h-px flex-1 bg-border" />
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
                or
              </span>
              <div className="h-px flex-1 bg-border" />
            </div>
            <button
              type="button"
              onClick={handleGoogle}
              disabled={googleLoading || loading}
              className={cn(
                "flex items-center justify-center gap-2.5 w-full h-11 rounded-md",
                "border border-border bg-card hover:bg-secondary/50",
                "text-sm font-medium text-foreground",
                "transition-all duration-150 hover:-translate-y-px active:translate-y-0",
                "disabled:opacity-60 disabled:cursor-not-allowed",
              )}
            >
              {googleLoading ? (
                <Loader2 className="size-4 animate-spin text-muted-foreground" />
              ) : (
                <GoogleIcon className="size-4" />
              )}
              <span>Sign up with Google</span>
            </button>
            <p className="text-center text-sm text-muted-foreground pt-2">
              Already have an account?{" "}
              <Link
                to="/login"
                className="font-medium text-accent hover:underline"
              >
                Login
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* === Desktop layout (md and above) - two-column split === */}
      <div className="hidden md:flex min-h-svh bg-background">
        {/* Left: poster collage column (~55%) */}
        <div className="w-[55%] h-svh">
          <AuthCollage shows={trending?.results ?? []} variant="desktop" />
        </div>

        {/* Right: form column, vertically centered, left-aligned text */}
        <div className="flex-1 h-svh flex items-center justify-center px-8 lg:px-12">
          <div className="w-full max-w-[420px] space-y-5">
            <div>
              <AftershowLogo size={32} />
            </div>
            <div className="space-y-1">
              <h1 className="font-display text-2xl font-bold text-foreground tracking-tight">
                Sign Up
              </h1>
              <p className="text-sm text-muted-foreground">
                Create an account to continue.
              </p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="hidden" aria-hidden="true">
                <label htmlFor="hp-website-desktop">
                  Website (leave empty)
                </label>
                <input
                  id="hp-website-desktop"
                  type="text"
                  name="website"
                  tabIndex={-1}
                  autoComplete="off"
                  value={honeypot}
                  onChange={(e) => setHoneypot(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <label
                  htmlFor="signup-username-desktop"
                  className="text-xs font-medium text-muted-foreground uppercase tracking-wide"
                >
                  Username
                </label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <input
                    id="signup-username-desktop"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoComplete="username"
                    required
                    className={cn(
                      "h-11 w-full rounded-md border border-input bg-background/40",
                      "pl-10 pr-3 text-sm text-foreground",
                      "placeholder:text-muted-foreground",
                      "focus:outline-none focus:border-ring focus:ring-2 focus:ring-ring/40",
                      "transition-colors",
                    )}
                    placeholder="yourname"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label
                  htmlFor="signup-email-desktop"
                  className="text-xs font-medium text-muted-foreground uppercase tracking-wide"
                >
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <input
                    id="signup-email-desktop"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    required
                    className={cn(
                      "h-11 w-full rounded-md border border-input bg-background/40",
                      "pl-10 pr-3 text-sm text-foreground",
                      "placeholder:text-muted-foreground",
                      "focus:outline-none focus:border-ring focus:ring-2 focus:ring-ring/40",
                      "transition-colors",
                    )}
                    placeholder="you@example.com"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label
                  htmlFor="signup-password-desktop"
                  className="text-xs font-medium text-muted-foreground uppercase tracking-wide"
                >
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <input
                    id="signup-password-desktop"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    required
                    className={cn(
                      "h-11 w-full rounded-md border border-input bg-background/40",
                      "pl-10 pr-3 text-sm text-foreground",
                      "placeholder:text-muted-foreground",
                      "focus:outline-none focus:border-ring focus:ring-2 focus:ring-ring/40",
                      "transition-colors",
                    )}
                    placeholder="At least 6 characters"
                  />
                </div>
              </div>
              {(validationError || error) && (
                <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2">
                  <AlertCircle className="size-4 text-destructive shrink-0 mt-0.5" />
                  <p className="text-xs text-destructive">
                    {validationError ?? error}
                  </p>
                </div>
              )}
              <button
                type="submit"
                disabled={loading || googleLoading}
                className={cn(
                  "flex items-center justify-center w-full h-11 rounded-md",
                  "bg-primary text-primary-foreground font-semibold text-sm",
                  "hover:-translate-y-px hover:bg-primary/90 hover:shadow-md hover:shadow-primary/25",
                  "active:translate-y-0 active:scale-[0.98]",
                  "transition-all duration-150",
                  "disabled:opacity-60 disabled:cursor-not-allowed",
                )}
              >
                {loading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  "Create Account"
                )}
              </button>
            </form>
            <div className="flex items-center gap-3 py-1">
              <div className="h-px flex-1 bg-border" />
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
                or
              </span>
              <div className="h-px flex-1 bg-border" />
            </div>
            <button
              type="button"
              onClick={handleGoogle}
              disabled={googleLoading || loading}
              className={cn(
                "flex items-center justify-center gap-2.5 w-full h-11 rounded-md",
                "border border-border bg-card hover:bg-secondary/50",
                "text-sm font-medium text-foreground",
                "transition-all duration-150 hover:-translate-y-px active:translate-y-0",
                "disabled:opacity-60 disabled:cursor-not-allowed",
              )}
            >
              {googleLoading ? (
                <Loader2 className="size-4 animate-spin text-muted-foreground" />
              ) : (
                <GoogleIcon className="size-4" />
              )}
              <span>Sign up with Google</span>
            </button>
            <p className="text-sm text-muted-foreground pt-2">
              Already have an account?{" "}
              <Link
                to="/login"
                className="font-medium text-accent hover:underline"
              >
                Login
              </Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
