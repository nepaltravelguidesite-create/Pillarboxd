import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  bio?: string;
  twitterUrl?: string;
  instagramUrl?: string;
  websiteUrl?: string;
}

type AuthState = "loading" | "authenticated" | "unauthenticated";

interface AuthContextValue {
  user: AuthUser | null;
  session: Session | null;
  authState: AuthState;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, username: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type ProfileRow = {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  twitter_url: string | null;
  instagram_url: string | null;
  website_url: string | null;
};

async function fetchProfile(userId: string): Promise<AuthUser | null> {
  const { data } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, bio, twitter_url, instagram_url, website_url")
    .eq("id", userId)
    .maybeSingle();

  if (data) {
    const p = data as ProfileRow;
    return {
      id: p.id,
      email: "",
      username: p.username,
      displayName: p.display_name,
      avatarUrl: p.avatar_url ?? undefined,
      bio: p.bio ?? undefined,
      twitterUrl: p.twitter_url ?? undefined,
      instagramUrl: p.instagram_url ?? undefined,
      websiteUrl: p.website_url ?? undefined,
    };
  }
  return null;
}

function fallbackFromMeta(user: User): AuthUser {
  const meta = user.user_metadata ?? {};
  return {
    id: user.id,
    email: user.email ?? "",
    username: meta.username ?? meta.preferred_username ?? (user.email ?? "user").split("@")[0],
    displayName: meta.full_name ?? meta.name ?? meta.username ?? (user.email ?? "user").split("@")[0],
    avatarUrl: meta.avatar_url ?? meta.picture ?? undefined,
  };
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [authState, setAuthState] = useState<AuthState>("loading");
  const [user, setUser] = useState<AuthUser | null>(null);

  async function loadUser(newSession: Session | null) {
    if (!newSession?.user) {
      setUser(null);
      setAuthState("unauthenticated");
      return;
    }

    const profile = await fetchProfile(newSession.user.id);
    if (profile) {
      setUser({ ...profile, email: newSession.user.email ?? "" });
    } else {
      const fallback = fallbackFromMeta(newSession.user);
      setUser(fallback);
    }
    setAuthState("authenticated");
  }

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      (async () => {
        await loadUser(data.session);
      })();
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      (async () => {
        await loadUser(newSession);
      })();
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!session?.user) return;
    const profile = await fetchProfile(session.user.id);
    if (profile) {
      setUser({ ...profile, email: session.user.email ?? "" });
    }
  }, [session]);

  const signInWithGoogle = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    if (error) throw error;
  }, []);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }, []);

  const signUpWithEmail = useCallback(
    async (email: string, password: string, username: string) => {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { username } },
      });
      if (error) throw error;
    },
    []
  );

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        authState,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
