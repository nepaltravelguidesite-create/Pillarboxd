import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { Loader2, Lock, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(() => setReady(true));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      toast.success("Password updated successfully!");
      navigate("/", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update password");
    } finally {
      setLoading(false);
    }
  }

  if (!ready) {
    return (
      <AuthLayout title="Reset Password" subtitle="Verifying your reset link...">
      <div className="flex justify-center py-8">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    </AuthLayout>
  );
  }

  return (
    <AuthLayout title="Set New Password" subtitle="Enter a new password for your account.">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="space-y-1.5">
          <label htmlFor="reset-password" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            New Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              id="reset-password"
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
                "transition-colors"
              )}
              placeholder="At least 6 characters"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="reset-confirm" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Confirm Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              id="reset-confirm"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              required
              className={cn(
                "h-11 w-full rounded-md border border-input bg-background/40",
                "pl-10 pr-3 text-sm text-foreground",
                "placeholder:text-muted-foreground",
                "focus:outline-none focus:border-ring focus:ring-2 focus:ring-ring/40",
                "transition-colors"
              )}
              placeholder="Re-enter new password"
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
          {loading ? <Loader2 className="size-4 animate-spin" /> : "Update Password"}
        </button>
      </form>
      <p className="text-center text-sm text-muted-foreground pt-2">
        <Link to="/login" className="font-medium text-accent hover:underline">
          Back to Login
        </Link>
      </p>
    </AuthLayout>
  );
}
