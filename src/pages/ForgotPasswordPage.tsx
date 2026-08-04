import { useState } from "react";
import { Link } from "react-router-dom";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { Loader2, Mail, AlertCircle, CheckCircle2 } from "lucide-react";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email,
        { redirectTo: `${window.location.origin}/reset-password` }
      );
      if (resetError) throw resetError;
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send reset email");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout title="Reset Password" subtitle="We'll email you a secure link to set a new password.">
      {sent ? (
        <div className="space-y-4">
          <div className="flex items-start gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2">
            <CheckCircle2 className="size-4 text-emerald-500 shrink-0 mt-0.5" />
            <p className="text-xs text-emerald-600 dark:text-emerald-400">
              If an account exists for that email, we've sent a reset link. Check your inbox and follow the link to set a new password.
            </p>
          </div>
          <Link
            to="/login"
            className="block text-center text-sm text-muted-foreground hover:text-accent transition-colors"
          >
            Back to Login
          </Link>
        </div>
      ) : (
        <>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1.5">
              <label htmlFor="forgot-email" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <input
                  id="forgot-email"
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
                    "transition-colors"
                  )}
                  placeholder="you@example.com"
                />
              </div>
            </div>
            {error && (
              <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2">
                <AlertCircle className="size-4 text-destructive shrink-0 mt-0.5" />
                <p className="text-xs text-destructive">{error}</p>
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className={cn(
                "flex items-center justify-center w-full h-11 rounded-md",
                "bg-primary text-primary-foreground font-semibold text-sm",
                "hover:-translate-y-px hover:bg-primary/90 hover:shadow-md hover:shadow-primary/25",
                "active:translate-y-0 active:scale-[0.98]",
                "transition-all duration-150",
                "disabled:opacity-60 disabled:cursor-not-allowed"
              )}
            >
              {loading ? <Loader2 className="size-4 animate-spin" /> : "Send Reset Link"}
            </button>
          </form>
          <p className="text-center text-sm text-muted-foreground pt-2">
            Remembered your password?{" "}
            <Link to="/login" className="font-medium text-accent hover:underline">
              Login
            </Link>
          </p>
        </>
      )}
    </AuthLayout>
  );
}
