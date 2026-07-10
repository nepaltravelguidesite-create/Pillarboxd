import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useNavigate } from "react-router-dom";
import { searchShows, type TVShow } from "@/lib/tmdb";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AppUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
}

interface AppContextValue {
  /** Currently authenticated user (null = guest) */
  user: AppUser | null;
  setUser: (user: AppUser | null) => void;

  /** Live search state */
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  searchResults: TVShow[];
  searchLoading: boolean;
  searchOpen: boolean;
  setSearchOpen: (open: boolean) => void;
  clearSearch: () => void;
  commitSearch: () => void;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const AppContext = createContext<AppContextValue | null>(null);

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

const DEBOUNCE_MS = 350;

export function AppProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();

  const [user, setUser] = useState<AppUser | null>(null);

  const [searchQuery, setSearchQueryRaw] = useState("");
  const [searchResults, setSearchResults] = useState<TVShow[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const setSearchQuery = useCallback((q: string) => {
    setSearchQueryRaw(q);
    setSearchOpen(q.trim().length > 0);

    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    if (q.trim().length === 0) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }

    setSearchLoading(true);

    debounceTimer.current = setTimeout(async () => {
      if (abortRef.current) abortRef.current.abort();
      abortRef.current = new AbortController();

      try {
        const data = await searchShows(q.trim());
        setSearchResults(data.results.slice(0, 8));
      } catch {
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, DEBOUNCE_MS);
  }, []);

  const clearSearch = useCallback(() => {
    setSearchQueryRaw("");
    setSearchResults([]);
    setSearchLoading(false);
    setSearchOpen(false);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
  }, []);

  const commitSearch = useCallback(() => {
    if (searchQuery.trim().length === 0) return;
    setSearchOpen(false);
    navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
  }, [searchQuery, navigate]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  return (
    <AppContext.Provider
      value={{
        user,
        setUser,
        searchQuery,
        setSearchQuery,
        searchResults,
        searchLoading,
        searchOpen,
        setSearchOpen,
        clearSearch,
        commitSearch,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}
