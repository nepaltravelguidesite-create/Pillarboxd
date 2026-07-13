import { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { useSocial, type ShowList, type ListItem } from "@/context/SocialContext";
import { useAuth } from "@/context/AuthContext";
import { type TVShow } from "@/lib/tmdb";
import { cn } from "@/lib/utils";
import { SEOMeta } from "@/components/SEOMeta";
import { ShowPosterCard } from "@/components/shows/ShowPosterCard";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Loader2, Trash2, List, Lock, Globe, Heart } from "lucide-react";
import { useUI } from "@/context/UIContext";

// ---------------------------------------------------------------------------
// ListDetailPage — /lists/:listId route
// ---------------------------------------------------------------------------

export default function ListDetailPage() {
  const { listId } = useParams<{ listId: string }>();
  const { user } = useAuth();
  const { myLists, getListItems, removeShowFromList, deleteList, isListLiked, toggleListLike } = useSocial();
  const { openAuthModal } = useUI();

  const [list, setList] = useState<ShowList | null>(null);
  const [items, setItems] = useState<ListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<number | null>(null);

  // -------------------------------------------------------------------------
  // Fetch list metadata + items
  // -------------------------------------------------------------------------

  const load = useCallback(async () => {
    if (!listId) {
      setError("No list specified.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // First, try to find the list in the user's own lists (fast path)
      let meta = myLists.find((l) => l.id === listId) ?? null;

      // Fetch items regardless of ownership (RLS handles visibility)
      const fetchedItems = await getListItems(listId);
      setItems(fetchedItems);

      // If we don't have metadata locally, infer from items or mark not found.
      // The items query is RLS-gated: if the list is private and not owned by the
      // user, the query returns [] — so we treat empty + no local meta as
      // "not found or not accessible".
      if (!meta) {
        if (fetchedItems.length === 0) {
          setError("This list doesn't exist or is private.");
          setList(null);
          setLoading(false);
          return;
        }
        // Build a minimal metadata stub from items (public list not owned by user)
        meta = {
          id: listId,
          user_id: "",
          title: "Shared List",
          description: null,
          is_public: true,
          like_count: 0,
          item_count: fetchedItems.length,
          created_at: "",
          updated_at: "",
        };
      }

      setList(meta);
    } catch {
      setError("Something went wrong loading this list.");
    } finally {
      setLoading(false);
    }
  }, [listId, myLists, getListItems]);

  useEffect(() => {
    load();
  }, [load]);

  // -------------------------------------------------------------------------
  // Derived
  // -------------------------------------------------------------------------

  const isOwner = !!(user && list && list.user_id === user.id);

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------

  async function handleRemove(showId: number) {
    if (!listId) return;
    setRemovingId(showId);
    await removeShowFromList(listId, showId);
    setItems((prev) => prev.filter((i) => i.show_id !== showId));
    setList((prev) =>
      prev
        ? {
            ...prev,
            item_count: Math.max(prev.item_count - 1, 0),
          }
        : prev
    );
    setRemovingId(null);
  }

  function handleDeleteList() {
    if (!listId || !list) return;
    deleteList(listId);
    // Navigate home via Link-less redirect — use window location
    window.location.href = "/lists";
  }

  // -------------------------------------------------------------------------
  // Convert ListItem → TVShow for ShowPosterCard
  // -------------------------------------------------------------------------

  function itemToShow(item: ListItem): TVShow {
    return {
      id: item.show_id,
      name: item.show_name,
      original_name: item.show_name,
      overview: "",
      poster_path: item.show_poster_path,
      backdrop_path: null,
      first_air_date: item.show_first_air_date ?? "",
      vote_average: 0,
      vote_count: 0,
      popularity: 0,
      genre_ids: [],
      origin_country: [],
      original_language: "",
    };
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  // Loading
  if (loading) {
    return (
      <Shell>
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
          <Loader2 className="size-8 animate-spin mb-3" />
          <p className="text-sm">Loading list…</p>
        </div>
      </Shell>
    );
  }

  // Error / not found / private
  if (error || !list) {
    return (
      <Shell>
        <div className="flex flex-col items-center justify-center py-24 text-center text-muted-foreground">
          <List className="size-12 mb-4 stroke-[1.25]" />
          <p className="text-base font-medium text-foreground">
            {error ?? "List not found"}
          </p>
          <p className="text-sm mt-1 max-w-sm">
            This list may have been deleted, or it's private and you don't have
            access.
          </p>
          <Button asChild variant="outline" className="mt-6">
            <Link to="/lists">Back to My Lists</Link>
          </Button>
        </div>
      </Shell>
    );
  }

  // -------------------------------------------------------------------------
  // Loaded
  // -------------------------------------------------------------------------

  return (
    <Shell>
      <SEOMeta
        title={list?.title || "List"}
        description={list?.description || "A custom show list on Aftershow"}
      />
      {/* Header */}
      <header className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex flex-col gap-2 min-w-0 flex-1">
            {/* Visibility badge */}
            <span
              className={cn(
                "inline-flex items-center gap-1 self-start rounded-full px-2.5 py-0.5 text-[11px] font-medium",
                list.is_public
                  ? "bg-primary/10 text-primary"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {list.is_public ? (
                <Globe className="size-3" />
              ) : (
                <Lock className="size-3" />
              )}
              {list.is_public ? "Public" : "Private"}
            </span>

            <h1 className="font-display text-3xl sm:text-4xl font-bold text-foreground break-words">
              {list.title}
            </h1>

            {list.description ? (
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed max-w-2xl">
                {list.description}
              </p>
            ) : (
              isOwner && (
                <p className="text-sm text-muted-foreground/60 italic">
                  No description — add one to help others discover this list.
                </p>
              )
            )}

            {/* Stats + Like button */}
            <div className="flex items-center gap-4 pt-1 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <List className="size-3.5" />
                {list.item_count} {list.item_count === 1 ? "show" : "shows"}
              </span>
              {!isOwner && (
                <button
                  type="button"
                  onClick={() => {
                    if (!user) { openAuthModal("signin"); return; }
                    toggleListLike(list.id);
                  }}
                  className={cn(
                    "inline-flex items-center gap-1 transition-colors",
                    isListLiked(list.id) ? "text-primary" : "hover:text-foreground"
                  )}
                  aria-label={isListLiked(list.id) ? "Unlike list" : "Like list"}
                >
                  <Heart className={cn("size-3.5", isListLiked(list.id) && "fill-primary")} />
                  {list.like_count} {list.like_count === 1 ? "like" : "likes"}
                </button>
              )}
              {isOwner && (
                <span className="inline-flex items-center gap-1">
                  <Heart className="size-3.5" />
                  {list.like_count} {list.like_count === 1 ? "like" : "likes"}
                </span>
              )}
            </div>
          </div>

          {/* Owner controls */}
          {isOwner && (
            <div className="flex items-center gap-2 shrink-0">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Trash2 className="size-4" />
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete list?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete this list and all its items.
                      This cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      variant="destructive"
                      onClick={handleDeleteList}
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </div>
      </header>

      {/* Items */}
      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center text-muted-foreground">
          <List className="size-12 mb-4 stroke-[1.25]" />
          <p className="text-base font-medium text-foreground">
            No shows in this list yet
          </p>
          <p className="text-sm mt-1 max-w-sm">
            {isOwner
              ? "Add shows to this list from any show page."
              : "Check back later for updates."}
          </p>
          {isOwner && (
            <Button asChild className="mt-6">
              <Link to="/browse">Browse shows</Link>
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-4 gap-y-6 sm:gap-x-5 sm:gap-y-8">
          {items.map((item) => (
            <div key={item.id} className="flex flex-col gap-2">
              <ShowPosterCard show={itemToShow(item)} size="md" />

              {/* Personal note */}
              {item.note && (
                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3 px-0.5">
                  {item.note}
                </p>
              )}

              {/* Remove button (owner only) */}
              {isOwner && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button
                      type="button"
                      disabled={removingId === item.show_id}
                      className={cn(
                        "inline-flex items-center justify-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium",
                        "text-muted-foreground hover:bg-destructive/10 hover:text-destructive",
                        "transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      )}
                    >
                      {removingId === item.show_id ? (
                        <>
                          <Loader2 className="size-3.5 animate-spin" />
                          Removing…
                        </>
                      ) : (
                        <>
                          <Trash2 className="size-3.5" />
                          Remove
                        </>
                      )}
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Remove show?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Remove this show from the list?
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleRemove(item.show_id)}>
                        Remove
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          ))}
        </div>
      )}
    </Shell>
  );
}

// ---------------------------------------------------------------------------
// Shell — shared layout wrapper
// ---------------------------------------------------------------------------

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {children}
      </div>
    </div>
  );
}
