import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { searchShows, bestPosterUrl, type TVShow } from "@/lib/tmdb";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tv, X, ArrowUp, ArrowDown, Search, Loader2 } from "lucide-react";
import type { FavoriteShow } from "@/context/SocialContext";

const MAX_FAVORITES = 4;

interface EditFavoritesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  currentFavorites: FavoriteShow[];
  onSaved: (favorites: FavoriteShow[]) => void;
}

export function EditFavoritesModal({
  open,
  onOpenChange,
  userId,
  currentFavorites,
  onSaved,
}: EditFavoritesModalProps) {
  const [favorites, setFavorites] = useState<FavoriteShow[]>(currentFavorites);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<TVShow[]>([]);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setFavorites(currentFavorites);
  }, [currentFavorites, open]);

  // Debounced search
  useEffect(() => {
    if (!query.trim() || query.trim().length < 2) {
      setResults([]);
      return;
    }
    let cancelled = false;
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const data = await searchShows(query.trim());
        if (!cancelled) setResults(data.results.slice(0, 12));
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query]);

  const addShow = useCallback((show: TVShow) => {
    setFavorites((prev) => {
      if (prev.some((f) => f.tmdb_id === show.id)) return prev;
      if (prev.length >= MAX_FAVORITES) return prev;
      return [
        ...prev,
        {
          tmdb_id: show.id,
          name: show.name,
          poster_path: show.poster_path,
        },
      ];
    });
  }, []);

  const removeShow = useCallback((tmdbId: number) => {
    setFavorites((prev) => prev.filter((f) => f.tmdb_id !== tmdbId));
  }, []);

  const moveUp = useCallback((index: number) => {
    if (index === 0) return;
    setFavorites((prev) => {
      const next = [...prev];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return next;
    });
  }, []);

  const moveDown = useCallback((index: number) => {
    setFavorites((prev) => {
      if (index >= prev.length - 1) return prev;
      const next = [...prev];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      return next;
    });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ favorite_shows: favorites })
      .eq("id", userId);
    setSaving(false);
    if (error) {
      console.error("[EditFavorites] save error:", error);
      return;
    }
    onSaved(favorites);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Favorite Shows</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current favorites - ordered, with reorder/remove controls */}
          <div className="space-y-2">
            {favorites.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">
                No favorites selected yet. Search below to add up to{" "}
                {MAX_FAVORITES}.
              </p>
            ) : (
              favorites.map((fav, idx) => (
                <div
                  key={fav.tmdb_id}
                  className="flex items-center gap-2 rounded-md border border-border/50 bg-card p-2"
                >
                  <div className="h-14 w-10 shrink-0 overflow-hidden rounded bg-muted">
                    {fav.poster_path ? (
                      <img
                        src={bestPosterUrl(
                          { id: fav.tmdb_id, poster_path: fav.poster_path },
                          "w92",
                        )}
                        alt={fav.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <Tv className="size-4 text-muted-foreground/40" />
                      </div>
                    )}
                  </div>
                  <span className="flex-1 truncate text-sm font-medium text-foreground">
                    {fav.name}
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-7"
                      onClick={() => moveUp(idx)}
                      disabled={idx === 0}
                    >
                      <ArrowUp className="size-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-7"
                      onClick={() => moveDown(idx)}
                      disabled={idx === favorites.length - 1}
                    >
                      <ArrowDown className="size-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-7"
                      onClick={() => removeShow(fav.tmdb_id)}
                    >
                      <X className="size-3.5" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Search input */}
          {favorites.length < MAX_FAVORITES && (
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search shows to add..."
                  className="pl-9"
                />
                {searching && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 size-4 animate-spin text-muted-foreground" />
                )}
              </div>

              {/* Search results */}
              {results.length > 0 && (
                <ScrollArea className="h-48 rounded-md border border-border/50">
                  <div className="p-1.5 space-y-1">
                    {results.map((show) => {
                      const alreadyAdded = favorites.some(
                        (f) => f.tmdb_id === show.id,
                      );
                      return (
                        <button
                          key={show.id}
                          onClick={() => addShow(show)}
                          disabled={alreadyAdded}
                          className="flex w-full items-center gap-2 rounded p-1.5 text-left hover:bg-secondary/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                          <div className="h-12 w-8 shrink-0 overflow-hidden rounded bg-muted">
                            {show.poster_path ? (
                              <img
                                src={bestPosterUrl(show, "w92")}
                                alt={show.name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full items-center justify-center">
                                <Tv className="size-3 text-muted-foreground/40" />
                              </div>
                            )}
                          </div>
                          <span className="flex-1 truncate text-xs font-medium text-foreground">
                            {show.name}
                          </span>
                          {alreadyAdded && (
                            <span className="text-[10px] text-muted-foreground">
                              Added
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
