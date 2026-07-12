import { useSearchParams } from "react-router-dom";
import { useSearchShows } from "@/hooks/use-tmdb";
import { ShowPosterCard } from "@/components/shows/ShowPosterCard";
import { Loader2, SearchX, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/ui/EmptyState";

export function SearchResultsPage() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get("q") ?? "";
  const { data, loading, error } = useSearchShows(query);

  const shows = data?.results ?? [];
  const totalResults = data?.total_results ?? 0;

  return (
    <div className="w-full max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Search header */}
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
          {query ? (
            <>
              Results for{" "}
              <span className="text-primary">"{query}"</span>
            </>
          ) : (
            "Search Shows"
          )}
        </h1>
        {data && (
          <p className="text-xs text-muted-foreground mt-1">
            {totalResults} {totalResults === 1 ? "show" : "shows"} found
          </p>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <SearchX className="size-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            Something went wrong. {error}
          </p>
        </div>
      )}

      {/* No query */}
      {!query && !loading && (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <SearchX className="size-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            Enter a search term in the search bar above.
          </p>
        </div>
      )}

      {/* No results */}
      {query && !loading && !error && shows.length === 0 && (
        <EmptyState
          icon={Search}
          title="No shows found"
          description="Try a different title, or browse our catalog instead."
          action={{ label: "Browse Shows", to: "/shows" }}
        />
      )}

      {/* Results grid */}
      {shows.length > 0 && !loading && (
        <div
          className={cn(
            "grid gap-4 sm:gap-5",
            "grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7"
          )}
        >
          {shows.map((show) => (
            <ShowPosterCard
              key={show.id}
              show={show}
              size="md"
              showRating={false}
            />
          ))}
        </div>
      )}
    </div>
  );
}
