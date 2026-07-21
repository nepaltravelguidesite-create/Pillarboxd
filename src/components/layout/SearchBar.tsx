import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Search, X, Loader2, Tv } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { bestPosterUrl } from "@/lib/tmdb";
import { cn } from "@/lib/utils";

export function SearchBar({ className }: { className?: string }) {
  const {
    searchQuery,
    setSearchQuery,
    searchResults,
    searchLoading,
    searchOpen,
    setSearchOpen,
    clearSearch,
    commitSearch,
  } = useApp();

  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setSearchOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [setSearchOpen]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      commitSearch();
      inputRef.current?.blur();
    }
    if (e.key === "Escape") {
      clearSearch();
      inputRef.current?.blur();
    }
  }

  function handleResultClick(id: number) {
    clearSearch();
    navigate(`/show/${id}`);
  }

  const year = (dateStr: string | undefined) =>
    dateStr ? dateStr.slice(0, 4) : "";

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {/* Input */}
      <div className="relative flex items-center">
        <Search
          className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none"
          aria-hidden
        />
        <input
          ref={inputRef}
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (searchQuery.trim().length > 0) setSearchOpen(true);
          }}
          placeholder="Search shows..."
          aria-label="Search shows"
          autoComplete="off"
          spellCheck={false}
          className={cn(
            "h-8 w-full min-w-0 rounded border border-border bg-muted/50",
            "pl-8 pr-8 text-sm text-foreground",
            "placeholder:text-muted-foreground",
            "focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/40",
            "transition-colors duration-150"
          )}
        />
        {searchLoading ? (
          <Loader2
            className="absolute right-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground animate-spin"
            aria-hidden
          />
        ) : searchQuery.length > 0 ? (
          <button
            type="button"
            onClick={clearSearch}
            aria-label="Clear search"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="size-3.5" aria-hidden />
          </button>
        ) : null}
      </div>

      {/* Dropdown */}
      {searchOpen && searchQuery.trim().length > 0 && (
        <div
          className={cn(
            "absolute top-full left-0 right-0 z-50 mt-1",
            "rounded border border-border bg-card shadow-lg",
            "overflow-hidden"
          )}
        >
          {searchResults.length === 0 && !searchLoading ? (
            <div className="flex items-center gap-2 px-3 py-3 text-sm text-muted-foreground">
              <Tv className="size-4 shrink-0" aria-hidden />
              <span>No shows found for "{searchQuery}"</span>
            </div>
          ) : (
            <ul role="listbox" aria-label="Search results">
              {searchResults.map((show) => (
                <li key={show.id} role="option" aria-selected={false}>
                  <button
                    type="button"
                    onClick={() => handleResultClick(show.id)}
                    className={cn(
                      "flex w-full items-center gap-3 px-3 py-2",
                      "hover:bg-secondary/60 transition-colors duration-100",
                      "text-left"
                    )}
                  >
                    {/* Micro poster */}
                    <div className="shrink-0 w-8 aspect-poster rounded overflow-hidden bg-muted">
                      {show.poster_path ? (
                        <img
                          src={bestPosterUrl(show, "w92")}
                          alt=""
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Tv className="size-3 text-muted-foreground" />
                        </div>
                      )}
                    </div>

                    {/* Title + year */}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate leading-tight">
                        {show.name}
                      </p>
                      {show.first_air_date && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {year(show.first_air_date)}
                        </p>
                      )}
                    </div>

                    {/* Rating */}
                    {show.vote_average > 0 && (
                      <span className="shrink-0 text-xs text-primary font-medium">
                        {show.vote_average.toFixed(1)}
                      </span>
                    )}
                  </button>
                </li>
              ))}

              {/* View all link */}
              <li role="option" aria-selected={false}>
                <button
                  type="button"
                  onClick={() => {
                    commitSearch();
                    inputRef.current?.blur();
                  }}
                  className={cn(
                    "w-full px-3 py-2 text-xs text-accent",
                    "hover:bg-secondary/60 transition-colors duration-100",
                    "text-center border-t border-border mt-0"
                  )}
                >
                  See all results for "{searchQuery}"
                </button>
              </li>
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
