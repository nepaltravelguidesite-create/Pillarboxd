import { useState } from "react";
import { Link } from "react-router-dom";
import { useSocial, type ShowList } from "@/context/SocialContext";
import { useAuth } from "@/context/AuthContext";
import { useUI } from "@/context/UIContext";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { List, Plus, Trash2, Globe, Lock, Heart, Loader2 } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";

// ---------------------------------------------------------------------------
// ListsPage — /lists route
// ---------------------------------------------------------------------------

export default function ListsPage() {
  const { user } = useAuth();
  const { openAuthModal } = useUI();
  const { myLists, loadingLists, createList, deleteList, savedListsData, unsaveList } = useSocial();

  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // -------------------------------------------------------------------------
  // Auth gate
  // -------------------------------------------------------------------------

  if (!user) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
          <header className="mb-8">
            <h1 className="font-display text-3xl sm:text-4xl font-bold text-foreground">
              My Lists
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Curate collections of shows you love and share them with the community.
            </p>
          </header>

          <div className="flex flex-col items-center justify-center py-24 text-center">
            <List className="size-12 mb-4 stroke-[1.25] text-muted-foreground" />
            <p className="text-base font-medium text-foreground">
              Sign in to create and manage your lists
            </p>
            <p className="text-sm mt-1 text-muted-foreground max-w-sm">
              Build collections of your favorite shows, keep track of what you want to
              watch, and share recommendations with others.
            </p>
            <Button
              className="mt-6"
              onClick={() => openAuthModal("signin")}
            >
              Sign in
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Create list submit
  // -------------------------------------------------------------------------

  async function handleCreate() {
    const trimmed = title.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    const created = await createList(trimmed, description.trim(), isPublic);
    setSubmitting(false);
    if (created) {
      setTitle("");
      setDescription("");
      setIsPublic(false);
      setCreateOpen(false);
    }
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="min-h-screen bg-background text-foreground pb-page-enter">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Heading + Create button */}
        <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="font-display text-3xl sm:text-4xl font-bold text-foreground">
              My Lists
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Curate collections of shows you love and share them with the community.
            </p>
          </div>

          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="size-4" />
                Create List
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="font-display">
                  Create a new list
                </DialogTitle>
                <DialogDescription>
                  Group your favorite shows into a collection you can revisit and share.
                </DialogDescription>
              </DialogHeader>

              <div className="flex flex-col gap-4">
                {/* Title */}
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="list-title"
                    className="text-sm font-medium text-foreground"
                  >
                    Title
                  </label>
                  <Input
                    id="list-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Best sci-fi of the decade"
                    maxLength={100}
                    autoFocus
                  />
                </div>

                {/* Description */}
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="list-description"
                    className="text-sm font-medium text-foreground"
                  >
                    Description{" "}
                    <span className="text-muted-foreground font-normal">
                      (optional)
                    </span>
                  </label>
                  <Textarea
                    id="list-description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="What is this list about?"
                    maxLength={500}
                    rows={3}
                  />
                </div>

                {/* Public toggle */}
                <button
                  type="button"
                  onClick={() => setIsPublic((p) => !p)}
                  className={cn(
                    "flex items-center justify-between gap-3 rounded-lg border px-4 py-3 text-left transition-colors",
                    isPublic
                      ? "border-primary bg-primary/5"
                      : "border-border bg-secondary/20 hover:bg-secondary/30"
                  )}
                >
                  <span className="flex items-center gap-3">
                    {isPublic ? (
                      <Globe className="size-4 text-primary" />
                    ) : (
                      <Lock className="size-4 text-muted-foreground" />
                    )}
                    <span className="flex flex-col">
                      <span className="text-sm font-medium text-foreground">
                        {isPublic ? "Public" : "Private"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {isPublic
                          ? "Anyone can find and view this list"
                          : "Only you can see this list"}
                      </span>
                    </span>
                  </span>
                  <span
                    className={cn(
                      "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors",
                      isPublic ? "bg-primary" : "bg-muted-foreground/30"
                    )}
                  >
                    <span
                      className={cn(
                        "inline-block size-4 transform rounded-full bg-background shadow transition-transform",
                        isPublic ? "translate-x-4" : "translate-x-0.5"
                      )}
                    />
                  </span>
                </button>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setCreateOpen(false)}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreate}
                  disabled={!title.trim() || submitting}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Creating…
                    </>
                  ) : (
                    "Create List"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </header>

        {/* Content */}
        {loadingLists ? (
          <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
            <Loader2 className="size-8 animate-spin mb-3" />
            <p className="text-sm">Loading your lists…</p>
          </div>
        ) : myLists.length === 0 && savedListsData.length === 0 ? (
          <EmptyState
            icon={List}
            title="No lists yet"
            description="Create your first list or save an Aftershow editorial collection to get started."
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {myLists.map((list) => (
              <ListCard
                key={list.id}
                list={list}
                onDelete={() => {
                  if (
                    window.confirm(
                      `Delete "${list.title}"? This cannot be undone.`
                    )
                  ) {
                    deleteList(list.id);
                  }
                }}
              />
            ))}
            {savedListsData.map((list) => (
              <ListCard
                key={list.id}
                list={list}
                isSaved
                onUnsave={() => unsaveList(list.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ListCard
// ---------------------------------------------------------------------------

interface ListCardProps {
  list: ShowList;
  onDelete?: () => void;
  isSaved?: boolean;
  onUnsave?: () => void;
}

function ListCard({ list, onDelete, isSaved, onUnsave }: ListCardProps) {
  const { user } = useAuth();
  const { openAuthModal } = useUI();
  const { isListLiked, toggleListLike } = useSocial();
  return (
    <div className={cn(
      "group relative flex flex-col rounded-xl border bg-secondary/20 hover:border-primary/50 hover:bg-secondary/30 transition-colors overflow-hidden",
      isSaved ? "border-primary/30" : "border-border"
    )}>
      {/* Top accent strip */}
      <div className={cn("h-1.5", isSaved ? "bg-gradient-to-r from-primary/40 to-primary/10" : "bg-gradient-to-r from-primary/60 to-primary/20")} />

      {/* Body */}
      <div className="flex flex-col gap-3 p-4 sm:p-5 flex-1">
        {/* Visibility + saved/editorial badges + action */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
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
            {isSaved && (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2 py-0.5 text-[11px] font-medium">
                Saved
              </span>
            )}
            {list.is_editorial && !isSaved && (
              <span className="inline-flex items-center gap-1 rounded-full bg-accent/10 text-accent px-2 py-0.5 text-[11px] font-medium">
                Curated by Aftershow
              </span>
            )}
          </div>

          {/* Delete (owned) or Unsave (saved) */}
          {isSaved ? (
            <button
              type="button"
              onClick={onUnsave}
              aria-label="Remove from saved"
              className={cn(
                "flex items-center justify-center size-7 rounded-md text-muted-foreground/60",
                "hover:bg-destructive/10 hover:text-destructive transition-colors",
                "opacity-0 group-hover:opacity-100 focus:opacity-100 focus:outline-none"
              )}
            >
              <Trash2 className="size-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onDelete}
              aria-label="Delete list"
              className={cn(
                "flex items-center justify-center size-7 rounded-md text-muted-foreground/60",
                "hover:bg-destructive/10 hover:text-destructive transition-colors",
                "opacity-0 group-hover:opacity-100 focus:opacity-100 focus:outline-none"
              )}
            >
              <Trash2 className="size-4" />
            </button>
          )}
        </div>

        {/* Title + description (link) */}
        <Link to={`/lists/${list.id}`} className="flex flex-col gap-1.5 flex-1">
          <h3 className="font-display text-lg font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-snug">
            {list.title}
          </h3>
          {list.description ? (
            <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
              {list.description}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground/60 italic">
              No description
            </p>
          )}
        </Link>

        {/* Stats footer */}
        <div className="flex items-center gap-4 pt-2 border-t border-border/60 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <List className="size-3.5" />
            {list.item_count} {list.item_count === 1 ? "show" : "shows"}
          </span>
          {!isSaved && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
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
        </div>
      </div>
    </div>
  );
}
